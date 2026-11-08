"""
train_novaia_v2.py
==================

NovaIA v2 : QLoRA sur Qwen3-8B (le MEME modele que NovaIA en ligne), sur Kaggle / Tesla T4.
Ce script est lance par le meme lanceur que train_novaia.py (config injectee en tete du fichier :
NOVAIA_TRAINING_CONFIG). Il ne remplace pas l'ancien script (Qwen2.5-3B), qui reste inchange.

Ce qu'il fait, dans l'ordre :
  1. Distillation de raisonnement (STaR) : Qwen3-8B (sans LoRA, mode reflexion) resout des problemes dont la
     reponse est CALCULEE par le script ; on ne garde que les raisonnements qui aboutissent a la bonne reponse.
     (budget de temps limite, voir DISTILL_BUDGET_S)
  2. Entrainement LoRA (r=16, perte uniquement sur les reponses de l'assistant) sur :
       - perso_train.jsonl            identite, ton, empathie, "Je ne sais pas" (fichier du dataset Kaggle)
       - logique_distille.jsonl       (optionnel) reflexions distillees sur le PC
       - dialogues a plusieurs tours  MEMOIRE DE CONVERSATION, generes ici, reponses verifiables
       - raisonnements de l'etape 1
  3. Examen inedit questions_v3.jsonl + mini-test de memoire, base vs LoRA, et depot des scores sur Hugging Face.

Format de conversation (a reproduire a l'identique cote Space pour la memoire) :
  messages = [ user: RULES_NORAG + "\\n\\nQuestion : " + q1,  assistant: a1,  user: q2,  assistant: a2, ... ]
  (les consignes ne sont que dans le PREMIER message ; les suivants sont la question brute)

Sorties : /kaggle/working/lora_v2 et, sur Hugging Face, {lora_repo}/v2-qwen3/ (adaptateur + resultats.json).
Ne touche jamais a nova-lora/ ni aux checkpoint-* de l'ancien entrainement.

Limites connues (non testees avant le 1er lancement) : la T4 n'a pas le bfloat16, on calcule en float16 ; si Qwen3
deborde en float16 la perte devient NaN, le script s'arrete alors avec un message clair.
"""

import os

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

import subprocess
import sys

_PINNED_PACKAGES = [
    "transformers==4.57.1",
    "peft==0.17.1",
    "accelerate==1.10.1",
    "bitsandbytes==0.48.1",
    "huggingface_hub==0.35.3",
]

if not os.environ.get("NOVAIA_NO_INSTALL"):
    print("Installation des dependances figees...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--no-cache-dir", *_PINNED_PACKAGES], check=True)
    print("OK.\n")

import argparse
import json
import math
import random
import re
import time
import unicodedata
from pathlib import Path

# ------------------------------------------------------------------ constantes

MODEL = "Qwen/Qwen3-8B"
HF_PATH = "v2-qwen3"                 # dossier du depot HF ou va l'adaptateur (jamais nova-lora/)
OUT_DIR = Path("/kaggle/working/lora_v2")
MAX_LEN = 1280                       # longueur max d'un exemple (tokens)
DISTILL_BUDGET_S = 35 * 60           # temps max de l'etape 1
DISTILL_QUESTIONS = 260
DISTILL_BATCH = 8
DISTILL_MAX_NEW = 1000
TRAIN_BUDGET_S = int(6.0 * 3600)     # on s'arrete proprement apres 6 h d'entrainement (session Kaggle = 12 h max)
THINK_TOKENS = 1400                  # comme le Space
SHORT_TOKENS = 220

COMMON = (
    "Tu es NovaIA, un assistant fiable. Réponds en français.\n"
    "Règles :\n"
    "- Question de fait : réponds en une phrase courte.\n"
    "- Calcul, logique ou raisonnement : résous-le toi-même, étape par étape, puis donne la réponse finale. "
    "Pour ces questions, ne réponds jamais « Je ne sais pas ».\n"
    "- N'invente jamais."
)
RULES_NORAG = (
    COMMON + "\n"
    "- Pour une question de fait, si tu n'es pas certain de la réponse, réponds exactement : « Je ne sais pas. »"
)
IDK = "Je ne sais pas."

# anciens en-tetes "perso" (pour remapper logique_distille.jsonl, comme 12_entrainer_lora.py)
PERSO_HEADER_V2 = (
    "Tu es NovaIA, l'assistant personnel de ton créateur, dans l'esprit de Jarvis : efficace, calme, "
    "légèrement pince-sans-rire, loyal et précis. Tu tutoies. Réponses courtes et directes, une pointe "
    "d'humour sec quand ça s'y prête (jamais lourd). Tu anticipes la suite utile et la proposes en une phrase. "
    "Tu ne flattes pas : tu signales franchement les erreurs et les risques. Tu n'as pas encore d'accès à "
    "l'ordinateur de ton créateur. Réponds en français."
)
PERSO_HEADER = (
    "Tu es NovaIA, l'assistant personnel de ton créateur, dans l'esprit de Jarvis : efficace, calme, "
    "légèrement pince-sans-rire, loyal et précis. Tu tutoies. Réponses courtes et directes, une pointe "
    "d'humour sec quand ça s'y prête (jamais lourd). Tu donnes des conseils concrets et constructifs, tu "
    "anticipes la suite utile et la proposes en une phrase. Tu ne flattes pas : tu signales franchement les "
    "erreurs et les risques. Tu n'as pas encore accès à l'ordinateur de l'utilisateur. Réponds en français."
)


def first_prompt(q):
    return f"{RULES_NORAG}\n\nQuestion : {q}"


# ------------------------------------------------------------------ evaluation (meme logique que 04_evaluer.py)

REFUSALS = ["je ne sais pas", "ne sais pas", "pas d'information", "aucune information", "ne trouve pas",
            "je ne peux pas", "impossible de", "n'ai pas acces", "ne dispose pas", "ne figure pas",
            "pas mentionne", "ne contiennent pas", "ne contient pas", "pas possible de"]


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("’", "'").replace(" ", " ").replace(" ", " ")
    s = s.replace("-", " ")
    return re.sub(r"\s+", " ", s).strip()


