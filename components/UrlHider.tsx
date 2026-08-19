'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function UrlHider() {
  const pathname = usePathname();

  useEffect(() => {
    // Aggressively hide the path from the browser address bar
    // It will always just show the base domain, or /admin if inside admin
    if (typeof window !== 'undefined') {
      const isUrlAdmin = pathname.startsWith('/admin');
      const hiddenPath = isUrlAdmin ? '/admin' : '/';
      
      if (window.location.pathname !== hiddenPath) {
        window.history.replaceState(null, '', hiddenPath);
      }
    }
  }, [pathname]);

  return null;
}
