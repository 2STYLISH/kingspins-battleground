'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function AdminBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(pathname === '/admin' ? '/' : '/admin');
    }
  }

  return (
    <button
      onClick={handleBack}
      className="mb-6 inline-flex items-center gap-2 text-sm text-silver-500 hover:text-white transition-colors group"
    >
      <span className="inline-block group-hover:-translate-x-0.5 transition-transform" aria-hidden>←</span>
      Back
    </button>
  );
}
