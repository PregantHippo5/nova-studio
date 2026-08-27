// scripts/test-kaggle-client.ts
//
// Script de test JETABLE, exécuté en local, PAS dans Next.js.
// À supprimer une fois lib/kaggle/client.ts validé.
//
// Usage : npx tsx scripts/test-kaggle-client.ts

import {
  pushTrainingKernel,
  getTrainingKernelStatus,
  type TrainingConfig,
} from '../lib/kaggle/client';

const credentials = {
  username: process.env.KAGGLE_USERNAME!,
  key: process.env.KAGGLE_KEY!,
};

if (!credentials.username || !credentials.key) {
  throw new Error('KAGGLE_USERNAME / KAGGLE_KEY manquants (variables d\'env).');
}

// Script minimal, volontairement inoffensif : ne touche ni au vrai
// train_novaia.py, ni à vos vraies données. Sert juste à vérifier que
// SaveKernel/GetKernelSessionStatus répondent comme attendu.
const dummyScript = `
print("NovaIA — test client.ts, kernel factice.")
print("Si tu vois ce message dans les logs Kaggle, SaveKernel fonctionne.")
`;

const dummyConfig: TrainingConfig = {
  dataset: 'novaia_qa_5000_v3.jsonl',
  epochs: 1,
  batch_size: 1,
  gradient_accumulation: 8,
  learning_rate: 0.0001,
  checkpoint_interval: 250,
  resume: false,
  resume_checkpoint: null,
  lora_repo: 'novastudio123/novaia-checkpoints',
  lora_path: 'nova-lora',
};

async function main() {
  console.log('--- TEST 1 : pushTrainingKernel ---');
  const pushResult = await pushTrainingKernel(credentials, dummyScript, dummyConfig);
  console.log(JSON.stringify(pushResult, null, 2));

  console.log('\n--- TEST 2 : getTrainingKernelStatus (immédiat) ---');
  const statusResult = await getTrainingKernelStatus(credentials);
  console.log(JSON.stringify(statusResult, null, 2));

  console.log(
    '\nAttendez quelques secondes/minutes, puis relancez juste ' +
    'getTrainingKernelStatus pour voir le statut évoluer.'
  );
}

main().catch((err) => {
  console.error('❌ ERREUR :', err);
  process.exit(1);
});