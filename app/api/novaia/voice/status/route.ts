// GET : la voix du serveur (Whisper + Piper) est-elle activée ? Le navigateur n'en voit que oui/non, jamais l'adresse.
import { voiceEnabled } from '@/lib/novaia/voiceSpace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ enabled: voiceEnabled }, { headers: { 'Cache-Control': 'no-store' } });
}
