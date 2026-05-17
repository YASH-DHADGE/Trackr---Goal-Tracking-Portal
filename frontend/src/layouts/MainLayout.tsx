import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, Shield, ChevronRight, Menu, X, Moon, Sun, User, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Chatbot } from '../components/Chatbot';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/employee/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'My Goals',       roles: ['employee'] },
  { to: '/manager/dashboard',  icon: <Users className="w-5 h-5" />,          label: 'Team Review',    roles: ['manager', 'admin'] },
  { to: '/manager/dashboard?tab=q1', icon: <Bell className="w-5 h-5" />,   label: 'Check-in Review', roles: ['manager', 'admin'] },
  { to: '/manager/dashboard?tab=planned_vs_actual', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Analytics', roles: ['manager', 'admin'] },
  { to: '/admin/dashboard',    icon: <Shield className="w-5 h-5" />,          label: 'Admin Panel',    roles: ['admin'] },
  { to: '/profile',            icon: <User className="w-5 h-5" />,           label: 'My Profile',      roles: ['employee', 'manager', 'admin'] },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleDarkMode = () => setIsDark(!isDark);
  const role = localStorage.getItem('role') || 'employee';
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = storedUser.full_name || storedUser.email || role;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const visibleNav = navItems.filter(item => item.roles.includes(role));

  const isLinkActive = (to: string) => {
    const [path, search] = to.split('?');
    if (search) {
      return location.pathname === path && location.search.includes(search);
    }
    // For base paths, only match if search is empty or if it's the exact path
    return location.pathname === path && (location.search === '' || !navItems.some(ni => ni.to.startsWith(path + '?')));
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Top Navbar */}
      <header className="glass sticky top-0 z-[60] px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl md:hidden transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg shadow-brand-500/10 group-hover:scale-105 transition-transform duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <img src="/logo.png" alt="Trackr Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent hidden xs:block">
              Trackr
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

          {/* User pill */}
          <Link to="/profile" className="flex items-center gap-3 bg-white dark:bg-slate-900/40 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 hover:border-brand-400 dark:hover:border-brand-500/50 shadow-sm transition-all group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:rotate-3 transition-transform">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[120px]">{displayName}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tighter leading-tight">{role}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors ml-1"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Menu Backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-40 md:hidden transition-all duration-300 animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Sidebar / Mobile Drawer */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 w-72 glass-side z-50 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto mt-2">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">Menu Navigation</p>

            {visibleNav.map(item => {
              const active = isLinkActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 group ${
                    active
                      ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/20'
                      : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400'} transition-colors`}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 opacity-50" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Info */}
          <div className="p-6 mt-auto">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
               <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">System Status</p>
               <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected to Cloud
               </div>
            </div>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto transition-all duration-300">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-8 overflow-x-auto whitespace-nowrap no-scrollbar">
              <Link to="/" className="hover:text-brand-600 transition-colors">Portal</Link>
              {location.pathname.split('/').filter(Boolean).map((part, i, arr) => (
                <div key={part} className="flex items-center gap-2">
                  <span className="opacity-30">/</span>
                  <span className={i === arr.length - 1 ? 'text-slate-600 dark:text-slate-400' : 'hover:text-brand-600 transition-colors'}>
                    {part.replace(/-/g, ' ')}
                  </span>
                </div>
              ))}
            </nav>
            
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Trackr AI Assistant Chatbot */}
      <Chatbot />
    </div>
  );
};

export default MainLayout;
