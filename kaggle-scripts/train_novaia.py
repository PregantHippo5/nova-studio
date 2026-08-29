"""
train_novaia.py
================

Fine-tuning LoRA de NovaIA sur Qwen2.5-3B-Instruct
Compatible Windows + RTX 3060 Ti 8Go
Compatible Kaggle / Tesla T4

Sans Unsloth / Sans Triton.

========================================================================
REMOTE TRAINING (Nova Studio)
========================================================================

Ce script est désormais autonome : toute la logique d'upload Hugging
Face (checkpoints intermédiaires + LoRA final) qui vivait auparavant
dans un script séparé qui "patchait" ce fichier à la volée sur Kaggle
est maintenant intégrée directement ici. Il n'y a plus de patch runtime.

Deux modes d'utilisation, tous les deux supportés simultanément :

1. CLI manuel (comportement historique, inchangé) :

   python train_novaia.py \
     --data /kaggle/input/.../novaia_qa_5000_v3.jsonl \
     --out /kaggle/working/novaia_lora \
     --epochs 3 \
     --resume \
     --hf-repo novastudio123/novaia-checkpoints

2. Remote Training (Nova Studio / Kaggle launcher) :

   Le launcher injecte une variable globale NOVAIA_TRAINING_CONFIG
   (chaîne JSON) en tête de ce fichier avant de le pousser sur Kaggle
   (cf. lib/kaggle/client.ts, injectTrainingConfig). Si cette variable
   est présente, ses valeurs prennent le pas sur les arguments CLI pour
   les paramètres qu'elle définit. Le script reste exécutable sans
   aucun argument CLI dans ce cas.
"""

import os

# Désactive tout ce qui peut tenter de compiler
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Réduit la fragmentation mémoire CUDA
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

import argparse
import json
from pathlib import Path

import torch

from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    TrainerCallback,
)

from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
)

from trl import SFTTrainer, SFTConfig

from huggingface_hub import HfApi, snapshot_download


SYSTEM_PROMPT = (
    "Vous êtes NovaIA, un assistant polyvalent. "
    "Votre ton est clair, précis, poli et légèrement pince-sans-rire."
)


# ========================================================================
# UPLOAD HUGGING FACE — CHECKPOINTS INTERMÉDIAIRES
# ========================================================================

class HuggingFaceCheckpointCallback(TrainerCallback):

    def __init__(self, repo_id):
        self.repo_id = repo_id
        self.api = HfApi()

    def on_save(self, args, state, control, **kwargs):

        checkpoint_dir = os.path.join(
            args.output_dir,
            f"checkpoint-{state.global_step}"
        )

        if not os.path.isdir(checkpoint_dir):
            print(f"[HF] Checkpoint introuvable : {checkpoint_dir}")
            return control

        print()
        print("========================================")
        print("UPLOAD CHECKPOINT HUGGING FACE")
        print("========================================")
        print(f"Step : {state.global_step}")
        print(f"Repo : {self.repo_id}")
        print()

        try:
            self.api.upload_folder(
                folder_path=checkpoint_dir,
                path_in_repo=f"checkpoint-{state.global_step}",
                repo_id=self.repo_id,
                repo_type="model",
                commit_message=f"NovaIA checkpoint step {state.global_step}",
            )

            print(
                f"[HF] OK : checkpoint-{state.global_step} envoyé."
            )

        except Exception as e:
            print("[HF] ERREUR upload :", e)

        return control


# ========================================================================
# UPLOAD HUGGING FACE — LORA FINAL
# ========================================================================

def upload_final_lora(local_dir, repo_id, path_in_repo):
    """
    Envoie UNIQUEMENT les fichiers du LoRA final vers
    {repo_id}/{path_in_repo}/, en excluant explicitement les
    sous-dossiers checkpoint-* qui peuvent encore traîner dans
    local_dir (save_total_limit en conserve jusqu'à 3 localement).
    """

    print()
    print("========================================")
    print("UPLOAD LORA FINAL")
    print("========================================")
    print("Source :", local_dir)
    print("Repo   :", repo_id)
    print("Chemin :", path_in_repo)
    print()

    api = HfApi()

    api.upload_folder(
        folder_path=str(local_dir),
        path_in_repo=path_in_repo,
        repo_id=repo_id,
        repo_type="model",
        commit_message="NovaIA - mise à jour du LoRA final",
        ignore_patterns=["checkpoint-*/**", "checkpoint-*"],
    )

    print("✅ LoRA final envoyé (checkpoints intermédiaires exclus).")
    print(f"📦 {repo_id}/{path_in_repo}/")
    print()


