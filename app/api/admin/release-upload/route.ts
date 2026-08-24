// app/api/admin/release-upload/route.ts
//
// Génère un jeton d'upload pour Vercel Blob — le fichier (.exe / .zip / .dmg,
// potentiellement 80-150 Mo+) ne transite JAMAIS par cette route ni par aucune
// fonction serverless : il part directement du navigateur vers Vercel Blob.
// Les fonctions serverless Vercel ont une limite de taille de requête de
// 4,5 Mo, largement insuffisante pour ces fichiers — d'où ce mode "client
// upload" plutôt qu'un handler qui recevrait le fichier lui-même.
//
// Variable d'environnement nécessaire (Vercel Dashboard → Storage → Blob,
// créée automatiquement si tu ajoutes un store Blob au projet) :
//   BLOB_READ_WRITE_TOKEN

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Vérifie que l'appelant est bien un admin connecté (même contrôle
        // que les policies RLS "admin write" utilisées ailleurs sur le site).
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Non authentifié.');
        }

        const { data: admin } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!admin) {
          throw new Error('Accès refusé — réservé aux administrateurs.');
        }

        // Contrôle qui compte vraiment : l'extension du fichier ciblé.
        const allowedExtensions = ['.exe', '.zip', '.dmg'];
        const hasAllowedExtension = allowedExtensions.some((ext) =>
          pathname.toLowerCase().endsWith(ext)
        );
        if (!hasAllowedExtension) {
          throw new Error('Type de fichier non autorisé (attendu : .exe, .zip ou .dmg).');
        }

        // Le filtre de content-type ci-dessous est secondaire : le type MIME
        // envoyé par le navigateur pour un même fichier varie beaucoup selon
        // l'OS/le navigateur (ex: .exe vu en local a été uploadé en
        // 'application/x-msdos-program', pas la valeur "officielle"
        // 'application/vnd.microsoft.portable-executable') — on reste large
        // ici plutôt que de bloquer des uploads légitimes.
        return {
          allowedContentTypes: [
            'application/vnd.microsoft.portable-executable',
            'application/x-msdos-program',
            'application/x-dosexec',
            'application/zip',
            'application/x-zip-compressed',
            'application/x-apple-diskimage',
            'application/octet-stream', // type générique renvoyé par beaucoup de navigateurs pour .exe/.dmg
          ],
          addRandomSuffix: false, // on garde des noms de fichiers prévisibles (releases/<slug>/<version>/...)
          tokenPayload: JSON.stringify({ uploadedBy: user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Rien à faire ici : la ligne app_releases est écrite explicitement
        // par la page admin une fois l'upload ET le calcul du SHA-256
        // terminés côté navigateur (voir app/admin/(dashboard)/releases/page.tsx).
        // Note : ce callback n'est fiable qu'en production (Vercel doit
        // pouvoir joindre l'URL publique de cette route) ; il est ignoré en
        // local, ce qui est très bien puisqu'on ne s'appuie pas dessus.
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue.' },
      { status: 400 }
    );
  }
}
