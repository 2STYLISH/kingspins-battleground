'use client';

import { usePathname } from 'next/navigation';

export default function BackgroundManager() {
  const pathname = usePathname();
  
  const isHome = pathname === '/';
  
  // Use bg-home.png for the homepage and bg-other.png for all other pages
  const bgUrl = isHome ? "url('/bg-home.png')" : "url('/bg-other.png')";

  return (
    <>
      {/* Base background image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat z-[-2]" 
        style={{ backgroundImage: bgUrl }}
      />
      
      {/* Dark overlay for readability, reduced so the graphics pop */}
      <div className="fixed inset-0 bg-black/20 pointer-events-none z-[-1]" />
    </>
  );
}
