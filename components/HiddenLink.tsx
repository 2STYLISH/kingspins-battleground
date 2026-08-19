'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, MouseEvent } from 'react';

export default function HiddenLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    if (onClick) onClick();
    router.push(href);
  }

  return (
    <div onClick={handleClick} className={`cursor-pointer ${className || ''}`}>
      {children}
    </div>
  );
}
