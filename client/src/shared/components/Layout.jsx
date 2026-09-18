import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  Zap,
  FolderGit2,
  History,
  LineChart,
  Settings,
  Shield,
  LogOut,
  LogIn,
  Activity,
  Database,
  Cpu,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { PATHS } from '../../router/routes';
import { useAuthStore } from '../../store/useAuthStore';
import { useEnergyStore } from '../../store/useEnergyStore';
import { checkHealth } from '../../api/energy.api';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isAdmin } = useAuthStore();
  const { loadPreset } = useEnergyStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState({
    api: 'online',
    database: 'connected',
    optimizer: 'ready',
    llm: 'available',
  });

  useEffect(() => {
    checkHealth()
      .then((res) => {
        if (res?.services) setHealth(res.services);
      })
      .catch(() => {
        setHealth({ api: 'offline', database: 'unknown', optimizer: 'ready', llm: 'offline' });
      });
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: PATHS.DASHBOARD, icon: LayoutDashboard },
    { label: 'Optimize Energy', path: PATHS.ENERGY_INPUT, icon: Zap },
    { label: 'Scenarios', path: PATHS.SCENARIOS, icon: FolderGit2 },
    { label: 'History', path: PATHS.HISTORY, icon: History },
    { label: 'Analytics', path: PATHS.ANALYTICS, icon: LineChart },
    { label: 'Settings', path: PATHS.SETTINGS, icon: Settings },
  ];

  if (isAdmin()) {
    navItems.push({ label: 'Admin Users', path: PATHS.ADMIN, icon: Shield });
  }

  const getPageTitle = () => {
    if (location.pathname === PATHS.DASHBOARD || location.pathname === PATHS.HOME) return 'Dashboard';
    if (location.pathname === PATHS.ENERGY_INPUT) return 'Optimize Energy';
    if (location.pathname.startsWith('/energy/result')) return 'Optimization Result';
    if (location.pathname === PATHS.SCENARIOS) return 'Energy Scenarios';
    if (location.pathname === PATHS.HISTORY) return 'Optimization History';
    if (location.pathname === PATHS.ANALYTICS) return 'Analytics & Trends';
    if (location.pathname === PATHS.SETTINGS) return 'System Settings';
    if (location.pathname === PATHS.ADMIN) return 'Admin Control Center';
    if (location.pathname === PATHS.LOGIN) return 'Sign In';
    if (location.pathname === PATHS.REGISTER) return 'Create Account';
    return 'GridWise';
  };

  const handleQuickDemo = () => {
    loadPreset('normal');
    navigate(PATHS.ENERGY_INPUT);
  };

  return (
    <div className="flex min-h-screen bg-[#080c14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d1526', color: '#fff', border: '1px solid #1e293b' } }} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800/80 bg-[#0a0f1d]/90 backdrop-blur-xl shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80">
          <Link to={PATHS.DASHBOARD} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
              </div>
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white flex items-center gap-1.5">
                GRIDWISE
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 block -mt-0.5">
                AI ENERGY PLATFORM
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === PATHS.DASHBOARD && location.pathname === PATHS.HOME) ||
              (item.path === PATHS.ENERGY_INPUT && location.pathname.startsWith('/energy/result'));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live System Diagnostics Box */}
        <div className="p-4 mx-3 mb-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-[11px] space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800/60 pb-1.5">
            <span className="uppercase tracking-wider text-[10px]">System Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> API Server
            </span>
            <span className="font-mono text-emerald-400 font-bold capitalize">{health.api}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> Neon Postgres
            </span>
            <span className="font-mono text-cyan-400 font-bold capitalize">{health.database}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Optimizer
            </span>
            <span className="font-mono text-indigo-400 font-bold capitalize">{health.optimizer}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> LLM Engine
            </span>
            <span className="font-mono text-amber-400 font-bold capitalize">Ready</span>
          </div>
        </div>

        {/* User Profile / Auth Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <span className="text-[10px] font-mono text-slate-400 capitalize">
                  Role: <span className="text-emerald-400 font-bold">{user.role}</span>
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                to={PATHS.LOGIN}
                className="flex-1 py-2 text-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-all flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
              <Link
                to={PATHS.REGISTER}
                className="flex-1 py-2 text-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-all"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-[#0a0f1d]/80 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>GRIDWISE</span>
                <span>/</span>
                <span className="text-emerald-400">{getPageTitle()}</span>
              </div>
              <h1 className="text-base lg:text-lg font-bold text-white tracking-tight -mt-0.5">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Load Demo Scenario
            </button>
            <Link
              to={PATHS.ENERGY_INPUT}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              Optimize Energy
            </Link>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md pt-16 px-4">
            <nav className="space-y-2 mt-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-white"
                >
                  <item.icon className="w-5 h-5 text-emerald-400" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 py-4 px-8 text-center text-xs text-slate-500 flex flex-wrap justify-between items-center gap-4">
          <p>⚡ GRIDWISE AI Energy Optimization Platform — Commercial Edition 2026</p>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Neon DB Connected
            </span>
            <span>v2.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
