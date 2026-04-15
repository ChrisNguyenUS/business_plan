import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import SearchBar from '@/components/layout/SearchBar'
import PageTitle from '@/components/layout/PageTitle'

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/cases', label: 'Cases', icon: 'folder_shared' },
  { href: '/clients', label: 'Clients', icon: 'group' },
  { href: '/jobs', label: 'Jobs', icon: 'work' },
  { href: '/pdf-generator', label: 'PDF Generator', icon: 'picture_as_pdf' },
  { href: '/tracker', label: 'USCIS Tracker', icon: 'travel_explore' },
]

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user profile to determine role
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'ultimate_admin'
  const displayName = profile?.name || user.email?.split('@')[0] || 'Staff'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const visibleNav = NAV_ITEMS

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f9ff' }}>
      {/* Sidebar */}
      <aside
        className="h-full w-64 fixed left-0 top-0 flex flex-col p-6 z-50 overflow-y-auto"
        style={{ backgroundColor: '#0f172a' }}
      >
        {/* Logo */}
        <div className="mb-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-xl"
            style={{ backgroundColor: '#3AAFB9' }}
          >
            M
          </div>
          <div>
            <h1
              className="text-lg font-semibold tracking-tight"
              style={{ color: '#3AAFB9' }}
            >
              Manna One
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Internal Suite
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow space-y-0.5">
          {visibleNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: '#3AAFB9' }}
            >
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate capitalize">
                {isAdmin ? 'Ultimate Admin' : 'Immigration Staff'}
              </p>
            </div>
          </div>
          {/* Sign out */}
          <form action="/api/auth/signout" method="POST" className="mt-4">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header
          className="sticky top-0 z-40 flex justify-between items-center w-full h-16 px-8"
          style={{
            backgroundColor: 'rgba(247, 249, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(188, 201, 202, 0.2)',
          }}
        >
          <div className="flex items-center gap-4">
            <PageTitle />
            <SearchBar />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-[#e5e8ee] rounded-full transition-colors relative"
            >
              <span className="material-symbols-outlined">notifications</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}

// Server component can't use usePathname, so we create a client wrapper
function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150 rounded-lg"
    >
      <span className="material-symbols-outlined text-xl">{item.icon}</span>
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  )
}
