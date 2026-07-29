'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton({ locale, label }: { locale: string; label: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-full bg-ink py-2.5 text-sm font-medium text-paper transition-opacity duration-200 hover:opacity-85"
    >
      {label}
    </button>
  );
}