# ========================================================================
# RESUME DEPUIS HUGGING FACE
# ========================================================================

def download_checkpoint_from_hub(repo_id, checkpoint_name, local_root):
    """
    Télécharge un checkpoint Trainer COMPLET depuis Hugging Face.
    """

    local_root = Path(local_root)
    local_root.mkdir(parents=True, exist_ok=True)

    print()
    print("========================================")
    print("TÉLÉCHARGEMENT CHECKPOINT HUGGING FACE")
    print("========================================")
    print("Repo       :", repo_id)
    print("Checkpoint :", checkpoint_name)
    print()

    snapshot_download(
        repo_id=repo_id,
        repo_type="model",
        allow_patterns=[f"{checkpoint_name}/*"],
        local_dir=str(local_root),
    )

    checkpoint_dir = local_root / checkpoint_name

    if not checkpoint_dir.exists():
        raise FileNotFoundError(
            f"❌ Le téléchargement n'a produit aucun dossier {checkpoint_dir}. "
            f"Vérifie que '{checkpoint_name}' existe bien dans {repo_id}."
        )

    validate_trainer_checkpoint(checkpoint_dir)

    print("✅ Checkpoint téléchargé et validé :", checkpoint_dir)
    print()

    return checkpoint_dir


def validate_trainer_checkpoint(checkpoint_dir):
    """
    Vérifie que le dossier contient réellement ce que
    Trainer.train(resume_from_checkpoint=...) attend.
    """

    checkpoint_dir = Path(checkpoint_dir)

    required = ["trainer_state.json"]
    missing_required = [
        f for f in required if not (checkpoint_dir / f).exists()
    ]

    if missing_required:
        raise RuntimeError(
            f"❌ Checkpoint incomplet dans {checkpoint_dir} : "
            f"fichier(s) manquant(s) {missing_required}. "
            "Ce n'est pas un checkpoint Trainer valide pour un resume."
        )

    weight_candidates = [
        "adapter_model.safetensors",
        "adapter_model.bin",
        "pytorch_model.bin",
        "model.safetensors",
    ]

    if not any((checkpoint_dir / f).exists() for f in weight_candidates):
        raise RuntimeError(
            f"❌ Checkpoint incomplet dans {checkpoint_dir} : "
            f"aucun fichier de poids reconnu parmi {weight_candidates}."
        )

    for optional in ["optimizer.pt", "scheduler.pt"]:
        if not (checkpoint_dir / optional).exists():
            print(
                f"⚠️ {optional} absent de {checkpoint_dir} — "
                "l'état de l'optimiseur/scheduler ne sera pas restauré "
                "à l'identique."
            )


# ========================================================================
# CONFIGURATION DISTANTE (Remote Training)
# ========================================================================

def load_remote_config():
    """
    Si le launcher Kaggle (Nova Studio) a injecté NOVAIA_TRAINING_CONFIG
    en tête de ce fichier, on la charge ici. Sinon (mode CLI classique),
    on renvoie None et rien ne change par rapport au comportement
    historique.
    """

    raw = globals().get("NOVAIA_TRAINING_CONFIG")

    if raw is None:
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            "❌ NOVAIA_TRAINING_CONFIG présent mais invalide (JSON cassé)."
        ) from e


def resolve_dataset_path(data_arg, remote_dataset_name):
    """
    --data explicite (CLI) est toujours prioritaire. Sinon, si la config
    distante fournit un nom de dataset, on le résout par recherche sous
    /kaggle/input.
    """

    if data_arg:
        return Path(data_arg)

    if not remote_dataset_name:
        raise ValueError(
            "❌ Aucun dataset fourni : ni --data, ni 'dataset' dans "
            "NOVAIA_TRAINING_CONFIG."
        )

    matches = sorted(Path("/kaggle/input").rglob(remote_dataset_name))

    if not matches:
        raise FileNotFoundError(
            f"❌ Dataset introuvable sous /kaggle/input : {remote_dataset_name}"
        )

    return matches[0]


def load_jsonl(path):
    data = []

    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if line:
                data.append(json.loads(line))

    return data


def format_chat(example, tokenizer):

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        },
        {
            "role": "user",
            "content": example["instruction"] + "\n\n" + example["input"]
        },
        {
            "role": "assistant",
            "content": example["output"]
        }
    ]

    return tokenizer.apply_chat_template(
        messages,
        tokenize=False
    )


