import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileBarChart, LayoutDashboard, GitCompare, LogOut, Upload, Sparkles, 
  User, Settings, Shield, Bell, Moon, Sun, ChevronRight, ArrowLeft, X, Lock, Fingerprint, ShieldCheck
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalChatbot from './GlobalChatbot';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'settings', 'privacy'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [settings, setSettings] = useState({
    notifications: true,
    aiOptimization: true,
    marketFeed: false
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Remove the block that returns null if user is not present
  // if (!user) return null;

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload', path: '/upload', icon: Upload },
    { name: 'Compare', path: '/compare', icon: GitCompare },
  ];

  const Modal = ({ title, icon: Icon, children, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md max-h-[90vh] glass-card border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-card)] shadow-2xl flex flex-col"
      >
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group">
                <ArrowLeft className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Icon className="w-4 h-4 text-indigo-500" />
                </div>
                <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest uppercase">{title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {children}
          </div>
          <div className="mt-12 pt-8 border-t border-[var(--border-subtle)] text-center">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">FinSight Security Ops Center</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)] backdrop-blur-md border-b border-[var(--border-subtle)] shadow-2xl transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center p-1.5 rounded-xl shadow-lg border border-white/20 bg-gradient-to-tr from-indigo-600/20 to-purple-600/20">
                 <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-5 h-5 object-contain filter drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]" 
                />
              </div>
              <span className="font-black text-xl md:text-2xl font-display tracking-tighter text-[var(--text-main)]">
                FinSight<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">.ai</span>
              </span>
            </Link>

            {user ? (
              <>
                <div className="hidden lg:flex items-center space-x-1">
                  {links.map((link) => (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        location.pathname === link.path
                          ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-indigo-500/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <link.icon className={`w-4 h-4 ${location.pathname === link.path ? 'text-indigo-500' : ''}`} />
                      {link.name}
                    </Link>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsBotOpen(!isBotOpen)}
                    className={`p-2.5 rounded-xl transition-all border shadow-sm flex items-center gap-2 ${
                      isBotOpen 
                        ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/50' 
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-indigo-500/10 hover:text-indigo-500 hover:border-indigo-500/30'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 transition-transform group-hover:rotate-12" />
                    <span className="hidden sm:inline text-xs font-bold">Fortuna AI</span>
                  </button>

                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsAccountOpen(!isAccountOpen)}
                      className={`flex items-center gap-2 p-1.5 pr-3 rounded-2xl transition-all border ${
                        isAccountOpen ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow-lg">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="hidden sm:block text-xs font-black text-[var(--text-main)] tracking-tight">
                        {user.full_name?.split(' ')[0]}
                      </span>
                    </button>

                    {isAccountOpen && (
                      <div className="absolute right-0 mt-3 w-64 glass-card border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden origin-top-right animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-[var(--border-subtle)]">
                          <div className="font-black text-[var(--text-main)] text-base leading-tight">{user.full_name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1">{user.email}</div>
                        </div>

                        <div className="p-2 space-y-0.5">
                          <button onClick={() => { setActiveModal('profile'); setIsAccountOpen(false); }} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-indigo-500/10 text-[var(--text-main)] transition-all group border border-transparent hover:border-indigo-500/20">
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-indigo-500" />
                              <span className="text-sm font-bold">My Profile</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-indigo-500" />
                          </button>
                          <button onClick={() => { setActiveModal('settings'); setIsAccountOpen(false); }} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-emerald-500/10 text-[var(--text-main)] transition-all group border border-transparent hover:border-emerald-500/20">
                            <div className="flex items-center gap-3">
                              <Settings className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-bold">Settings</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-500" />
                          </button>
                          <button onClick={() => { setActiveModal('privacy'); setIsAccountOpen(false); }} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-amber-500/10 text-[var(--text-main)] transition-all group border border-transparent hover:border-amber-500/20">
                            <div className="flex items-center gap-3">
                              <Shield className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-bold">Privacy</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500" />
                          </button>
                        </div>

                        <div className="p-3 bg-white/[0.02] border-t border-white/5 flex flex-col gap-2">
                          <div className="flex items-center justify-between p-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Appearance</span>
                            <button 
                              onClick={toggleTheme}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-indigo-500/50 transition-all shadow-sm"
                            >
                              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                              <span className="text-[10px] font-black uppercase text-[var(--text-main)]">{theme}</span>
                            </button>
                          </div>

                          <button 
                            onClick={logout}
                            className="flex items-center justify-center gap-2 w-full p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-sm font-bold transition-all border border-rose-500/20"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-black text-[var(--text-muted)] hover:text-white transition-colors tracking-widest uppercase">
                  Login
                </Link>
                <Link to="/login" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                  Join FinSight
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <GlobalChatbot isOpen={isBotOpen} setIsOpen={setIsBotOpen} />

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'profile' && (
          <Modal title="Institutional Profile" icon={User} onClose={() => setActiveModal(null)}>
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-6 glass-surface rounded-2xl border-indigo-500/20">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text-main)]">{user.full_name}</h3>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Tier: Institutional Access</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Account Email</p>
                  <p className="text-sm font-black text-[var(--text-main)] tracking-tight">{user.email}</p>
                </div>
                <div className="p-4 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Status</p>
                  <p className="text-sm font-bold text-emerald-500">Verified Protocol</p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'settings' && (
          <Modal title="System Configuration" icon={Settings} onClose={() => setActiveModal(null)}>
            <div className="space-y-4">
              {[
                { id: 'notifications', name: 'Push Notifications', active: settings.notifications, desc: 'Real-time extraction alerts' },
                { id: 'aiOptimization', name: 'AI Optimization', active: settings.aiOptimization, desc: 'Highest precision mode' },
                { id: 'marketFeed', name: 'Market Feed', active: settings.marketFeed, desc: 'Global indexing' }
              ].map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setSettings(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                  className="w-full flex justify-between items-center p-5 glass-surface hover:bg-indigo-500/5 transition-all mb-4 text-left border border-white/5"
                >
                  <div className="flex-1">
                    <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tighter">{s.name}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">{s.desc}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${s.active ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${s.active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === 'privacy' && (
          <Modal title="Privacy & Data Integrity" icon={Shield} onClose={() => setActiveModal(null)}>
            <div className="space-y-8">
              <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-2xl border border-indigo-500/20">
                <p className="text-lg font-bold text-[var(--text-main)] leading-relaxed italic tracking-tight">
                  "Institutional Data Protection is our operational standard. We prioritize the absolute integrity of your financial intelligence. All reports are processed through end-to-end encrypted channels with zero third-party disclosure."
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-4 p-4 hover:bg-white/5 rounded-xl transition-all">
                  <Lock className="w-5 h-5 text-indigo-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tighter">AES-256 Storage</h4>
                    <p className="text-xs font-bold text-[var(--text-muted)] mt-1">Intelligence is encrypted at rest and in transit.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 hover:bg-white/5 rounded-xl transition-all">
                  <Fingerprint className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tighter">Zero-Leak Policy</h4>
                    <p className="text-xs font-bold text-[var(--text-muted)] mt-1">No data harvesting for secondary model training.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 hover:bg-white/5 rounded-xl transition-all">
                  <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tighter">Privacy Compliance</h4>
                    <p className="text-xs font-bold text-[var(--text-muted)] mt-1">Adhering to global institutional security protocols.</p>
                  </div>
                </div>
              </div>
              
              </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
