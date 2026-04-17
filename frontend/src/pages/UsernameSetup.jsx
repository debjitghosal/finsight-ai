import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { motion } from 'framer-motion';
import { User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function UsernameSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.email) {
      // Pre-fill with email prefix
      const prefix = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      setUsername(prefix);
    }
  }, [user]);

  if (!user) return <Navigate to="/login" />;
  if (user.username) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.length < 4) {
      setError('Protocol requires at least 4 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.patch('/auth/username', { username });
      // Update user in context
      setUser(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Handshake failed. Protocol mismatch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-lg p-10 relative z-10 border-[var(--border-subtle)]"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter mb-2">
            Establish Identity
          </h1>
          <p className="text-[var(--text-muted)] text-sm font-bold opacity-70">
            Welcome to the terminal, <span className="text-indigo-400">{user.full_name}</span>. <br/>
            Linked access: <span className="text-slate-300">{user.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black tracking-widest text-indigo-400 ml-1">
              Select Protocol Handle
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-lg">
                @
              </div>
              <input
                type="text"
                placeholder="handle_v1.0"
                className="glass-input w-full pl-10 pr-12 font-black text-lg tracking-tight"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                required
                autoFocus
                disabled={loading}
              />
              {username.length >= 4 && !error && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] italic ml-1">
              * Minimum 4 alphanumeric characters. This is your unique institutional ID.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs font-bold flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || username.length < 4}
            className="primary-btn w-full flex items-center justify-center gap-3 py-4 group"
          >
            {loading ? 'Committing...' : 'Initialize Protocol'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] uppercase font-black tracking-[0.3em] text-[var(--text-muted)] opacity-50">
            Institutional Encryption Secured
          </p>
        </div>
      </motion.div>

      {/* Decorative lines */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
    </div>
  );
}
