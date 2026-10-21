'use client';

import { usePathname } from 'next/navigation';
import CookieBanner from './CookieBanner';

export default function CookieAwareBanner() {
  const pathname = usePathname();
  if (pathname.startsWith('/crm') || pathname.startsWith('/portal')) return null;
  return <CookieBanner />;
}
