import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Mic2, 
  Search, 
  TrendingUp, 
  ArrowRight,
  Globe,
  Database,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  // Redirect to dashboard if already logged in
  if (user) {
    return <Navigate to="/" />;
  }

  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-indigo-400" />,
      title: "Advanced AI Extraction",
      description: "Deep-parse complex annual reports and proxies with Gemini-Pro models. We extract the signal from the noise."
    },
    {
      icon: <Mic2 className="w-6 h-6 text-purple-400" />,
      title: "Voice-Powered Research",
      description: "Query institutional data using natural voice search. Hands-free financial analysis powered by Web Speech API."
    },
    {
      icon: <Globe className="w-6 h-6 text-blue-400" />,
      title: "Fortuna Global Memory",
      description: "Our 'Fortuna' assistant remembers insights across all your uploaded reports for cross-company trends."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-emerald-400" />,
      title: "Visual Intelligence",
      description: "Interactive charts and live market data integration for a comprehensive view of company performance."
    },
    {
      icon: <Database className="w-6 h-6 text-amber-400" />,
      title: "Institutional Ledger",
      description: "Organize hundreds of PDF reports into a clean, searchable database with automatic company detection."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: "Bank-Grade Encryption",
      description: "Your financial data is encrypted and secure. We focus on privacy and institutional reliability."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-deep)] text-white">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-indigo-600/10 blur-[180px] rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-purple-600/10 blur-[180px] rounded-full translate-y-1/4 -translate-x-1/4" />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-40 md:pb-32 px-4 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold mb-8 shadow-xl shadow-indigo-500/5">
            <Zap className="w-4 h-4 animate-pulse" />
            <span className="uppercase tracking-widest">Next-Gen Financial Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none mb-8">
            Analyze Reports <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400">
              at Lightning Speed.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl leading-relaxed mb-12">
            FinSight AI transforms dense corporate PDF reports into actionable insights, visual charts, and searchable intelligence using state-of-the-art Generative AI.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/login" className="primary-btn px-10 py-5 text-lg font-bold flex items-center gap-3 group">
              Start Building Intelligence
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-4 text-slate-500 font-medium">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg-deep)] bg-dark-800 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                ))}
              </div>
              <span>Trusted by analysts worldwide</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="relative py-24 px-4 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Institutional Power, Simplified.</h2>
          <p className="text-slate-500 uppercase tracking-[0.2em] font-black text-xs">Everything you need to dominate the markets</p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              className="glass-card p-8 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
              <div className="relative z-10">
                <div className="p-4 bg-dark-900 rounded-2xl border border-white/5 w-fit mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto glass-card p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 opacity-40" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter">Ready to evolve your analysis?</h2>
            <p className="text-indigo-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-80">
              Join the new era of financial research. Fully automated, incredibly fast, and powered by the world's best AI.
            </p>
            <Link to="/login" className="bg-white text-dark-950 hover:bg-slate-200 px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 inline-block">
              Deploy FinSight AI
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-slate-600 text-sm font-medium">
        <p>© {new Date().getFullYear()} FinSight AI Enterprise. Built for high-performance financial research.</p>
      </footer>
    </div>
  );
}
