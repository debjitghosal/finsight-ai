import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, Loader2, AlertCircle, FileBarChart, CheckCircle2, Trash2, Folder, ChevronDown, ChevronUp, Pencil, X, Save } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({ company_name: '', report_year: '', ticker: '' });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchReports();
    // Poll every 5s for updates if any report is processing
    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports/');
      setReports(res.data);
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
    
    try {
      await api.delete(`/reports/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert("Failed to delete report.");
    }
  };

  const startEdit = (e, report) => {
    e.preventDefault();
    e.stopPropagation();
    let currentTicker = '';
    if (report.financial_data_json) {
      try {
        const data = JSON.parse(report.financial_data_json);
        currentTicker = data.ticker || '';
      } catch (e) {}
    }

    setEditForm({ 
      company_name: report.company_name || '', 
      report_year: report.report_year || '',
      ticker: currentTicker
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReport) return;
    
    setSaveLoading(true);
    try {
      await api.patch(`/reports/${editingReport.id}`, editForm);
      setReports(prev => prev.map(r => r.id === editingReport.id 
        ? { 
            ...r, 
            company_name: editForm.company_name, 
            report_year: editForm.report_year,
            financial_data_json: r.financial_data_json ? JSON.stringify({ ...JSON.parse(r.financial_data_json), ticker: editForm.ticker }) : JSON.stringify({ ticker: editForm.ticker })
          } 
        : r
      ));
      setEditingReport(null);
    } catch (err) {
      alert("Failed to update report details.");
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleFolder = (companyName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [companyName]: !prev[companyName]
    }));
  };

  const StatusBadge = ({ status }) => {
    if (status === 'done') {
      return <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>;
    }
    if (status === 'error') {
      return <span className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-md text-xs font-semibold border border-rose-400/20"><AlertCircle className="w-3.5 h-3.5" /> Error</span>;
    }
    if (status && status.startsWith('processing')) {
      return <span className="flex items-center gap-1.5 text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-md text-xs font-semibold border border-indigo-400/20"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing</span>;
    }
    return <span className="flex items-center gap-1.5 text-slate-400 bg-slate-400/10 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-400/20">Pending</span>;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Group reports by company
  const groupedReports = reports.reduce((acc, report) => {
    const name = report.company_name || 'Uncategorized';
    if (!acc[name]) acc[name] = [];
    acc[name].push(report);
    return acc;
  }, {});

  if (loading && !reports.length) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/30 animate-pulse"></div>
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 relative z-10" />
        </div>
        <p className="text-slate-400 font-medium tracking-wide">Initializing Command Center...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white flex flex-wrap items-center gap-3 tracking-tight mb-4">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 pb-1 pr-1">{user?.full_name?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl leading-relaxed">
            Your institutional-grade financial intelligence is ready. You have <span className="text-white font-semibold">{reports.filter(r => r.status === 'done').length}</span> documents actively analyzed in the command center.
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Link to="/upload" className="primary-btn inline-flex items-center gap-2 font-bold tracking-wide">
            <FileBarChart className="w-5 h-5" />
            New Analysis
          </Link>
        </motion.div>
      </div>

      {error ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 text-rose-400 p-4 rounded-xl border border-rose-500/20 flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </motion.div>
      ) : reports.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card text-center py-20 border-dashed border-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 z-0"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-5 bg-dark-900 rounded-full border border-white/5 shadow-2xl mb-6 group-hover:scale-110 transition-transform duration-500">
              <FileText className="w-12 h-12 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">No intelligence gathered yet</h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-8 text-sm md:text-base">
              Upload your first corporate proxy or annual report to forge immediate AI-driven data insights.
            </p>
            <Link to="/upload" className="primary-btn inline-block font-semibold">
              Deploy First Report
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedReports).map(([companyName, companyReports], index) => {
            const isExpanded = expandedFolders[companyName] || false;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4, delay: index * 0.1 }} 
                key={companyName} 
                className="glass-card overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-colors duration-500 relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                {/* Folder Header */}
                <div 
                  onClick={() => toggleFolder(companyName)}
                  className="flex items-center justify-between p-5 md:p-6 cursor-pointer bg-[var(--bg-surface)] hover:bg-[var(--glass-tint)] transition-all relative z-10"
                >
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl shadow-lg">
                      <Folder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[var(--text-main)]">{companyName}</h3>
                      <p className="text-sm font-bold text-indigo-500 mt-0.5">{companyReports.length} Document{companyReports.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-[var(--glass-tint)] border border-[var(--border-subtle)] group-hover:bg-indigo-500/20 transition-colors">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-indigo-500" />}
                  </div>
                </div>

                {/* Folder Contents */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/30 backdrop-blur-md"
                    >
                      <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {companyReports.map((report, idx) => (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} key={report.id}>
                            <Link to={`/report/${report.id}`} className="block group/card h-full">
                              <div className="glass-surface border-[var(--border-subtle)] hover:border-indigo-500/40 p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 h-full flex flex-col relative overflow-hidden backdrop-blur-md">
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="px-3 py-1.5 bg-[var(--bg-deep)] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-lg text-xs font-bold tracking-wider">
                                      FY {report.report_year || 'N/A'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 relative z-20">
                                    <StatusBadge status={report.status} />
                                    <button 
                                      onClick={(e) => startEdit(e, report)}
                                      className="p-1.5 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100 ring-1 ring-transparent hover:ring-indigo-500/30"
                                      title="Edit Report Details"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => handleDelete(e, report.id)}
                                      className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100 ring-1 ring-transparent hover:ring-rose-500/30"
                                      title="Delete Report"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm font-bold text-[var(--text-main)] mb-5 line-clamp-2 leading-relaxed relative z-10 group-hover/card:text-indigo-500 transition-colors">
                                  {report.file_name}
                                </p>
                                
                                <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-black uppercase tracking-widest text-indigo-500 group-hover/card:text-indigo-600 relative z-10">
                                  <span>{report.status === 'done' ? 'Access Intelligence' : 'Processing...'}</span>
                                  <ArrowRight className="w-4 h-4 transform group-hover/card:translate-x-1 transition-transform" />
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingReport(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-md bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-400" /> Edit Details
                </h3>
                <button onClick={() => setEditingReport(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    className="glass-input w-full bg-dark-800 border-white/10 focus:border-indigo-500"
                    placeholder="e.g. Swiggy Limited"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({...editForm, company_name: e.target.value})}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Stock Ticker / Symbol</label>
                  <input
                    type="text"
                    className="glass-input w-full bg-dark-800 border-white/10 focus:border-indigo-500"
                    placeholder="e.g. TCS, RELIANCE, TSLA"
                    value={editForm.ticker}
                    onChange={(e) => setEditForm({...editForm, ticker: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-500 mt-2 italic px-1">Required for Live Charts and Real-time Market News.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Financial Year</label>
                  <input
                    type="text"
                    className="glass-input w-full bg-dark-800 border-white/10 focus:border-indigo-500"
                    placeholder="e.g. 2024-25"
                    value={editForm.report_year}
                    onChange={(e) => setEditForm({...editForm, report_year: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-2">Editing the company name will automatically move the report into the correct folder.</p>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setEditingReport(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saveLoading} className="flex-1 primary-btn flex items-center justify-center gap-2 font-medium">
                    {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
