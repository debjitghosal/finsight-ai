import { useState, useEffect } from 'react';
import { BarChart3, Loader2, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FloatingChatbot from '../components/FloatingChatbot';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];

export default function AnalyticsPage() {
  const [reports, setReports] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState('revenue');
  const [isAutoCycling, setIsAutoCycling] = useState(true);
  const metrics = ['revenue', 'netProfit', 'ebitda'];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/reports/');
        const done = res.data.filter(r => r.status === 'done');
        setReports(done);
      } catch (err) {
        setError('Failed to load reports');
      }
    };
    fetchReports();
  }, []);

  useEffect(() => {
    if (!isAutoCycling || !analyticsData) return;

    const interval = setInterval(() => {
      setActiveMetric(current => {
        const nextIndex = (metrics.indexOf(current) + 1) % metrics.length;
        return metrics[nextIndex];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoCycling, analyticsData]);

  const handleManualMetricSelect = (metric) => {
    setActiveMetric(metric);
    setIsAutoCycling(false);
    // Pause auto-cycle for 20 seconds
    const timeout = setTimeout(() => setIsAutoCycling(true), 20000);
    return () => clearTimeout(timeout);
  };

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length >= 10) {
        alert("Maximum of 10 reports can be compared simultaneously.");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (selectedIds.length < 1) {
      setError('Please select at least 1 report to generate analytics.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalyticsData(null);

    try {
      const res = await api.post('/reports/analytics', {
        report_ids: selectedIds
      });
      setAnalyticsData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate analytics.');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-card)] border border-indigo-500/30 p-3 rounded-lg shadow-xl ring-1 ring-black/5">
          <p className="text-[var(--text-main)] font-black mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs font-black uppercase tracking-widest">
              {entry.name === 'revenue' && 'Revenue'}
              {entry.name === 'netProfit' && 'Net Profit'}
              {entry.name === 'ebitda' && 'EBITDA'}
              : {entry.value === 0.01 ? 'N/A' : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-primary-500/20">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">Financial Analytics</h1>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Select up to 10 reports to generate comparative visualizations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Selection */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5 sticky top-24">
            <h3 className="text-[var(--text-main)] font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> 
              Sourcing ({selectedIds.length}/10)
            </h3>
            
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {reports.map((r, i) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' 
                        : 'bg-[var(--bg-deep)] border-[var(--border-subtle)] hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isSelected 
                          ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]' 
                          : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                      }`}>
                        {isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-20" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-black tracking-tight ${isSelected ? 'text-indigo-500' : 'text-[var(--text-main)]'}`}>
                          {r.company_name || 'Report'}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1 opacity-60">FY {r.report_year || 'N/A'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {reports.length === 0 && (
                <p className="text-[var(--text-muted)] text-sm text-center py-4 italic">No completed reports available.</p>
              )}
            </div>

            <button 
              onClick={handleAnalyze} 
              disabled={selectedIds.length < 1 || loading}
              className="primary-btn w-full mt-8"
            >
              {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : 'Generate Intelligence'}
            </button>
            {error && <div className="mt-4 text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</div>}
          </div>
        </div>

        {/* Right Content: Charts and AI Insights */}
        <div className="lg:col-span-3 space-y-8">
          
          {loading && (
            <div className="glass-card p-16 flex flex-col items-center justify-center text-center h-[50vh]">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-6" />
              <h3 className="text-xl font-black text-[var(--text-main)] mb-2 tracking-tighter">Compiling Cohort Analytics</h3>
              <p className="text-[var(--text-muted)] font-bold max-w-md">
                Standardizing metrics across {selectedIds.length} reports and generating AI-driven market trends...
              </p>
            </div>
          )}

          {!analyticsData && !loading && (
            <div className="glass-card flex flex-col items-center justify-center text-center border-dashed border-2 border-[var(--border-subtle)] h-[50vh]">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-deep)] flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-[var(--text-muted)] opacity-20" />
              </div>
              <h3 className="text-lg font-black text-[var(--text-muted)] tracking-tighter uppercase">No Analytics Generated</h3>
              <p className="text-sm font-bold text-[var(--text-muted)] mt-2 max-w-sm">
                Select 1 to 10 reports and click Generate Intelligence to visualize trends.
              </p>
            </div>
          )}

          {analyticsData && !loading && (
            <>
              {/* Visualization Card */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tighter">Trend Visualization</h2>
                  <div className="flex bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl p-1 shadow-inner relative overflow-hidden group">
                    {metrics.map(metric => (
                      <button
                        key={metric}
                        onClick={() => handleManualMetricSelect(metric)}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all relative z-10 ${
                          activeMetric === metric ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {metric === 'revenue' ? 'Revenue' : metric === 'netProfit' ? 'Net Profit' : 'EBITDA'}
                      </button>
                    ))}
                    {isAutoCycling && (
                      <motion.div 
                        key={activeMetric}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 origin-left z-20 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      />
                    )}
                  </div>
                </div>

                <div className="h-96 w-full overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeMetric}
                      initial={{ opacity: 0, scale: 1.02, filter: 'blur(15px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 0.98, filter: 'blur(15px)' }}
                      transition={{ 
                        opacity: { duration: 0.4 },
                        filter: { duration: 0.4 },
                        scale: { type: "spring", stiffness: 100, damping: 20 }
                      }}
                      className="w-full h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.chart_data}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            stroke="#94a3b8" 
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            interval={0}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(value) => `${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                          <Bar 
                            dataKey={activeMetric} 
                            radius={[6, 6, 0, 0]}
                            animationDuration={1000}
                            maxBarSize={80}
                            minPointSize={5}
                          >
                            {analyticsData.chart_data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            <LabelList 
                              dataKey={activeMetric} 
                              position="top" 
                              formatter={(val) => val <= 0.02 ? 'N/A' : ''} 
                              fill="#94a3b8" 
                              fontSize={11} 
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* AI Comparison Card */}
              <div className="glass-card p-8 bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-deep)] border-t-4 border-t-indigo-500">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-6 mb-8">
                  <h2 className="text-xl font-black text-[var(--text-main)] tracking-tighter uppercase">AI Cohort Intelligence</h2>
                  <div className="text-[10px] font-black px-4 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20 shadow-sm uppercase tracking-widest">
                    Institutional Synthesis
                  </div>
                </div>
                <div className="prose prose-slate prose-bold max-w-none [data-theme='dark']:prose-invert">
                  <ReactMarkdown>{analyticsData.ai_comparison}</ReactMarkdown>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Chatbot for selected cohort */}
      <FloatingChatbot reportIds={selectedIds} />
    </div>
  );
}