def strip_tex(s):
    s = s.replace("\\text", "").replace("\\mathrm", "")
    s = re.sub(r"[\\${}_^]", "", s)
    return s.translate(str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789"))


def has_keyword(text, keywords):
    t = norm(strip_tex(text))
    for kw in keywords:
        k = norm(kw)
        if re.search(rf"(?<![a-z0-9]){re.escape(k)}(?:s|e|es|te|tes|x)?(?![a-z0-9])", t):
            return True
    return False


def starts_with_refusal(text):
    t = norm(text)[:60]
    return any(norm(r) in t for r in REFUSALS)


# routeur par mots-cles (copie de routeur.py, pour reproduire le routage du Space)
_MOTS = [
    "calcul", "calcule", "resous", "equation", "probabilite", "perimetre", "aire", "volume",
    "racine carree", "au carre", "pourcentage", "remise", "moyenne", "vitesse", "km/h", "plus grand que",
    "plus grande que", "plus age", "plus agee", "plus petit", "plus petite", "plus jeune", "quel jour",
    "quelle heure", "dans combien", "il reste", "me reste", "reste-t-il", "suite de", "quel nombre",
    "combien de minutes", "combien de jours", "combien de litres", "combien de pieces", "combien font",
    "combien y a-t-il", "faut-il", "fabriquent", "remplit", "consomme", "tous les", "si tous", "demonstr",
    "prouve", "moitie", "double", "triple", "tiers", "quart", "fois son age",
]


def _norm_plain(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def est_logique(question):
    q = _norm_plain(question)
    if re.search(r"\d\s*(%|x|×|\*|/|\+|-|−|=)\s*\d", q):
        return True
    n_chiffres = len(re.findall(r"\d+", q))
    if any(re.search(r"(?<![a-z])" + re.escape(m.strip()) + r"(?![a-z])", q) for m in _MOTS):
        return True
    return n_chiffres >= 3 and "?" in q


# ------------------------------------------------------------------ donnees : dialogues a plusieurs tours (memoire)

PRENOMS = ["Léo", "Inès", "Hugo", "Camille", "Yanis", "Jade", "Noah", "Manon", "Samir", "Lola", "Ethan", "Chloé",
           "Malik", "Zoé", "Théo", "Maëlys", "Rayan", "Anaïs", "Louis", "Eva", "Adam", "Nora", "Jules", "Lina"]
CAPITALES = [
    ("du Portugal", "Lisbonne"), ("de la Grèce", "Athènes"), ("de la Pologne", "Varsovie"),
    ("de l'Autriche", "Vienne"), ("de la Suède", "Stockholm"), ("de l'Irlande", "Dublin"),
    ("de la Hongrie", "Budapest"), ("de l'Égypte", "Le Caire"), ("du Kenya", "Nairobi"),
    ("de la Thaïlande", "Bangkok"), ("du Pérou", "Lima"), ("de Cuba", "La Havane"), ("du Chili", "Santiago"),
    ("de la Norvège", "Oslo"), ("du Canada", "Ottawa"), ("de l'Argentine", "Buenos Aires"),
    ("du Danemark", "Copenhague"), ("de la Finlande", "Helsinki"),
]
AUTEURS = [
    ("Les Misérables", "Victor Hugo"), ("L'Étranger", "Albert Camus"), ("Germinal", "Émile Zola"),
    ("Madame Bovary", "Gustave Flaubert"), ("Les Trois Mousquetaires", "Alexandre Dumas"),
    ("Le Petit Prince", "Antoine de Saint-Exupéry"), ("Candide", "Voltaire"), ("Le Tartuffe", "Molière"),
    ("Notre-Dame de Paris", "Victor Hugo"), ("Les Fleurs du mal", "Charles Baudelaire"),
    ("Le Horla", "Guy de Maupassant"), ("Phèdre", "Jean Racine"),
]
FAUX_PAYS = ["la Zélandrie", "l'Orvanie", "la Bastrelle", "la Quimorie", "la Delvaria", "la Mérothie", "l'Ostrevanie"]
FAUX_TITRES = ["Les Cendres de Valmoy", "Le Silence des Orgues", "La Nuit des Marées Blanches", "L'Horloger de Sombrelune",
               "Les Jardins d'Arvelane"]
FAUX_SCIENT = ["la loi de Perrinquet sur les gaz froids", "l'effet Doulcemont", "le théorème de Valderac-Moune"]
PREFS = [
    ("Mon sport préféré, c'est le {x}.", "Bon choix !", "C'est quoi mon sport préféré ?", "Ton sport préféré, c'est le {x}.",
     ["handball", "tennis", "rugby", "judo", "basket", "volley", "badminton"]),
    ("J'habite à {x}.", "Noté.", "Où est-ce que j'habite ?", "Tu habites à {x}.",
     ["Lyon", "Rennes", "Grenoble", "Lille", "Tours", "Dijon", "Nantes", "Metz"]),
    ("Mon chat s'appelle {x}.", "Joli nom !", "Comment s'appelle mon chat ?", "Ton chat s'appelle {x}.",
     ["Pixel", "Caramel", "Ninja", "Olive", "Biscotte", "Mistral", "Praline"]),
    ("Mon plat préféré, c'est {x}.", "Miam.", "Quel est mon plat préféré ?", "Ton plat préféré, c'est {x}.",
     ["les lasagnes", "le couscous", "les crêpes", "la raclette", "le risotto", "les gnocchis"]),
    ("Ma couleur préférée, c'est le {x}.", "Très bien.", "Quelle est ma couleur préférée ?", "Ta couleur préférée, c'est le {x}.",
     ["vert", "bleu", "orange", "violet", "rouge", "jaune"]),
    ("J'apprends le {x}.", "Super projet !", "Quelle matière ou langue j'apprends ?", "Tu apprends le {x}.",
     ["japonais", "piano", "violon", "russe", "chinois", "dessin"]),
]
QUESTIONS_NOM = ["Comment je m'appelle ?", "Tu te souviens de mon prénom ?", "C'est quoi mon prénom déjà ?",
                 "Rappelle-moi mon prénom.", "Comment tu m'appelles ?"]
FILLER_Q_CAP = lambda prep: f"Quelle est la capitale {prep} ?"
FILLER_A_CAP = lambda prep, v: f"La capitale {prep} est {v}."


def _filler(rnd):
    prep, ville = rnd.choice(CAPITALES)
    return FILLER_Q_CAP(prep), FILLER_A_CAP(prep, ville)


def _dialog(turns):
    """turns : liste de (question, reponse). Retourne la liste de messages au format d'usage."""
    msgs = []
    for i, (q, a) in enumerate(turns):
        msgs.append({"role": "user", "content": first_prompt(q) if i == 0 else q})
        msgs.append({"role": "assistant", "content": a})
    return msgs


def dlg_nom(rnd):
    n = rnd.choice(PRENOMS)
    t = [(rnd.choice([f"Je m'appelle {n}.", f"Moi, c'est {n}.", f"Mon prénom, c'est {n}."]),
          rnd.choice([f"Enchanté, {n} !", f"Ravi de te rencontrer, {n} !", f"Salut {n}, content de faire ta connaissance."]))]
    for _ in range(rnd.choice([0, 1, 1, 2])):
        t.append(_filler(rnd))
    t.append((rnd.choice(QUESTIONS_NOM), rnd.choice([f"Tu t'appelles {n}.", f"Ton prénom, c'est {n}."])))
    return _dialog(t)


def dlg_correction_nom(rnd):
    a, b = rnd.sample(PRENOMS, 2)
    t = [(f"Je m'appelle {a}.", f"Enchanté, {a} !"),
         (f"Non pardon, en fait je m'appelle {b}.", f"Pas de souci, {b} alors !")]
    if rnd.random() < 0.5:
        t.append(_filler(rnd))
    t.append((rnd.choice(QUESTIONS_NOM), f"Tu t'appelles {b}."))
    return _dialog(t)


def dlg_pref(rnd):
    st, ack, qq, aa, vals = rnd.choice(PREFS)
    x = rnd.choice(vals)
    t = [(st.format(x=x), ack)]
    for _ in range(rnd.choice([0, 1, 1, 2])):
        t.append(_filler(rnd))
    t.append((qq, aa.format(x=x)))
    return _dialog(t)


def dlg_capitales(rnd):
    pairs = rnd.sample(CAPITALES, rnd.choice([2, 3]))
    t = [(FILLER_Q_CAP(pairs[0][0]), FILLER_A_CAP(*pairs[0]))]
    for prep, v in pairs[1:]:
        t.append((rnd.choice([f"Et celle {prep} ?", f"Et la capitale {prep} ?"]), FILLER_A_CAP(prep, v)))
    return _dialog(t)


def dlg_auteurs(rnd):
    pairs = rnd.sample(AUTEURS, 2)
    t = [(f"Qui a écrit « {pairs[0][0]} » ?", f"{pairs[0][1]}."),
         (rnd.choice([f"Et « {pairs[1][0]} » ?", f"Et « {pairs[1][0]} », c'est de qui ?"]), f"{pairs[1][1]}.")]
    if rnd.random() < 0.4:
        a = rnd.choice([p for p in AUTEURS if p not in pairs])
        t.append((f"Et « {a[0]} » ?", f"{a[1]}."))
    return _dialog(t)


def dlg_inconnu(rnd):
    kind = rnd.choice(["pays", "titre", "sci"])
    if kind == "pays":
        q = f"Quelle est la capitale de {rnd.choice(FAUX_PAYS)} ?"
    elif kind == "titre":
        q = f"Qui a écrit « {rnd.choice(FAUX_TITRES)} » ?"
    else:
        q = f"Qui a découvert {rnd.choice(FAUX_SCIENT)} ?"
    prep, ville = rnd.choice(CAPITALES)
    known = (FILLER_Q_CAP(prep), FILLER_A_CAP(prep, ville))
    if rnd.random() < 0.5:
        t = [known, (q, IDK)]
    else:                                   # un "Je ne sais pas" ne doit pas contaminer la question suivante
        prep2, ville2 = rnd.choice([c for c in CAPITALES if c[0] != prep])
        t = [(q, IDK), (FILLER_Q_CAP(prep2), FILLER_A_CAP(prep2, ville2))]
    return _dialog(t)


def dlg_chaine_calcul(rnd):
    a, b = rnd.choice([(12, 7), (15, 6), (17, 6), (14, 9), (13, 8), (18, 5), (16, 7), (25, 4), (19, 3), (21, 4)])
    p = a * b
    t = [(f"Combien font {a} × {b} ?", f"{a} × {b} = {p}.")]
    cur = p
    for _ in range(rnd.choice([1, 2])):
        op = rnd.choice(["add", "sub", "mul", "div", "double", "half"])
        if op == "add":
            c = rnd.choice([8, 12, 15, 20, 35])
            t.append((rnd.choice([f"Ajoute {c} à ce résultat.", f"Et si j'ajoute {c} ?"]), f"{cur} + {c} = {cur + c}."))
            cur += c
        elif op == "sub":
            c = rnd.choice([5, 9, 14, 20])
            if cur - c <= 0:
                continue
            t.append((rnd.choice([f"Retire {c} à ce résultat.", f"Et si je retire {c} ?"]), f"{cur} − {c} = {cur - c}."))
            cur -= c
        elif op == "mul":
            c = rnd.choice([2, 3, 4])
            t.append((rnd.choice([f"Multiplie ce résultat par {c}.", f"Et fois {c} ?"]), f"{cur} × {c} = {cur * c}."))
            cur *= c
        elif op == "div":
            ds = [d for d in (2, 3, 4, 5, 6) if cur % d == 0]
            if not ds:
                continue
            d = rnd.choice(ds)
            t.append((rnd.choice([f"Divise ce résultat par {d}.", f"Et divisé par {d} ?"]), f"{cur} ÷ {d} = {cur // d}."))
            cur //= d
        elif op == "double":
            t.append(("Prends le double.", f"2 × {cur} = {cur * 2}."))
            cur *= 2
        else:
            if cur % 2:
                continue
            t.append(("Maintenant la moitié.", f"{cur} ÷ 2 = {cur // 2}."))
            cur //= 2
    if len(t) < 2:
        t.append(("Ajoute 10 à ce résultat.", f"{cur} + 10 = {cur + 10}."))
    return _dialog(t)


def dlg_etat(rnd):
    obj = rnd.choice([("billes", "Tu as"), ("cartes", "Tu as"), ("autocollants", "Tu as"), ("timbres", "Tu as")])
    nom, _ = obj
    a = rnd.randint(8, 40)
    b = rnd.randint(3, 15)
    c = rnd.randint(2, min(12, a + b - 1))
    t = [(f"J'ai {a} {nom}.", f"D'accord, {a} {nom}."),
         (f"J'en gagne {b}.", f"Ça te fait {a + b} {nom}."),
         (f"Puis j'en perds {c}.", f"Il t'en reste {a + b - c}."),
         (f"Combien de {nom} j'ai maintenant ?", f"Tu as {a + b - c} {nom}.")]
    return _dialog(t[: rnd.choice([3, 4, 4])])


def dlg_logique_suite(rnd):
    if rnd.random() < 0.5:
        for _ in range(50):
            v = rnd.choice([60, 72, 90, 120, 48, 84, 96])
            m1, m2 = rnd.sample([10, 15, 20, 30, 45, 50, 40], 2)
            if (v * m1) % 60 == 0 and (v * m2) % 60 == 0:
                break
        else:
            v, m1, m2 = 60, 30, 45
        d1, d2 = v * m1 // 60, v * m2 // 60
        t = [(f"Une voiture roule à {v} km/h. Quelle distance parcourt-elle en {m1} minutes ?",
              f"{v} km/h × {m1}/60 h = {d1} km."),
             (rnd.choice([f"Et en {m2} minutes ?", f"Et si elle roule {m2} minutes ?"]), f"{v} × {m2}/60 = {d2} km.")]
    else:
        p1, p2 = rnd.sample([10, 15, 20, 25, 30, 40, 50, 60, 75], 2)
        n = rnd.choice([80, 120, 160, 200, 240, 360, 400, 480])
        r1, r2 = p1 * n / 100, p2 * n / 100
        if r1 != int(r1) or r2 != int(r2):
            n, r1, r2 = 200, p1 * 2, p2 * 2
        t = [(f"Combien font {p1} % de {n} ?", f"{p1} % de {n} = {int(r1)}."),
             (rnd.choice([f"Et {p2} % ?", f"Et pour {p2} % ?"]), f"{p2} % de {n} = {int(r2)}.")]
    return _dialog(t)


DIALOGUES = [
    (dlg_nom, 120), (dlg_correction_nom, 50), (dlg_pref, 120), (dlg_capitales, 70), (dlg_auteurs, 60),
    (dlg_inconnu, 100), (dlg_chaine_calcul, 130), (dlg_etat, 90), (dlg_logique_suite, 80),
]


def build_memory_examples(seed=7, p_earlier=0.35):
    """Chaque dialogue donne un exemple par tour de l'assistant : toujours le dernier, parfois les precedents."""
    rnd = random.Random(seed)
    out = []
    n_dialogs = 0
    for fn, n in DIALOGUES:
        for _ in range(n):
            msgs = fn(rnd)
            n_dialogs += 1
            last = len(msgs) - 1
            for i in range(1, len(msgs), 2):
                if i == last or rnd.random() < p_earlier:
                    out.append({"history": msgs[:i], "target": msgs[i]["content"], "think": None, "cat": "memoire"})
    seen, uniq = set(), []
    for ex in out:                      # pas de doublons exacts
        k = json.dumps([ex["history"], ex["target"]], ensure_ascii=False)
        if k not in seen:
            seen.add(k)
            uniq.append(ex)
    return uniq, n_dialogs


# ------------------------------------------------------------------ donnees : problemes de raisonnement (reponse calculee)

def _fmt_h(minutes):
    h, m = divmod(minutes % (24 * 60), 60)
    return h, m


def gen_logic(rnd, n):
    """Problemes dont la reponse est calculee ici. Familles volontairement differentes des examens (aucun recouvrement
    avec questions_v3.jsonl : pas de rattrapage de cyclistes, d'ages, de filles/garcons, de chaussettes, de diagonales...)."""
    makers = []

    def m_consecutifs():
        k = rnd.randint(2, 30)
        return (f"La somme de trois entiers consécutifs est {3 * k}. Quel est le plus grand de ces trois entiers ?", [str(k + 1)])

    def m_moyenne():
        a, b, c = rnd.sample(range(8, 19), 3)
        d = rnd.randint(5, 20)
        moy = (a + b + c + d) / 4
        if moy != int(moy):
            return None
        return (f"La moyenne de quatre nombres est {int(moy)}. Trois d'entre eux valent {a}, {b} et {c}. Quel est le quatrième ?", [str(d)])

    def m_monnaie():
        n1, p1 = rnd.randint(2, 6), rnd.choice([2, 3, 4])
        n2, p2 = rnd.randint(1, 4), rnd.choice([5, 6, 8])
        tot = n1 * p1 + n2 * p2
        bill = rnd.choice([b for b in (20, 50) if b > tot] or [100])
        return (f"Léa achète {n1} stylos à {p1} € l'un et {n2} cahiers à {p2} € l'un. Elle paie avec un billet de {bill} €. "
                f"Combien d'euros lui rend-on ?", [str(bill - tot)])

    def m_secondes():
        h, m = rnd.randint(1, 3), rnd.choice([5, 10, 15, 20, 30])
        return (f"Combien de secondes y a-t-il dans {h} heure{'s' if h > 1 else ''} et {m} minutes ?", [str(h * 3600 + m * 60)])

    def m_remise_livraison():
        p = rnd.choice([40, 60, 80, 120, 150, 200])
        d = rnd.choice([10, 20, 25, 30, 50])
        liv = rnd.choice([5, 8, 10])
        prix = p * (100 - d) / 100 + liv
        if prix != int(prix):
            return None
        return (f"Un article coûte {p} €. Il est soldé de {d} %, puis on ajoute {liv} € de frais de livraison. Quel est le total à payer, en euros ?", [str(int(prix))])

    def m_multiples():
        k = rnd.choice([4, 6, 7, 9, 11, 12, 15])
        n = rnd.choice([60, 100, 150, 200, 250])
        return (f"Combien d'entiers compris entre 1 et {n} (inclus) sont des multiples de {k} ?", [str(n // k)])

    def m_ouvriers():
        a, b = rnd.choice([(6, 3), (12, 4), (10, 15), (20, 5), (30, 15), (12, 6), (8, 8), (20, 30), (24, 8), (18, 9), (40, 10), (60, 15), (30, 20)])
        t = a * b / (a + b)
        if abs(t - round(t)) > 1e-9:
            return None
        return (f"Un ouvrier peint un mur en {a} heures, un second le peint en {b} heures. Combien d'heures leur faut-il pour le peindre ensemble ?", [str(int(round(t)))])

    def m_nombre_mystere():
        x = rnd.randint(3, 25)
        k = rnd.randint(2, 7)
        a = rnd.randint(1, 20)
        return (f"Je pense à un nombre. Je le multiplie par {k}, puis j'ajoute {a} : j'obtiens {k * x + a}. Quel est ce nombre ?", [str(x)])

    def m_pieces():
        n1 = rnd.randint(3, 12)
        n2 = rnd.randint(3, 12)
        return (f"Une tirelire contient {n1 + n2} pièces, toutes de 1 € ou de 2 €, pour un total de {n1 + 2 * n2} €. Combien y a-t-il de pièces de 2 € ?", [str(n2)])

    def m_vitesse_moyenne():
        a, b = rnd.choice([(60, 40), (30, 60), (20, 30), (40, 60), (45, 90), (36, 60), (80, 120), (24, 40), (50, 75), (15, 30), (10, 15)])
        v = 2 * a * b / (a + b)
        if abs(v - round(v)) > 1e-9:
            return None
        return (f"Un cycliste monte une côte à {a} km/h et la redescend, par le même chemin, à {b} km/h. Quelle est sa vitesse moyenne sur l'aller-retour, en km/h ?", [str(int(round(v)))])

    def m_hausse_inverse():
        p0 = rnd.choice([40, 60, 80, 120, 200, 240])
        h = rnd.choice([10, 20, 25, 50])
        p1 = p0 * (100 + h) / 100
        if p1 != int(p1):
            return None
        return (f"Après une hausse de {h} %, le prix d'un objet est de {int(p1)} €. Quel était son prix avant la hausse, en euros ?", [str(p0)])

    def m_film():
        h0, m0 = rnd.randint(18, 21), rnd.choice([5, 15, 20, 30, 45, 50])
        dh, dm = rnd.randint(1, 2), rnd.choice([10, 25, 35, 40, 50])
        tot = h0 * 60 + m0 + dh * 60 + dm
        h, m = _fmt_h(tot)
        return (f"Un film commence à {h0} h {m0:02d} et dure {dh} h {dm:02d}. À quelle heure se termine-t-il ?",
                [f"{h} h {m:02d}", f"{h}h{m:02d}", f"{h}:{m:02d}"] if m else [f"{h} h", f"{h}h", f"{h} h 00", f"{h}h00"])

    def m_suite():
        a, r = rnd.randint(2, 9), rnd.randint(3, 7)
        n = rnd.choice([8, 10, 12])
        terms = ", ".join(str(a + r * i) for i in range(4))
        return (f"On considère la suite {terms}, … où l'on ajoute toujours le même nombre. Quel est le {n}e terme ?", [str(a + r * (n - 1))])

    makers = [m_consecutifs, m_moyenne, m_monnaie, m_secondes, m_remise_livraison, m_multiples, m_ouvriers,
              m_nombre_mystere, m_pieces, m_vitesse_moyenne, m_hausse_inverse, m_film, m_suite]
    out, seen, guard = [], set(), 0
    while len(out) < n and guard < n * 40:
        guard += 1
        r = makers[len(out) % len(makers)]()
        if r is None or r[0] in seen:
            continue
        seen.add(r[0])
        out.append({"q": r[0], "expected": r[1]})
    return out


# ------------------------------------------------------------------ outils modele

def load_jsonl(path):
    return [json.loads(l) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]


def find_file(name):
    hits = sorted(Path("/kaggle/input").rglob(name))
    return hits[0] if hits else None


def chat_text(tok, messages, think):
    return tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=think)


def gen_batch(tok, model, convs, think, max_new, sample=False, bs=DISTILL_BATCH, budget_end=None, log_every=1, sort=True):
    """convs : liste de listes de messages. Retourne une liste de textes decodes (None si budget depasse)."""
    import torch
    tok.padding_side = "left"
    res = [None] * len(convs)
    order = sorted(range(len(convs)), key=lambda i: len(str(convs[i]))) if sort else list(range(len(convs)))
    for b in range(0, len(order), bs):
        if budget_end is not None and time.time() > budget_end:
            break
        idx = order[b:b + bs]
        texts = [chat_text(tok, convs[i], think) for i in idx]
        enc = tok(texts, return_tensors="pt", padding=True).to("cuda")
        kw = dict(max_new_tokens=max_new, pad_token_id=tok.pad_token_id)
        if sample:
            kw.update(do_sample=True, temperature=0.6, top_p=0.95, top_k=20)
        else:
            kw.update(do_sample=False)
        with torch.no_grad():
            out = model.generate(**enc, **kw)
        n_in = enc["input_ids"].shape[1]
        for j, i in enumerate(idx):
            res[i] = tok.decode(out[j][n_in:], skip_special_tokens=True).strip()
        if (b // bs) % log_every == 0:
            print(f"   lot {b // bs + 1}/{math.ceil(len(order) / bs)} fait", flush=True)
    return res


def split_think(text):
    """(reflexion, reponse) ou (None, None) si la reflexion n'est pas terminee."""
    if text is None or "</think>" not in text:
        return None, None
    th, ans = text.rsplit("</think>", 1)
    return th.replace("<think>", "").strip(), ans.strip()


EXAM_QS = set()


def distill(tok, model, deadline):
    """Etape 1 : raisonnements corrects de Qwen3 (sans LoRA) sur des problemes a reponse calculee."""
    rnd = random.Random(11)
    probs = [p for p in gen_logic(rnd, DISTILL_QUESTIONS) if norm(p["q"]) not in EXAM_QS]
    rnd.shuffle(probs)          # le budget de temps coupe la fin : pas de biais vers un type de probleme
    print(f"Distillation : {len(probs)} problemes, budget {int((deadline - time.time()) / 60)} min.", flush=True)
    convs = [[{"role": "user", "content": first_prompt(p["q"])}] for p in probs]
    model.config.use_cache = True
    outs = gen_batch(tok, model, convs, think=True, max_new=DISTILL_MAX_NEW, sample=True, budget_end=deadline, sort=False)
    kept, tried, truncated = [], 0, 0
    for p, o in zip(probs, outs):
        if o is None:
            continue
        tried += 1
        th, ans = split_think(o)
        if th is None:
            truncated += 1
            continue
        if th and ans and len(ans) < 600 and has_keyword(ans, p["expected"]):
            kept.append({"history": [{"role": "user", "content": first_prompt(p["q"])}],
                         "target": f"<think>\n{th}\n</think>\n\n{ans}", "think": True, "cat": "raisonnement"})
    print(f"Distillation : {len(kept)} gardes sur {tried} tentes ({truncated} tronques).", flush=True)
    return kept, {"tentes": tried, "gardes": len(kept), "tronques": truncated}


# ------------------------------------------------------------------ examens

MEM_TESTS = [   # mini-test de memoire, formulations differentes de celles de l'entrainement
    ([("Mon chien s'appelle Rex.", None), ("Quelle est la capitale de la Lettonie ?", None), ("Comment s'appelle mon chien ?", ["rex"])]),
    ([("Je fais du tir à l'arc.", None), ("Quel sport est-ce que je pratique ?", ["tir a l'arc", "arc"])]),
    ([("Mon film préféré est Interstellar.", None), ("Rappelle-moi quel est mon film préféré.", ["interstellar"])]),
    ([("Ma petite sœur s'appelle Clara.", None), ("Combien font 6 × 7 ?", None), ("Comment s'appelle ma petite sœur ?", ["clara"])]),
    ([("Combien font 9 × 8 ?", None), ("Ajoute 8 à ce résultat.", ["80"])]),
    ([("Combien font 15 × 4 ?", None), ("Divise ce résultat par 6.", ["10"])]),
    ([("Quelle est la capitale de la Slovénie ?", None), ("Et celle de la Croatie ?", ["zagreb"])]),
    ([("Je suis né à Bordeaux.", None), ("Où suis-je né ?", ["bordeaux"])]),
    ([("J'ai 20 jetons.", None), ("J'en perds 7.", None), ("Combien de jetons me reste-t-il ?", ["13", "treize"])]),
    ([("Je m'appelle Karim.", None), ("Non pardon, c'est Rachid.", None), ("Comment je m'appelle ?", ["rachid"])]),
    ([("Quelle est la capitale du Maroc ?", None), ("Quelle est la capitale du royaume de Thessarune ?", ["je ne sais pas"])]),
    ([("Ma matière préférée, c'est la chimie.", None), ("Quelle est ma matière préférée ?", ["chimie"])]),
]


def run_mem_tests(tok, model):
    """Rejoue chaque conversation tour par tour avec les vraies reponses du modele, puis note le DERNIER tour."""
    ok, detail = 0, []
    for t in MEM_TESTS:
        msgs, ans = [], ""
        for i, (q, _) in enumerate(t):
            msgs.append({"role": "user", "content": first_prompt(q) if i == 0 else q})
            ans = gen_batch(tok, model, [msgs], think=False, max_new=SHORT_TOKENS, bs=1, log_every=10 ** 9)[0]
            msgs.append({"role": "assistant", "content": ans})
        last_exp = t[-1][1]
        good = starts_with_refusal(ans) if last_exp == ["je ne sais pas"] else has_keyword(ans, last_exp)
        ok += int(good)
        detail.append({"dernier": t[-1][0], "reponse": ans, "ok": bool(good)})
    return {"ok": ok, "total": len(MEM_TESTS), "detail": detail}


def score_exam(tok, model, items, use_adapter_for_logic, think_tokens=THINK_TOKENS):
    """Retourne les scores par type pour une configuration. use_adapter_for_logic=False : comme le Space actuel
    (LoRA coupe + reflexion pour les questions de logique). Les faits et inconnus : LoRA actif, sans reflexion."""
    import contextlib
    logic_idx = [i for i, it in enumerate(items) if est_logique(it["q"])]
    other_idx = [i for i in range(len(items)) if i not in set(logic_idx)]
    answers = [None] * len(items)
    short = gen_batch(tok, model, [[{"role": "user", "content": first_prompt(items[i]["q"])}] for i in other_idx],
                      think=False, max_new=SHORT_TOKENS, bs=16, log_every=10 ** 9)
    for i, a in zip(other_idx, short):
        answers[i] = a
    ctx = contextlib.nullcontext() if use_adapter_for_logic else model.disable_adapter()
    with ctx:
        long_out = gen_batch(tok, model, [[{"role": "user", "content": first_prompt(items[i]["q"])}] for i in logic_idx],
                             think=True, max_new=think_tokens, bs=8)
    redo = []
    for i, o in zip(logic_idx, long_out):
        th, ans = split_think(o)
        if th is None:
            redo.append(i)
        else:
            answers[i] = ans
    if redo:        # reflexion non terminee : reponse directe (comme le Space)
        d = gen_batch(tok, model, [[{"role": "user", "content": first_prompt(items[i]["q"])}] for i in redo],
                      think=False, max_new=400, bs=8, log_every=10 ** 9)
        for i, a in zip(redo, d):
            answers[i] = a
    score = {}
    for typ in ("fait", "inconnu", "logique"):
        ids = [i for i, it in enumerate(items) if it["type"] == typ]
        good = 0
        for i in ids:
            it, a = items[i], answers[i] or ""
            good += int(starts_with_refusal(a) if typ == "inconnu" else has_keyword(a, it["expected"]))
        score[typ] = [good, len(ids)]
    score["reflexion_non_terminee"] = len(redo)
    score["routeur_logique"] = len(logic_idx)
    return score, answers


# ------------------------------------------------------------------ construction du jeu d'entrainement

def tokenise(tok, ex, max_len):
    think = bool(ex["think"])
    prefix = chat_text(tok, ex["history"], think=think)
    p_ids = tok(prefix, add_special_tokens=False)["input_ids"]
    t_ids = tok(ex["target"] + "<|im_end|>", add_special_tokens=False)["input_ids"]
    ids = p_ids + t_ids
    if len(ids) > max_len:
        return None
    return ids, [-100] * len(p_ids) + t_ids


def from_messages_file(path, default_think_off=True):
    """perso_train.jsonl / logique_distille.jsonl : {"messages":[user, assistant]}"""
    out = []
    for e in load_jsonl(path):
        m = e["messages"]
        user = m[0]["content"].replace(PERSO_HEADER_V2, PERSO_HEADER)
        rep = m[1]["content"]
        has_think = rep.lstrip().startswith("<think>")
        out.append({"history": [{"role": "user", "content": user}], "target": rep,
                    "think": True if has_think else False, "cat": e.get("cat", "perso")})
    return out


# ------------------------------------------------------------------ principal

def hf_upload(folder, repo, path_in_repo, msg):
    from huggingface_hub import HfApi
    api = HfApi()
    try:
        api.create_repo(repo, repo_type="model", private=True, exist_ok=True)
    except Exception as e:
        print("[HF] create_repo :", e)
    api.upload_folder(folder_path=str(folder), path_in_repo=path_in_repo, repo_id=repo, repo_type="model",
                      commit_message=msg, ignore_patterns=["checkpoint-*", "*.bin", "optimizer*"])
    print(f"[HF] OK : {repo}/{path_in_repo}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="construit les donnees et s'arrete (sans GPU)")
    ap.add_argument("--epochs", type=int, default=2)
    ap.add_argument("--accum", type=int, default=8)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--checkpoint-interval", type=int, default=250)
    ap.add_argument("--lora-repo", default=None)
    ap.add_argument("--skip-distill", action="store_true")
    ap.add_argument("--skip-exam", action="store_true")
    args = ap.parse_args()

    raw_cfg = globals().get("NOVAIA_TRAINING_CONFIG")
    cfg = json.loads(raw_cfg) if raw_cfg else {}
    epochs = int(cfg.get("epochs", args.epochs))
    accum = int(cfg.get("gradient_accumulation", args.accum))
    lr = float(cfg.get("learning_rate", args.lr))
    ckpt_every = int(cfg.get("checkpoint_interval", args.checkpoint_interval))
    lora_repo = cfg.get("lora_repo") or args.lora_repo
    if cfg.get("resume"):
        print("NOTE : la reprise sur checkpoint n'existe pas en v2 (ignoree). On repart de zero.")
    if int(cfg.get("batch_size", 1)) != 1:
        print("NOTE : la v2 utilise un exemple a la fois (batch 1), la valeur demandee est ignoree.")

    t_start = time.time()
    print("=" * 60)
    print(" NOVAIA v2 - Qwen3-8B - QLoRA")
    print("=" * 60)
    print(f"epochs={epochs}  accum={accum}  lr={lr}  depot HF={lora_repo}/{HF_PATH}")

    # ---------- donnees (sans modele)
    perso_path = find_file("perso_train.jsonl")
    exam_path = find_file("questions_v3.jsonl")
    if args.dry_run:
        perso_path = perso_path or Path("perso_train.jsonl")
    if perso_path is None or not Path(perso_path).exists():
        raise FileNotFoundError("perso_train.jsonl introuvable sous /kaggle/input : ajoute-le au dataset Kaggle 'new-good'.")
    if exam_path is None and not args.skip_exam and not args.dry_run:
        raise FileNotFoundError("questions_v3.jsonl introuvable sous /kaggle/input : ajoute-le au dataset Kaggle 'new-good'.")
    perso = from_messages_file(perso_path)
    dist_path = find_file("logique_distille.jsonl")
    pc_dist = from_messages_file(dist_path) if dist_path else []
    memoire, n_dialogs = build_memory_examples()
    EXAM_QS.update(norm(it["q"]) for it in load_jsonl(exam_path)) if exam_path else None
    print(f"perso : {len(perso)} | logique distillee (PC) : {len(pc_dist)} | memoire : {len(memoire)} exemples "
          f"({n_dialogs} dialogues)")
    if args.dry_run:
        rnd = random.Random(1)
        for ex in rnd.sample(memoire, 4):
            print(json.dumps(ex, ensure_ascii=False)[:700])
        for p in gen_logic(random.Random(11), 6):
            print(p)
        print("DRY-RUN OK")
        return

    if os.environ.get("HF_TOKEN") is None and cfg.get("hf_token"):
        os.environ["HF_TOKEN"] = cfg["hf_token"]
    if cfg.get("hf_token"):
        from huggingface_hub import login
        login(token=cfg["hf_token"], add_to_git_credential=False)
        print("Authentification Hugging Face OK.")

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import LoraConfig, get_peft_model

    print("GPU :", torch.cuda.get_device_name(0), "| memoire :", round(torch.cuda.get_device_properties(0).total_memory / 2**30, 1), "Go")
    tok = AutoTokenizer.from_pretrained(MODEL)
    bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16,
                             bnb_4bit_use_double_quant=True)
    print("Chargement de Qwen3-8B (4 bits)...", flush=True)
    model = AutoModelForCausalLM.from_pretrained(MODEL, quantization_config=bnb, device_map={"": 0},
                                                 torch_dtype=torch.float16)
    model.eval()

    # ---------- etape 1 : distillation
    dist_stats = {"tentes": 0, "gardes": 0, "tronques": 0}
    distilled = []
    if not args.skip_distill:
        distilled, dist_stats = distill(tok, model, time.time() + DISTILL_BUDGET_S)
    torch.cuda.empty_cache()

    # ---------- exemples tokenises
    exemples, ignores = [], 0
    for ex in perso + pc_dist + memoire + distilled:
        r = tokenise(tok, ex, MAX_LEN)
        if r is None:
            ignores += 1
        else:
            exemples.append(r)
    print(f"{len(exemples)} exemples d'entrainement ({ignores} ecartes car trop longs).", flush=True)
    if len(exemples) < 200:
        raise RuntimeError("Trop peu d'exemples : verifie perso_train.jsonl.")

    # ---------- etape 2 : entrainement
    model.config.use_cache = False
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    model.enable_input_require_grads()
    lcfg = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
                      target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"])
    model = get_peft_model(model, lcfg)
    model.print_trainable_parameters()
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=lr, weight_decay=0.0)
    scaler = torch.cuda.amp.GradScaler()
    total_steps = max(1, math.ceil(len(exemples) * epochs / accum))
    warm = max(1, total_steps // 10)

    def lr_at(s):
        if s < warm:
            return lr * (s + 1) / warm
        return lr * 0.5 * (1 + math.cos(math.pi * (s - warm) / max(1, total_steps - warm)))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rnd = random.Random(3)
    step, nan_count, seen = 0, 0, 0
    t0 = time.time()
    stop = False
    model.train()
    for ep in range(1, epochs + 1):
        rnd.shuffle(exemples)
        run_loss, run_n = 0.0, 0
        for i, (ids, labels) in enumerate(exemples, 1):
            loss = model(input_ids=torch.tensor([ids], device="cuda"), labels=torch.tensor([labels], device="cuda")).loss
            seen += 1
            if not torch.isfinite(loss):
                nan_count += 1
                opt.zero_grad(set_to_none=True)
                if seen <= 20 and nan_count >= 10:
                    raise RuntimeError("Perte NaN des les premiers exemples : debordement en float16 sur la T4 "
                                       "(Qwen3 en fp16). Il faut une autre precision ou un autre GPU.")
                continue
            scaler.scale(loss / accum).backward()
            run_loss += float(loss)
            run_n += 1
            if i % accum == 0 or i == len(exemples):
                for g in opt.param_groups:
                    g["lr"] = lr_at(step)
                scaler.unscale_(opt)
                torch.nn.utils.clip_grad_norm_(params, 1.0)
                scaler.step(opt)
                scaler.update()
                opt.zero_grad(set_to_none=True)
                step += 1
                if step % 5 == 0 or step == total_steps:
                    print(f"passage {ep}/{epochs}  maj {step}/{total_steps}  perte {run_loss / max(1, run_n):.3f}"
                          f"  ({(time.time() - t0) / 60:.1f} min, {nan_count} NaN ignores)", flush=True)
                    run_loss, run_n = 0.0, 0
                if lora_repo and step % ckpt_every == 0:
                    model.save_pretrained(OUT_DIR)
                    try:
                        hf_upload(OUT_DIR, lora_repo, HF_PATH, f"NovaIA v2 - etape {step}")
                    except Exception as e:
                        print("[HF] ERREUR upload intermediaire :", e)
                if time.time() - t0 > TRAIN_BUDGET_S:
                    print("Budget de temps d'entrainement atteint : arret propre.")
                    stop = True
                    break
        model.save_pretrained(OUT_DIR)
        print(f"Adaptateur enregistre (fin du passage {ep}).", flush=True)
        if stop:
            break
    tok.save_pretrained(OUT_DIR)
    print(f"Entrainement termine en {(time.time() - t0) / 60:.1f} min.", flush=True)

    # ---------- etape 3 : examens
    results = {"modele": MODEL, "exemples": len(exemples), "epochs": epochs, "etapes": step, "nan_ignores": nan_count,
               "distillation": dist_stats, "memoire_exemples": len(memoire),
               "duree_entrainement_min": round((time.time() - t0) / 60, 1)}
    if not args.skip_exam and exam_path:
        items = load_jsonl(exam_path)
        model.gradient_checkpointing_disable()
        model.config.use_cache = True
        model.eval()
        print("\n=== EXAMEN INEDIT questions_v3.jsonl ===", flush=True)
        try:
            with model.disable_adapter():
                base_short, _ = score_exam(tok, model, [it for it in items if it["type"] != "logique"], True)
            results["base_sans_lora_faits_inconnus"] = base_short
            print("base (sans LoRA) faits/inconnus :", base_short, flush=True)
            s_space, _ = score_exam(tok, model, items, use_adapter_for_logic=False)
            results["lora_logique_comme_space_actuel"] = s_space
            print("LoRA, logique = base + reflexion (comme le Space) :", s_space, flush=True)
            s_lora, _ = score_exam(tok, model, items, use_adapter_for_logic=True)
            results["lora_logique_avec_lora"] = s_lora
            print("LoRA, logique = LoRA + reflexion :", s_lora, flush=True)
        except Exception as e:
            results["erreur_examen"] = repr(e)
            print("ERREUR pendant l'examen :", repr(e), flush=True)
        try:
            mem = run_mem_tests(tok, model)
            results["memoire_mini_test"] = mem
            print(f"Memoire (mini-test) : {mem['ok']}/{mem['total']}", flush=True)
            for d in mem["detail"]:
                print("  ", "OK " if d["ok"] else "RATE", d["dernier"], "->", d["reponse"][:80], flush=True)
        except Exception as e:
            results["erreur_memoire"] = repr(e)
            print("ERREUR pendant le test de memoire :", repr(e), flush=True)

    (OUT_DIR / "resultats.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    if lora_repo:
        try:
            hf_upload(OUT_DIR, lora_repo, HF_PATH, "NovaIA v2 - final + resultats")
        except Exception as e:
            print("[HF] ERREUR upload final :", e, "\nL'adaptateur reste dans /kaggle/working/lora_v2 (onglet Output du kernel).")
            raise
    print(f"\nTOUT EST TERMINE en {(time.time() - t_start) / 60:.0f} min.")


if __name__ == "__main__":
    main()
