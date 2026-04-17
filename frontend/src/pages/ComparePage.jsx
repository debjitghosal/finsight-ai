import { useState, useEffect } from 'react';
import { GitCompare, Loader2, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import api from '../api';
import FloatingChatbot from '../components/FloatingChatbot';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'];

export default function ComparePage() {
  const [reports, setReports] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState('revenue');

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

  const handleCompare = async (e) => {
    e.preventDefault();
    if (selectedIds.length < 2) {
      setError('Please select at least 2 reports to generate a comparison.');
      return;
    }

    setLoading(true);
    setError('');
    setComparison('');
    setChartData(null);

    try {
      const res = await api.post('/reports/analytics', {
        report_ids: selectedIds
      });
      if (res.data.ai_comparison && res.data.ai_comparison.trim() !== '') {
        setComparison(res.data.ai_comparison);
        setChartData(res.data.chart_data);
      } else {
        setComparison('');
        setChartData(null);
        setError('Comparison analysis could not be generated (possible API overload). Please try again with fewer reports or wait a moment.');
      }
    } catch (err) {
      setError('Failed to generate comparison. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-800 border border-indigo-500/30 p-3 rounded-lg shadow-xl shadow-black/50">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name === 'revenue' && 'Revenue'}
              {entry.name === 'netProfit' && 'Net Profit'}
              {entry.name === 'ebitda' && 'EBITDA'}
              : {entry.value === 0.01 ? 'Not disclosed in report' : entry.value.toLocaleString()}
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
          <GitCompare className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">Compare Annual Reports</h1>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Select between 2 to 10 reports for a multi-year AI comparative analysis</p>
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
            </div>

            <button 
              onClick={handleCompare} 
              disabled={selectedIds.length < 2 || loading}
              className="primary-btn w-full mt-8"
            >
              {loading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Compiling...</> : 'Deploy Comparison'}
            </button>
            {error && <div className="mt-4 text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</div>}
          </div>
        </div>

        {/* Right Content: Comparison Result */}
        <div className="lg:col-span-3">
          {loading && (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-indigo-500/30">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
              <h3 className="text-lg font-black text-[var(--text-main)] tracking-tighter">Running Comparative Intelligence</h3>
              <p className="text-sm font-bold text-[var(--text-muted)] mt-2 max-w-sm">
                FinSight AI is analyzing the differences across {selectedIds.length} reports simultaneously...
              </p>
            </div>
          )}

          {!comparison && !loading && (
            <div className="glass-card flex flex-col items-center justify-center text-center border-dashed border-2 border-white/5 h-[50vh]">
              <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4">
                <GitCompare className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-300">Cohort Comparison Pending</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                Select between 2 and 10 reports and generate a comparison to see contextual AI insights.
              </p>
            </div>
          )}

          {comparison && !loading && (
            <div className="space-y-8">
              {/* Text Comparison (Top for Compare Page) */}
              <div className="glass-card p-8 bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-deep)] border-t-4 border-t-indigo-500">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-6 mb-8">
                  <h2 className="text-xl font-black text-[var(--text-main)] tracking-tighter uppercase">Multi-Report Synthesis</h2>
                  <div className="text-[10px] font-black px-4 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20 shadow-sm uppercase tracking-widest">
                    AI Perspective
                  </div>
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none text-[var(--text-main)] font-medium prose-p:text-[var(--text-main)] prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-li:text-[var(--text-main)] prose-p:leading-relaxed prose-headings:font-black">
                  <ReactMarkdown>{comparison}</ReactMarkdown>
                </div>
              </div>

              {/* Graphical Analysis (Bottom for Compare Page) */}
              {chartData && (
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tighter">Cross-Report Visualization</h2>
                    <div className="flex bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-xl p-1 shadow-inner">
                      {['revenue', 'netProfit', 'ebitda'].map(metric => (
                        <button
                          key={metric}
                          onClick={() => setActiveMetric(metric)}
                          className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                            activeMetric === metric ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {metric === 'revenue' ? 'Revenue' : metric === 'netProfit' ? 'Net Profit' : 'EBITDA'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
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
                          animationDuration={1500}
                          maxBarSize={80}
                          minPointSize={5}
                        >
                          {chartData.map((entry, index) => (
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Chatbot for Multi-Report Context */}
      {selectedIds.length > 0 && <FloatingChatbot reportIds={selectedIds} />}
    </div>
  );
}
