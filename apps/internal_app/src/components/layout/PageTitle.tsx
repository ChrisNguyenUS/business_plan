'use client'

import { usePathname } from 'next/navigation'

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases': 'Cases',
  '/clients': 'Clients',
  '/jobs': 'Jobs',
  '/pdf-generator': 'PDF Generator',
  '/tracker': 'USCIS Tracker',
  '/notifications': 'Notifications',
}

export default function PageTitle() {
  const pathname = usePathname()
  const segment = '/' + (pathname.split('/')[1] ?? '')
  const title = TITLE_MAP[segment] ?? ''

  if (!title) return null

  return (
    <h2 className="text-xl font-semibold text-slate-800 tracking-tight">{title}</h2>
  )
}
