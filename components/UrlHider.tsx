'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function UrlHider() {
  const pathname = usePathname();

  useEffect(() => {
    // Aggressively hide the path from the browser address bar
    // It will always just show the base domain, or /admin if inside admin
    if (typeof window !== 'undefined') {
      // Modifying window.history directly in Next.js App Router breaks 
      // Server Actions and router.refresh(), because Next.js uses the 
      // current browser URL to fetch the updated React Server Component payload.
      // If we spoof it to /admin, any action will refresh the page to /admin.
      
      // const isUrlAdmin = pathname.startsWith('/admin');
      // const hiddenPath = isUrlAdmin ? '/admin' : '/';
      // 
      // if (window.location.pathname !== hiddenPath) {
      //   window.history.replaceState(null, '', hiddenPath);
      // }
    }
  }, [pathname]);

  return null;
}
