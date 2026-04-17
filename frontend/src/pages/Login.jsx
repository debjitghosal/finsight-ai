import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const { login, register, googleLogin, user } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    if (!user.username) return <Navigate to="/setup-username" />;
    return <Navigate to="/dashboard" />;
  }

  const switchToRegister = (prefillEmail = '') => {
    setIsLogin(false);
    if (prefillEmail) setEmail(prefillEmail);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/');
      } else {
        if (username.length < 4) {
          setError('Handle must be at least 4 characters.');
          setLoading(false);
          return;
        }
        await register(name, email, password, username);
        navigate('/');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || '';

      if (detail === 'NO_ACCOUNT_FOUND') {
        // Auto-switch to register with the email pre-filled
        switchToRegister(email);
        setError('No account found for this email. Create one below.');
      } else if (detail === 'WRONG_PASSWORD') {
        setError('Incorrect password. Please try again.');
      } else if (detail === 'Email already registered') {
        setIsLogin(true);
        setError('This email already has an account. Please sign in.');
      } else {
        setError(detail || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-10 relative z-10 shadow-2xl border-[var(--border-subtle)]"
      >
        {/* Logo & Title */}
        <div className="text-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center justify-center p-3 rounded-[2rem] shadow-2xl border border-white/20 bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 backdrop-blur-md mb-6 mx-auto"
            >
              <img 
                src="/logo.png" 
                alt="FinSight Logo" 
                className="w-16 h-16 object-contain filter drop-shadow-[0_0_15px_rgba(79,70,229,0.5)]" 
              />
            </motion.div>
          <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tighter mb-2">
            FinSight<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">.ai</span>
          </h1>
          <p className="text-[var(--text-muted)] font-black uppercase tracking-[0.2em] text-[10px] opacity-60">
            Institutional Protocol
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-xl p-1 mb-8 border border-[var(--border-subtle)]">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            Register
          </button>
        </div>

        {/* Google Login */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-center transition-transform hover:scale-[1.02] active:scale-95">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  const data = await googleLogin(credentialResponse.credential);
                  if (data?.onboarding_required) {
                    navigate('/setup-username');
                  } else {
                    navigate('/');
                  }
                } catch {
                  setError('Google Authentication Failed. Please try again.');
                }
              }}
              onError={() => setError('Authentication Protocol Failed')}
              theme="filled_blue"
              shape="pill"
              size="large"
              text="continue_with"
              width="100%"
            />
          </div>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-[var(--bg-card)] px-3 text-[var(--text-muted)]">Or continue with email</span>
            </div>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl mb-6 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="Full Name"
                  className="glass-input w-full font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-black text-lg pointer-events-none">@</span>
                  <input
                    type="text"
                    placeholder="Choose a handle (min 4 chars)"
                    className="glass-input w-full font-bold pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    required={!isLogin}
                    minLength={4}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            placeholder="Email Address"
            className="glass-input w-full font-bold"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Private Password"
              className="glass-input w-full pr-10 font-bold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-btn w-full mt-6"
          >
            {loading
              ? 'Authenticating...'
              : isLogin
                ? 'Access Intelligence'
                : 'Initialize Protocol'}
          </button>
        </form>

        <div className="mt-8 text-center text-[var(--text-muted)] font-bold text-sm">
          {isLogin ? 'New to the platform? ' : 'Access established? '}
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-indigo-400 hover:text-indigo-300 font-black transition-colors"
          >
            {isLogin ? 'Initialize System' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
