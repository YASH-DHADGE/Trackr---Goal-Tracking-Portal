import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Target, LogOut, LayoutDashboard, Users, Shield, ChevronRight } from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/employee/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'My Goals',       roles: ['employee'] },
  { to: '/manager/dashboard',  icon: <Users className="w-5 h-5" />,          label: 'Team Review',    roles: ['manager', 'admin'] },
  { to: '/admin/dashboard',    icon: <Shield className="w-5 h-5" />,          label: 'Admin Panel',    roles: ['admin'] },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="glass sticky top-0 z-50 px-6 py-3.5 flex justify-between items-center shadow-sm border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-2 rounded-lg shadow-sm">
            <Target className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-brand-600 to-teal-700 bg-clip-text text-transparent">
            Trackr
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* User pill */}
          <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
              <p className="text-xs text-slate-400 capitalize leading-tight">{role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 glass hidden md:flex flex-col border-r border-slate-200/60 shrink-0">
          {/* User info block */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{displayName}</p>
                <p className="text-xs text-slate-400 capitalize">{role}</p>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 pt-1">Navigation</p>

            {visibleNav.map(item => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-200'
                      : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              );
            })}
          </nav>

          {/* Logout at bottom */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
