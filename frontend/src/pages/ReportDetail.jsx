import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Download, MessageSquare, AlertCircle, Loader2, 
  TrendingUp, Activity, FileText, CheckCircle2, DollarSign, Target, PieChart,
  ExternalLink, Search, RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import Chatbot from '../components/Chatbot';

const LivePriceDisplay = ({ data }) => {
  if (!data) return null;
  return (
    <div className="hidden md:flex flex-col items-center justify-center px-4 h-[42px] bg-dark-800 border border-white/10 rounded-lg min-w-[140px]">
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-sm">
          {data.currency === 'INR' ? '₹' : '$'}{data.price.toLocaleString()}
        </span>
        <span className={`text-[10px] font-bold ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.change >= 0 ? '▲' : '▼'}{data.percent_change}%
        </span>
      </div>
    </div>
  );
};

const SymbolOverviewChart = ({ symbol, exchange }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        [
          `${exchange}:${symbol}|1D`
        ]
      ],
      "chartOnly": true,
      "width": "100%",
      "height": "100%",
      "locale": "en",
      "colorTheme": "dark",
      "autosize": true,
      "showVolume": false,
      "showMA": false,
      "hideDateRanges": false,
      "hideMarketStatus": false,
      "hideSymbolLogo": false,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "fontSize": "10",
      "noTimeScale": false,
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      "chartType": "area",
      "maLineColor": "#2962FF",
      "maLineWidth": 1,
      "maLength": 9,
      "lineWidth": 2,
      "lineColor": "#2962FF",
      "topColor": "rgba(41, 98, 255, 0.3)",
      "bottomColor": "rgba(41, 98, 255, 0)",
      "dateFormat": "MMM dd, yyyy",
      "timeHoursFormat": "12-hours"
    });
    const container = document.getElementById("tv-overview-container");
    if (container) {
      container.innerHTML = "";
      container.appendChild(script);
    }
  }, [symbol, exchange]);

  return (
    <div id="tv-overview-container" className="w-full h-full">
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
};

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finData, setFinData] = useState({});
  const [activeTab, setActiveTab] = useState('summary');
  const [newsData, setNewsData] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  
  // WhatsApp state
  const [showWaForm, setShowWaForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [sendingWa, setSendingWa] = useState(false);
  const [waSuccess, setWaSuccess] = useState('');

  // Floating Progress State
  const [showDoneProgress, setShowDoneProgress] = useState(false);
  const [wasProcessing, setWasProcessing] = useState(false);
  const [showTickerModal, setShowTickerModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newExchange, setNewExchange] = useState('NSE');
  const [autoDetectLoading, setAutoDetectLoading] = useState(false);
  const [ltpData, setLtpData] = useState(null);
  const [smoothPercent, setSmoothPercent] = useState(0);
  const [reanalyzing, setReanalyzing] = useState(false);

  const isProcessing = report?.status && report.status.startsWith('processing');
  
  const statusMap = {
    'pending': { text: 'Initializing Analysis', percent: 5 },
    'processing:parsing_text': { text: 'Extracting PDF Intelligence', percent: 15 },
    'processing:init': { text: 'Booting Intelligence Engine', percent: 30 },
    'processing:summary_done': { text: 'Synthesizing Executive AI Summary', percent: 65 },
    'processing:insights': { text: 'Drafting Institutional Investment Advice', percent: 85 },
    'processing:finalizing': { text: 'Finalizing Data Models', percent: 95 }
  };
  const currentStage = isProcessing ? (statusMap[report.status] || { text: 'Analyzing Report', percent: 20 }) : { text: 'Done', percent: 100 };

  const fetchReport = async () => {
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data);
      if (res.data.financial_data_json) {
        try {
          setFinData(JSON.parse(res.data.financial_data_json));
        } catch (e) {
          console.error("Failed to parse JSON");
        }
      }
    } catch (err) {
      setError('Report not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    if (newsData.length > 0) return;
    setNewsLoading(true);
    try {
      const res = await api.get(`/reports/${id}/news`);
      setNewsData(res.data);
    } catch (err) {
      console.error("Failed to fetch news");
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReport();
    // Start polling if still processing
    let interval;
    if (report && report.status && report.status.startsWith('processing')) {
      interval = setInterval(fetchReport, 3000); // Poll every 3 seconds to update progress bar smoothly
    }
    return () => clearInterval(interval);
  }, [id, report?.status]);

  const fetchLtp = async () => {
    if (!finData.ticker) return;
    try {
      const res = await api.get(`/reports/${id}/live-ltp`);
      if (res.data && !res.data.error) {
        setLtpData(res.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchLtp();
    const interval = setInterval(fetchLtp, 10000); // Update price every 10 seconds
    return () => clearInterval(interval);
  }, [finData.ticker]);

  useEffect(() => {
    if (report?.status?.startsWith('processing')) {
      setWasProcessing(true);
    } 
    if (report?.status === 'done' && wasProcessing) {
      // Trigger the 5 second 100% overlay
      setShowDoneProgress(true);
      setWasProcessing(false); // prevent re-triggering loop
      setSmoothPercent(100);
      setTimeout(() => {
        setShowDoneProgress(false);
      }, 5000); // Do NOT return clearTimeout here, otherwise setting wasProcessing(false) instantly clears it
    }
  }, [report?.status, wasProcessing]);

  // Smooth Progress Engine
  useEffect(() => {
    if (!isProcessing) return;
    
    const interval = setInterval(() => {
      setSmoothPercent(prev => {
        const target = currentStage.percent;
        if (prev < target) {
          // Accelerate if far behind, otherwise crawl
          const step = (target - prev) > 10 ? 2 : 0.5;
          return Math.min(target, prev + step);
        }
        // Creep forward slowly if we've hit the stage target but hasn't switched yet (max 99%)
        if (prev < 99 && prev < target + 5) {
          return prev + 0.1;
        }
        return prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isProcessing, currentStage.percent]);

  // Sync smooth percent with report status jumps
  useEffect(() => {
    if (isProcessing) {
      const target = currentStage.percent;
      setSmoothPercent(prev => Math.max(prev, target));
    }
  }, [report?.status]);

  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/reports/${id}/export/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finsight_${report.company_name || 'report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF document.");
    }
  };

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    setSendingWa(true);
    setWaSuccess('');
    try {
      await api.post(`/reports/${id}/whatsapp`, { phone_number: phone });
      setWaSuccess('Summary sent successfully!');
      setTimeout(() => setShowWaForm(false), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send WhatsApp message");
    } finally {
      setSendingWa(false);
    }
  };

  const handleUpdateTicker = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/reports/${id}`, { ticker: newTicker });
      setFinData(prev => ({ ...prev, ticker: newTicker, exchange: newExchange }));
      setShowTickerModal(false);
      // Force refresh chart
      setActiveTab('summary');
      setTimeout(()=>setActiveTab('chart'), 50);
    } catch (err) {
      alert("Failed to update ticker");
    }
  };

  const handleAutoDetectTicker = async () => {
    setAutoDetectLoading(true);
    try {
      const res = await api.post(`/reports/${id}/auto-detect-ticker`);
      if (res.data.ticker) {
        setFinData(prev => ({ 
          ...prev, 
          ticker: res.data.ticker, 
          exchange: res.data.exchange || 'NSE',
          sector: res.data.sector 
        }));
        setNewTicker(res.data.ticker);
        setNewExchange(res.data.exchange || 'NSE');
        setShowTickerModal(false);
        // Trigger data refresh
        fetchLtp();
      } else {
        alert("AI could not find a confident ticker for this company name.");
      }
    } catch (err) {
      alert("AI detection failed.");
    } finally {
      setAutoDetectLoading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!window.confirm('This will re-run the full AI analysis on this report. This may take a few minutes. Continue?')) return;
    setReanalyzing(true);
    try {
      await api.post(`/reports/${id}/reanalyze`);
      // Reload the report after a brief pause to let backend update status
      setTimeout(() => {
        fetchReport();
        setReanalyzing(false);
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || 'Re-analysis failed. The original PDF may not be available on the server.');
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <p className="text-slate-400">Loading your AI analysis...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl text-white mb-4">{error}</h2>
        <Link to="/" className="text-primary-400 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  if (report?.status === 'error') {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center pt-20">
        <div className="glass-card p-8 border-red-500/30 bg-red-500/5">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Analysis Failed</h1>
          <p className="text-red-300 mb-6">{report.error_message}</p>
          <Link to="/upload" className="primary-btn inline-block">Try Another File</Link>
        </div>
      </div>
    );
  }

  // --- Main Ready View ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 bg-[var(--bg-surface)] hover:bg-[var(--glass-tint)] rounded-lg text-[var(--text-muted)] transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3 tracking-tighter">
            {report.company_name || 'Annual Report'}
            <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              FY {report.report_year || 'Unknown'}
            </span>
          </h1>
          <p className="text-sm font-bold text-[var(--text-muted)] mt-1 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {report.file_name} • Analysed {new Date(report.processed_at || report.uploaded_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <LivePriceDisplay data={ltpData} />
          
          {!finData.ticker && (
            <button 
              onClick={() => {
                setNewTicker("");
                setShowTickerModal(true);
              }}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-600/20 border border-amber-500/30 text-amber-500 rounded-lg transition-all text-sm font-bold shadow-lg shadow-amber-500/5"
            >
              <Activity className="w-4 h-4" /> Set Ticker
            </button>
          )}
          
          <div className="flex items-center gap-3">
            {/* Re-Analyze button - shows when data seems empty */}
            {report.status === 'done' && !finData.revenue && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-400 rounded-lg transition-all text-sm font-bold"
              >
                {reanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {reanalyzing ? 'Re-analyzing...' : 'Re-Analyze'}
              </button>
            )}
            {finData.ticker && (
            <a
              href={`https://www.screener.in/company/${(finData.ticker || "").split('.')[0].split(':')[1] || (finData.ticker || "").split('.')[0].split(':')[0].trim().toUpperCase()}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-500 rounded-lg transition-all text-sm font-bold hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/5 group"
            >
              Open Screener <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          )}

          <div className="relative">
            <button 
              onClick={() => setShowWaForm(!showWaForm)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 rounded-lg transition-colors text-sm font-bold"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </button>
            
            {showWaForm && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowWaForm(false)} 
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 w-64 glass-card p-4 z-50 border-emerald-500/30 shadow-2xl"
                >
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-3 uppercase tracking-widest">Send AI Summary</h4>
                  {waSuccess ? (
                    <div className="text-emerald-500 text-sm font-bold flex items-center gap-2 animate-bounce"><CheckCircle2 className="w-4 h-4"/>{waSuccess}</div>
                  ) : (
                    <form onSubmit={handleSendWhatsApp}>
                      <input 
                        type="text" 
                        placeholder="e.g. +14155552671" 
                        value={phone} onChange={(e)=>setPhone(e.target.value)}
                        className="glass-input w-full p-2 text-sm mb-3 font-bold" required
                      />
                      <button type="submit" disabled={sendingWa} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-bold transition-all shadow-lg shadow-emerald-500/20">
                        {sendingWa ? 'Sending...' : 'Send Message'}
                      </button>
                    </form>
                  )}
                </motion.div>
              </>
            )}
          </div>
          
          <button 
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-500 rounded-lg transition-colors text-sm font-bold"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>
    </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-6">
          <div className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-indigo-500"/> Revenue</div>
          <div className="text-2xl font-black text-[var(--text-main)] tracking-tighter">{finData.revenue || 'N/A'}</div>
          {finData.revenue_growth && <div className="text-xs font-bold text-emerald-500 mt-2">↑ {finData.revenue_growth}</div>}
        </div>
        <div className="glass-card p-6">
          <div className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Target className="w-3.5 h-3.5 text-emerald-500"/> Net Profit</div>
          <div className="text-2xl font-black text-[var(--text-main)] tracking-tighter">{finData.net_profit || 'N/A'}</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><PieChart className="w-3.5 h-3.5 text-indigo-400"/> EBITDA</div>
          <div className="text-2xl font-black text-[var(--text-main)] tracking-tighter">{finData.ebitda || 'N/A'}</div>
        </div>
        <div className="glass-card p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3.5 h-3.5"/> EPS</div>
          <div className="text-2xl font-black text-[var(--text-main)] tracking-tighter">{finData.eps || 'N/A'}</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-2">
            {[
              { id: 'summary', name: 'Executive Summary', color: 'bg-indigo-500' },
              { id: 'data', name: 'Detailed Metrics', color: 'bg-indigo-500' },
              { id: 'investment', name: 'Investment Insights', color: 'bg-indigo-600' },
              { id: 'news', name: 'Live Market News', color: 'bg-emerald-500' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={()=>setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg shadow-indigo-500/20` 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8"
          >
            {activeTab === 'summary' && (
              <div className="prose prose-slate dark:prose-invert max-w-none text-[var(--text-main)] font-medium prose-p:text-[var(--text-main)] prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-li:text-[var(--text-main)] prose-p:leading-relaxed prose-headings:font-black">
                {report.ai_summary ? (
                  <div className="text-[var(--text-main)] font-medium leading-relaxed">
                    <ReactMarkdown>{report.ai_summary}</ReactMarkdown>
                  </div>
                ) : isProcessing ? (
                  <div className="text-[var(--text-muted)] text-sm font-bold flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-indigo-500"/> Synthesizing Executive AI Intelligence...</div>
                ) : (
                  <div className="text-[var(--text-muted)] text-sm italic">Summary could not be generated.</div>
                )}
              </div>
            )}
            
            {activeTab === 'data' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)] mb-6 border-b border-[var(--border-subtle)] pb-2 uppercase tracking-tighter">Balance Sheet & Performance Ratios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                    {['total_assets', 'total_liabilities', 'equity', 'operating_cash_flow', 'debt_to_equity', 'return_on_equity', 'return_on_assets', 'current_ratio', 'profit_margin'].map(k => (
                      <div key={k} className="flex justify-between items-center py-3 border-b border-[var(--border-subtle)] group">
                        <span className="text-[var(--text-muted)] font-bold text-xs capitalize tracking-tight group-hover:text-indigo-500 transition-colors">{k.replace(/_/g, ' ')}</span>
                        <span className="text-[var(--text-main)] font-black tracking-tighter">{finData[k] || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="glass-surface p-6 border-emerald-500/10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Key Highlights</h3>
                    <ul className="space-y-3">
                      {finData.key_highlights?.map((h, i) => (
                        <li key={i} className="text-sm font-bold text-[var(--text-main)] flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" /> <span className="leading-relaxed">{h}</span>
                        </li>
                      )) || <li className="text-[var(--text-muted)] text-sm italic">No highlights extracted</li>}
                    </ul>
                  </div>
                  <div className="glass-surface p-6 border-rose-500/10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Major Risks</h3>
                    <ul className="space-y-3">
                      {finData.major_risks?.map((r, i) => (
                        <li key={i} className="text-sm font-bold text-[var(--text-main)] flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" /> <span className="leading-relaxed">{r}</span>
                        </li>
                      )) || <li className="text-[var(--text-muted)] text-sm italic">No risks extracted</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'investment' && (
              <div className="relative">
                <div className="flex justify-between items-center mb-8 pb-3 border-b border-[var(--border-subtle)]">
                   <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Strategic AI Recommendation</h3>
                   <div className="bg-indigo-500/10 text-indigo-500 px-4 py-1.5 rounded-full text-xs font-black border border-indigo-500/20 flex items-center gap-2 shadow-sm ring-4 ring-indigo-500/5">
                    <TrendingUp className="w-3.5 h-3.5" /> Institutional Advisor
                  </div>
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none text-[var(--text-main)] font-medium prose-p:text-[var(--text-main)] prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-li:text-[var(--text-main)] prose-p:leading-relaxed prose-headings:font-black">
                  {report.investment_insight ? (
                    <ReactMarkdown>{report.investment_insight}</ReactMarkdown>
                  ) : isProcessing ? (
                    <div className="text-[var(--text-muted)] text-sm font-bold flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-indigo-500"/> Calibrating Investment Thesis...</div>
                  ) : (
                    <div className="text-[var(--text-muted)] text-sm italic">Synthesis in progress.</div>
                  )}
                </div>
              </div>
            )}


            {activeTab === 'news' && (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {newsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass-surface p-6 animate-pulse">
                        <div className="h-6 bg-white/5 rounded-lg w-3/4 mb-4" />
                        <div className="h-4 bg-white/5 rounded-lg w-full mb-2" />
                        <div className="h-4 bg-white/5 rounded-lg w-2/3 mb-6" />
                        <div className="flex justify-between">
                          <div className="h-3 bg-white/5 rounded-lg w-24" />
                          <div className="h-3 bg-white/5 rounded-lg w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : newsData.length === 0 ? (
                  <div className="text-center py-20 text-[var(--text-muted)] italic text-sm">No recent headlines detected.</div>
                ) : (
                  newsData.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-surface hover:border-emerald-500/30 p-6 group transition-all"
                    >
                      <div className="flex justify-between items-start gap-6 mb-4">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[var(--text-main)] font-black text-xl leading-tight group-hover:text-emerald-500 transition-colors tracking-tight">
                          {item.title.split(' - ')[0]}
                        </a>
                        <span className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] bg-[var(--glass-tint)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] shrink-0">
                          {item.date ? new Date(item.date).toLocaleDateString() : 'REALTIME'}
                        </span>
                      </div>
                      <p className="text-[var(--text-muted)] text-sm font-bold leading-relaxed mb-6 italic border-l-4 border-emerald-500/20 pl-5 py-2">
                        {item.summary}
                      </p>
                      <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <span className="flex items-center gap-2"><Search className="w-3.5 h-3.5 text-emerald-500 font-bold"/> {item.title.split(' - ')[1] || 'Institutional Press'}</span>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 font-black flex items-center gap-1 transition-colors">
                          Read Full Analysis <ExternalLink className="w-3.5 h-3.5 ml-1"/>
                        </a>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar Chatbot */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Chatbot reportId={report.id} disabled={isProcessing} />
          </div>
        </div>
      </div>

      {/* Floating Progress Bar Banner */}
      {(isProcessing || showDoneProgress) && (
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-0 left-0 w-full z-50 bg-[var(--bg-deep)] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] border-t border-[var(--border-subtle)] p-6 backdrop-blur-2xl"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-8">
            <div className={`w-16 h-16 ${showDoneProgress ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-indigo-500/10 border-indigo-500/20'} border-2 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner`}>
               {isProcessing ? <Loader2 className="w-8 h-8 animate-spin text-indigo-500" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500 ring-4 ring-emerald-500/10 rounded-full" />}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-black uppercase tracking-widest ${showDoneProgress ? 'text-emerald-500' : 'text-indigo-500'}`}>
                   {showDoneProgress ? "Cognitive Analysis Complete" : currentStage.text}
                </span>
                <span className="text-sm font-black text-[var(--text-main)] tracking-widest">
                   {Math.floor(smoothPercent)}%
                </span>
              </div>
              <div className="w-full bg-[var(--bg-card)] rounded-full h-4 overflow-hidden border border-[var(--border-subtle)] shadow-inner p-0.5">
                <motion.div 
                   className={`h-full rounded-full relative transition-all duration-1000 ease-linear ${showDoneProgress ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${smoothPercent}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full animate-[shimmer_2s_infinite]"></div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ticker Modal */}
      {showTickerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={() => setShowTickerModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card relative w-full max-w-md p-8 border-amber-500/30 shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Live Data Setup</h2>
              <button onClick={() => setShowTickerModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleUpdateTicker} className="space-y-6">
              <div className="flex flex-col gap-4">
                <button 
                  type="button"
                  onClick={handleAutoDetectTicker}
                  disabled={autoDetectLoading}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg transition-all text-xs font-bold"
                >
                  {autoDetectLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3"/>}
                  {autoDetectLoading ? 'Researching Stock...' : 'Auto-Detect with AI (Gemini)'}
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">or set manually</span>
                  <div className="h-px bg-white/5 flex-1" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Stock Ticker Symbol</label>
                <input 
                  type="text" 
                  value={newTicker} 
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  className="glass-input w-full uppercase" 
                  placeholder="e.g. TCS, RELIANCE, AAPL"
                  required 
                />
                <p className="text-[10px] text-slate-500 mt-2 italic px-1">Use NSE/BSE symbols for Indian stocks (e.g. RELIANCE for Reliance Industries).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Primary Exchange</label>
                <select 
                  value={newExchange} 
                  onChange={(e) => setNewExchange(e.target.value)}
                  className="glass-input w-full bg-dark-900 border-white/10"
                >
                  <option value="NSE">NSE (India)</option>
                  <option value="BSE">BSE (India)</option>
                  <option value="NASDAQ">NASDAQ (USA)</option>
                  <option value="NYSE">NYSE (USA)</option>
                </select>
              </div>

              <button type="submit" className="primary-btn w-full !from-amber-500 !to-orange-500">
                Update Chart & News
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
