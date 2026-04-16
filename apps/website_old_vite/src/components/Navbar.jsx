const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Shield, Search, LogIn, ChevronRight } from 'lucide-react';

import { Button } from "@/components/ui/button";

// Searchable content index
const SEARCH_INDEX = [
  { label: 'Home', path: '/', desc: 'One Stop, All Solutions' },
  { label: 'Services', path: '/services', desc: 'Tax, Insurance, Immigration, AI' },
  { label: 'Tax & Business', path: '/services/tax', desc: 'Tax preparation, LLC setup, extension filing' },
  { label: 'Insurance & Finance', path: '/services/insurance', desc: 'Life insurance, annuity, retirement planning' },
  { label: 'Immigration', path: '/services/immigration', desc: 'N-400, green card, I-90, I-130, I-485, I-765, work permit' },
  { label: 'AI / Automation', path: '/services/ai', desc: 'Workflow automation, AI tools for small businesses' },
  { label: 'About Us', path: '/about', desc: 'Our mission, story, credentials, and team' },
  { label: 'Blog', path: '/blog', desc: 'Articles on tax, insurance, immigration, AI' },
  { label: 'Contact', path: '/contact', desc: 'Book a free consultation, send a message' },
  { label: 'Client Portal', path: '/portal', desc: 'View your cases and immigration status' },
  { label: 'Green Card Renewal (I-90)', path: '/services/immigration', desc: '$715 total — service + USCIS fee' },
  { label: 'Citizenship Application (N-400)', path: '/services/immigration', desc: '$1,310 total — service + USCIS fee' },
  { label: 'Marriage Green Card Bundle', path: '/services/immigration', desc: 'I-130 + I-485 + I-765 + I-131 + I-864 = $3,200' },
  { label: 'Work Permit / EAD (I-765)', path: '/services/immigration', desc: '$770 total' },
  { label: 'LLC Setup', path: '/services/tax', desc: 'Full package $300–$500 + state fee' },
  { label: 'Individual Tax Preparation', path: '/services/tax', desc: 'Simple $150–$250, Complex $250–$400' },
  { label: 'Privacy Policy', path: '/privacy-policy', desc: 'Privacy policy and data usage' },
  { label: 'Terms of Service', path: '/terms-of-service', desc: 'Terms and conditions' },
];

export default function Navbar({ t, lang, toggleLang }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    db.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [location]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  // Close search when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navLinks = [
    { to: "/", label: t('nav_home') },
    { to: "/services", label: t('nav_services') },
    { to: "/about", label: t('nav_about') },
    { to: "/blog", label: t('nav_blog') },
    { to: "/contact", label: t('nav_contact') },
  ];

  const isActive = (path) => location.pathname === path;

  const results = query.trim().length > 1
    ? SEARCH_INDEX.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  return (
    <>
      {/* Animated underline styles */}
      <style>{`
        .nav-link-animated {
          position: relative;
          padding-bottom: 2px;
        }
        .nav-link-animated::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0%;
          height: 2px;
          background-color: hsl(174 54% 36%);
          border-radius: 99px;
          transition: width 0.3s ease-in-out;
        }
        .nav-link-animated:hover::after,
        .nav-link-animated.active-link::after {
          width: 100%;
        }
      `}</style>

      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-charcoal text-lg tracking-tight">MANNA</span>
                <span className="text-silver text-xs block -mt-1 tracking-widest">ONE SOLUTION</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link-animated text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-primary active-link'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Language toggle */}
              <button
                onClick={toggleLang}
                className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold tracking-wide transition-transform hover:scale-105"
              >
                {lang === 'en' ? 'VI' : 'EN'}
              </button>

              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Client Login (shown when not logged in) */}
              {!currentUser && (
                <button
                  onClick={() => db.auth.redirectToLogin()}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="text-xs">Client Login</span>
                </button>
              )}

              {/* Portal (when logged in) */}
              {currentUser && (
                <Link to="/portal" className="hidden sm:block">
                  <Button size="sm" variant="outline" className="rounded-full px-4 gap-1.5 text-xs">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    {t('nav_portal')}
                  </Button>
                </Link>
              )}

              {/* Admin */}
              {currentUser?.role === 'admin' && (
                <Link to="/admin" className="hidden sm:block">
                  <Button size="sm" variant="outline" className="rounded-full px-4 gap-1.5 text-xs border-primary text-primary">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Button>
                </Link>
              )}

              {/* Book CTA */}
              <Link to="/contact" className="hidden sm:block">
                <Button size="sm" className="bg-primary hover:bg-teal-dark text-white rounded-full px-5">
                  {t('nav_book')}
                </Button>
              </Link>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-border animate-in slide-in-from-top-2">
            <nav className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.to) ? 'text-primary bg-teal-light' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {!currentUser && (
                <button
                  onClick={() => db.auth.redirectToLogin()}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  <LogIn className="h-4 w-4" />
                  Client Login
                </button>
              )}
              <Link to="/contact" className="block">
                <Button className="w-full mt-2 bg-primary hover:bg-teal-dark text-white rounded-full">
                  {t('nav_book')}
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
          <div ref={searchRef} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search services, immigration forms, topics…"
                className="flex-1 text-sm outline-none bg-transparent text-charcoal placeholder:text-muted-foreground"
              />
              <button onClick={() => setSearchOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="py-2 max-h-72 overflow-y-auto">
                {results.map((item, i) => (
                  <li key={i}>
                    <Link
                      to={item.path}
                      className="flex items-center justify-between px-4 py-3 hover:bg-teal-light group transition-colors"
                      onClick={() => setSearchOpen(false)}
                    >
                      <div>
                        <p className="text-sm font-medium text-charcoal group-hover:text-primary">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : query.trim().length > 1 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No results for "<strong>{query}</strong>"</p>
            ) : (
              <div className="px-4 py-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Popular</p>
                <div className="flex flex-wrap gap-2">
                  {['Green Card', 'N-400', 'Tax Filing', 'LLC Setup', 'Insurance', 'Contact'].map(s => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="px-3 py-1 rounded-full bg-teal-light text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}