def find_latest_checkpoint(output_dir):

    output_dir = Path(output_dir)

    if not output_dir.exists():
        return None

    checkpoints = []

    for path in output_dir.glob("checkpoint-*"):

        if not path.is_dir():
            continue

        try:
            step = int(path.name.split("-")[-1])
            checkpoints.append((step, path))
        except ValueError:
            pass

    if not checkpoints:
        return None

    checkpoints.sort(
        key=lambda x: x[0],
        reverse=True
    )

    return checkpoints[0][1]


def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--data",
        required=False,
        default=None,
        help=(
            "Chemin direct vers le fichier JSONL. Optionnel si "
            "NOVAIA_TRAINING_CONFIG fournit 'dataset'."
        )
    )

    parser.add_argument(
        "--model",
        default="Qwen/Qwen2.5-3B-Instruct"
    )

    parser.add_argument(
        "--out",
        default="./novaia_lora"
    )

    parser.add_argument(
        "--epochs",
        type=int,
        default=3
    )

    parser.add_argument(
        "--resume",
        action="store_true",
        help="Reprendre l'entraînement (checkpoint local le plus récent "
             "par défaut, ou --resume-checkpoint si fourni)."
    )

    parser.add_argument(
        "--resume-checkpoint",
        default=None,
        help="Nom du checkpoint HF à reprendre, ex: checkpoint-1500. "
             "Nécessite --hf-repo. Prioritaire sur la recherche locale."
    )

    parser.add_argument(
        "--hf-repo",
        default=None,
        help="Repository Hugging Face où envoyer les checkpoints "
             "intermédiaires (ex: novastudio123/novaia-checkpoints)."
    )

    parser.add_argument(
        "--checkpoint-interval",
        type=int,
        default=250,
        help="Nombre de steps entre deux sauvegardes de checkpoint "
             "(250 = comportement réel des entraînements Kaggle actuels)."
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=1
    )

    parser.add_argument(
        "--gradient-accumulation",
        type=int,
        default=8
    )

    parser.add_argument(
        "--learning-rate",
        type=float,
        default=1e-4
    )

    parser.add_argument(
        "--lora-repo",
        default=None,
        help="Si fourni, envoie le LoRA final vers ce repo HF à la fin "
             "du training (opt-in, aucun envoi automatique sinon)."
    )

    parser.add_argument(
        "--lora-path",
        default="nova-lora",
        help="Chemin fixe dans le repo HF pour le LoRA final."
    )

    args = parser.parse_args()

    remote_config = load_remote_config()

    if remote_config is not None:
        epochs = remote_config["epochs"]
        batch_size = remote_config.get("batch_size", args.batch_size)
        gradient_accumulation = remote_config.get(
            "gradient_accumulation", args.gradient_accumulation
        )
        learning_rate = remote_config.get("learning_rate", args.learning_rate)
        checkpoint_interval = remote_config.get(
            "checkpoint_interval", args.checkpoint_interval
        )
        resume_requested = bool(remote_config.get("resume", False))
        resume_checkpoint_name = remote_config.get("resume_checkpoint")
        hf_repo = remote_config.get("lora_repo")
        lora_repo = remote_config.get("lora_repo")
        lora_path = remote_config.get("lora_path", "nova-lora")
        dataset_name = remote_config.get("dataset")
    else:
        epochs = args.epochs
        batch_size = args.batch_size
        gradient_accumulation = args.gradient_accumulation
        learning_rate = args.learning_rate
        checkpoint_interval = args.checkpoint_interval
        resume_requested = args.resume
        resume_checkpoint_name = args.resume_checkpoint
        hf_repo = args.hf_repo
        lora_repo = args.lora_repo
        lora_path = args.lora_path
        dataset_name = None

    data_path = resolve_dataset_path(args.data, dataset_name)

    print("========================================")
    print("        NOVAIA TRAINING")
    print("========================================")
    print()
    print("Mode           :", "REMOTE (Nova Studio)" if remote_config else "CLI")
    print("Dataset        :", data_path)
    print("Epochs         :", epochs)
    print("Batch size     :", batch_size)
    print("Grad accum     :", gradient_accumulation)
    print("Learning rate  :", learning_rate)
    print("Checkpoint /   :", checkpoint_interval, "steps")
    print("Resume         :", resume_requested)
    print("Resume ckpt    :", resume_checkpoint_name or "(dernier local)")
    print("HF repo ckpts  :", hf_repo or "(désactivé)")
    print("HF LoRA final  :", f"{lora_repo}/{lora_path}" if lora_repo else "(désactivé)")

    print()
    print("Chargement tokenizer...")


    tokenizer = AutoTokenizer.from_pretrained(
        args.model,
        trust_remote_code=True
    )


    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token


    print("Chargement modèle 4 bits...")


    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )


    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16,
        trust_remote_code=True
    )


    model.config.use_cache = False


    print("Préparation LoRA...")


    model = prepare_model_for_kbit_training(
        model
    )


    lora_config = LoraConfig(

        r=16,

        lora_alpha=32,

        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj"
        ],

        lora_dropout=0.05,

        bias="none",

        task_type="CAUSAL_LM"
    )


    model = get_peft_model(
        model,
        lora_config
    )


    model.print_trainable_parameters()


    print()
    print("Chargement dataset...")


    raw = load_jsonl(
        data_path
    )


    print(
        len(raw),
        "exemples chargés"
    )


    texts = []


    for item in raw:

        texts.append(
            format_chat(
                item,
                tokenizer
            )
        )


    dataset = Dataset.from_dict(
        {
            "text": texts
        }
    )


    print()
    print("Préparation configuration training...")


    import inspect

    sft_config_params = inspect.signature(
        SFTConfig.__init__
    ).parameters


    config_kwargs = dict(

        output_dir=args.out,

        num_train_epochs=epochs,

        per_device_train_batch_size=batch_size,

        gradient_accumulation_steps=gradient_accumulation,

        learning_rate=learning_rate,

        fp16=True,

        logging_steps=5,

        save_strategy="steps",

        save_steps=checkpoint_interval,

        save_total_limit=3,

        optim="adamw_torch",

        report_to="none",
    )


    if "dataset_text_field" in sft_config_params:

        config_kwargs["dataset_text_field"] = "text"


    if "max_seq_length" in sft_config_params:

        config_kwargs["max_seq_length"] = 768

    elif "max_length" in sft_config_params:

        config_kwargs["max_length"] = 768


    callbacks = []

    if hf_repo:
        callbacks.append(
            HuggingFaceCheckpointCallback(
                hf_repo
            )
        )


    trainer = SFTTrainer(

        model=model,

        train_dataset=dataset,

        processing_class=tokenizer,

        args=SFTConfig(**config_kwargs),

        callbacks=callbacks,
    )


    # ========================================
    # REPRISE CHECKPOINT
    # ========================================

    checkpoint = None

    if resume_requested and resume_checkpoint_name:

        if not hf_repo:
            raise ValueError(
                "❌ resume_checkpoint fourni mais aucun repo HF "
                "(--hf-repo / lora_repo) pour aller le chercher."
            )

        checkpoint = download_checkpoint_from_hub(
            repo_id=hf_repo,
            checkpoint_name=resume_checkpoint_name,
            local_root=Path(args.out),
        )

    elif resume_requested:

        checkpoint = find_latest_checkpoint(
            args.out
        )


    if checkpoint is not None:

        print()
        print("========================================")
        print("CHECKPOINT TROUVÉ")
        print("========================================")
        print(
            "Reprise depuis :",
            checkpoint
        )
        print()


        trainer.train(
            resume_from_checkpoint=str(checkpoint)
        )

    else:

        if resume_requested:

            print()
            print("Aucun checkpoint trouvé.")
            print("Démarrage d'un nouvel entraînement.")
            print()

        else:

            print()
            print("Nouvel entraînement.")
            print()


        trainer.train()


    # ========================================
    # SAUVEGARDE FINALE (locale)
    # ========================================

    print()
    print("========================================")
    print("Sauvegarde finale...")
    print("========================================")


    out = Path(args.out)

    out.mkdir(
        exist_ok=True,
        parents=True
    )


    model.save_pretrained(
        out
    )


    tokenizer.save_pretrained(
        out
    )


    print()
    print("========================================")
    print("        ENTRAÎNEMENT TERMINÉ")
    print("========================================")
    print()
    print(
        "LoRA disponible dans:",
        out
    )
    print()


    # ========================================
    # UPLOAD LORA FINAL (opt-in, remplace nova-lora/)
    # ========================================

    if lora_repo:
        upload_final_lora(
            local_dir=out,
            repo_id=lora_repo,
            path_in_repo=lora_path,
        )


if __name__ == "__main__":
    main()