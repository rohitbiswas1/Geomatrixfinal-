'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  BrainCircuit,
  Database,
  FileText,
  LayoutDashboard,
  Map,
  Search,
  ShieldCheck,
  Users,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Clock,
  ChevronDown,
  Cpu
} from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

const ROLES = [
  { id: 'national', label: 'National Administrator', scope: 'All states & districts' },
  { id: 'state', label: 'State Officer', scope: 'West Bengal' },
  { id: 'district', label: 'District Officer', scope: 'Malda district' },
  { id: 'project', label: 'Project Officer', scope: 'Assigned projects' },
  { id: 'auditor', label: 'Auditor / Read-only', scope: 'Read-only access' },
] as const;
type RoleId = typeof ROLES[number]['id'];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [roleId, setRoleId] = useState<RoleId>('national');
  const [roleOpen, setRoleOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ role?: string; email?: string } | null>(null);

  const login = path === '/login';

  // Auth check + user info
  useEffect(() => {
    if (!login && !sessionStorage.getItem('geomatrix-auth')) {
      router.replace('/login');
    }
    const auth = sessionStorage.getItem('geomatrix-auth');
    if (auth) {
      try { setUserInfo(JSON.parse(auth)); } catch { /* ignore */ }
    }
  }, [login, router]);

  // Restore saved role
  useEffect(() => {
    const savedRole = sessionStorage.getItem('geomatrix-role') as RoleId | null;
    if (savedRole && ROLES.find(r => r.id === savedRole)) setRoleId(savedRole);
  }, []);

  function switchRole(id: RoleId) {
    setRoleId(id);
    setRoleOpen(false);
    sessionStorage.setItem('geomatrix-role', id);
  }

  // Theme synchronization - default to light
  useEffect(() => {
    const saved = localStorage.getItem('geomatrix-theme') as ThemeMode | null;
    if (saved) {
      setThemeMode(saved);
    } else {
      setThemeMode('light');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('geomatrix-theme', themeMode);
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const active = themeMode === 'system' ? (media.matches ? 'dark' : 'light') : themeMode;
      document.documentElement.setAttribute('data-theme', active);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [themeMode]);

  if (login) return <>{children}</>;

  const logout = () => {
    sessionStorage.removeItem('geomatrix-auth');
    router.replace('/login');
  };

  const nav = [
    ['/dashboard', 'Command Center', LayoutDashboard],
    ['/projects', 'Projects', Users],
    ['/map', 'GIS Risk Map', Map],
    ['/alerts', 'Alerts', Bell],
    ['/analytics', 'Analytics', BrainCircuit],
    ['/reports', 'Reports', FileText],
    ['/data', 'Data Management', Database],
    ['/model', 'Model Intelligence', Cpu],
  ] as const;

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && q.trim()) {
      router.push('/projects?search=' + encodeURIComponent(q.trim()));
    }
  };

  const sectionName =
    path === '/dashboard'
      ? 'Command Center'
      : path.split('/')[1]?.charAt(0).toUpperCase() + path.split('/')[1]?.slice(1) || 'Dashboard';

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandmark">
            <Map size={19} />
          </div>
          <div>
            <b>GEOMATRIX</b>
            <small>LAND ACQUISITION AI</small>
          </div>
        </div>

        <nav className="nav">
          {nav.map(([href, label, Icon]) => {
            const isActive = path.startsWith(href);
            return (
              <Link key={href} href={href} className={isActive ? 'active' : ''}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebottom">
          {/* Role Switcher */}
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <button
              onClick={() => setRoleOpen(o => !o)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6, padding: '8px 10px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: 13
              }}
            >
              <span>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 1 }}>
                  {ROLES.find(r => r.id === roleId)?.label}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{ROLES.find(r => r.id === roleId)?.scope}</div>
              </span>
              <ChevronDown size={13} style={{ transform: roleOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>
            {roleOpen && (
              <div style={{ position: 'absolute', bottom: '105%', left: 0, right: 0, background: 'var(--navy-mid,#0b2547)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => switchRole(r.id)} style={{
                    width: '100%', textAlign: 'left', padding: '9px 12px', background: r.id === roleId ? 'rgba(37,99,235,0.2)' : 'transparent',
                    border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', color: r.id === roleId ? '#60a5fa' : '#94a3b8',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.85 }}>{r.scope}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="userline">
            <div>
              <b style={{ fontSize: 13 }}>{userInfo?.role || 'Administrator'}</b>
              <div className="role">{userInfo?.email || 'Prototype account'}</div>
            </div>
            <ShieldCheck size={16} color="#60a5fa" />
          </div>
          <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={logout}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            GovTech Decision Support / <strong>{sectionName}</strong>
          </div>

          <div className="search">
            <Search className="search-icon" size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Search project code, name, district, or agency…"
              aria-label="Search projects"
            />
            <span className="search-kbd">↵ Enter</span>
          </div>

          <div className="topright">
            <div className="status-badge" title="Automated pipeline active">
              <span className="pulse-dot" />
              <span>System Operational</span>
            </div>

            <div className="topbar-date">
              <Clock size={13} />
              <span>07 Sep 2026 · 20:45 IST</span>
            </div>

            <button
              className="topbar-icon-btn"
              title="5 Priority Alerts"
              onClick={() => router.push('/alerts')}
              aria-label="View alerts"
            >
              <Bell size={15} />
              <span className="topbar-badge">5</span>
            </button>

            <div className="theme-switch-group" role="radiogroup" aria-label="Theme selector">
              <button
                type="button"
                className={`theme-switch-btn ${themeMode === 'light' ? 'active' : ''}`}
                onClick={() => setThemeMode('light')}
                title="Light mode"
                aria-checked={themeMode === 'light'}
              >
                <Sun size={13} />
              </button>
              <button
                type="button"
                className={`theme-switch-btn ${themeMode === 'dark' ? 'active' : ''}`}
                onClick={() => setThemeMode('dark')}
                title="Dark mode"
                aria-checked={themeMode === 'dark'}
              >
                <Moon size={13} />
              </button>
              <button
                type="button"
                className={`theme-switch-btn ${themeMode === 'system' ? 'active' : ''}`}
                onClick={() => setThemeMode('system')}
                title="Follow system theme"
                aria-checked={themeMode === 'system'}
              >
                <Laptop size={13} />
              </button>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
