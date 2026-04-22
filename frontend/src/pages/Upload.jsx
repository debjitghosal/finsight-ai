import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, X, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
/**
 * UploadPage Component
 * 
 * Handles the ingestion of PDF annual reports. Includes a "Fast Scan" feature 
 * that instantly extracts company identity and report year from the filename 
 * and hidden PDF metadata before the primary analysis begins.
 * 
 * @returns {JSX.Element} The rendered upload interface.
 */
export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [reportYear, setReportYear] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const triggerFastScan = async (selectedFile) => {
    setScanning(true);

    // 1. Instant Regex Extraction from Filename (e.g. "Swiggy_AnnualReport 2023-24.pdf")
    const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
    
    // Extract Year (matches 2023, 2023-24, 2023-2024)
    const yearMatch = nameWithoutExt.match(/(20\d{2}(?:[-_]\d{2,4})?)/);
    if (yearMatch) {
      setReportYear(yearMatch[1].replace('_', '-'));
    }

    // Extract Company Name (everything before "Annual", "Report", "AR", or the year)
    let extractedCompany = nameWithoutExt.replace(/(20\d{2}.*|annual|report|ar|financial)/ig, '').replace(/[-_]/g, ' ').trim();
    if (extractedCompany) {
      // Capitalize first letters safely
      extractedCompany = extractedCompany.replace(/\b\w/g, l => l.toUpperCase());
      setCompanyName(extractedCompany);
    }

    // 2. Background AI API Scan (to refine if needed)
    // SKIP if file is extremely large to prioritize secondary main upload
    if (selectedFile.size > 15 * 1024 * 1024) {
      console.log("Large file detected (>15MB). Skipping AI Pre-Scan to save bandwidth.");
      setScanning(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await api.post('/reports/metadata-scan', formData, {
        headers: { 'Content-Type': undefined }, // Let browser set multipart boundary
        timeout: 10000
      });
      // Only override if the AI actually found something better and we didn't already have it
      if (res.data.company_name && !extractedCompany) setCompanyName(res.data.company_name);
      if (res.data.report_year && !yearMatch) setReportYear(res.data.report_year);
    } catch (err) {
      console.warn("AI Pre-Scan timed out or failed. Proceeding with instant Regex only.");
    } finally {
      setScanning(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type === 'application/pdf') {
        setFile(dropped);
        triggerFastScan(dropped);
      } else {
        setError('Please upload a PDF file.');
      }
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === 'application/pdf') {
        setFile(selected);
        setError('');
        triggerFastScan(selected);
      } else {
        setError('Please select a PDF file.');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (companyName) formData.append('company_name', companyName);
    if (reportYear) formData.append('report_year', reportYear);

    try {
      const res = await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': undefined }, // Must override global json default so browser sets multipart boundary
        timeout: 300000
      });
      navigate(`/report/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload report. Check file size and type.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-[var(--text-main)] mb-4 tracking-tighter">Upload Annual Report</h1>
        <p className="text-sm md:text-lg font-bold text-[var(--text-muted)] max-w-lg mx-auto opacity-70">Upload a company's annual report PDF and let our AI extract key financial insights, metrics, and investment signals.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 md:p-12 border-[var(--border-subtle)] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden"
      >
        <form onSubmit={handleUpload}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 relative z-10">
            <div>
              <label className="block text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.1em] mb-3 pl-1">
                Company Name <span className="text-[var(--text-muted)]">(Optional)</span>
              </label>
              <input
                type="text"
                className="glass-input w-full bg-[var(--bg-deep)] border-[var(--border-subtle)] focus:border-indigo-500 font-bold placeholder:text-[var(--text-muted)]/50"
                placeholder="e.g. NVIDIA CORP"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={scanning}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.1em] mb-3 pl-1">
                Report Year <span className="text-[var(--text-muted)]">(Optional)</span>
              </label>
              <input
                type="text"
                className="glass-input w-full bg-[var(--bg-deep)] border-[var(--border-subtle)] focus:border-indigo-500 font-bold placeholder:text-[var(--text-muted)]/50"
                placeholder="e.g. FY 2024"
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                disabled={scanning}
              />
            </div>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all min-h-[250px] flex flex-col justify-center ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
                : file 
                  ? 'border-indigo-500/30 bg-indigo-500/5' 
                  : 'border-[var(--border-subtle)] hover:border-indigo-500/30 hover:bg-[var(--glass-tint)]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 hidden"
              accept=".pdf"
              onChange={handleChange}
            />

            {!file ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <div className="p-6 bg-indigo-500/10 rounded-3xl mb-6 shadow-inner ring-1 ring-indigo-500/20">
                  <UploadCloud className="w-12 h-12 text-indigo-500" />
                </div>
                <p className="text-[10px] font-black text-[var(--text-muted)] mb-8 uppercase tracking-[0.2em] opacity-60">PDF Annual Report (Max 500 Pages)</p>
                <label 
                  htmlFor="file-upload" 
                  className="primary-btn px-10 py-4 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all text-xs tracking-widest uppercase cursor-pointer z-20 relative"
                >
                  Select Report
                </label>
              </motion.div>
            ) : scanning ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/30 animate-pulse"></div>
                  <div className="p-4 bg-dark-800 rounded-full mb-4 relative z-10 border border-indigo-500/30">
                    <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-indigo-300 font-medium text-lg mb-1">AI Pre-Scan Active</h3>
                <p className="text-sm text-slate-400 tracking-wide max-w-[280px]">Extracting precise report year and company identity...</p>
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center relative z-20">
                <div className="p-4 bg-dark-900 border border-white/5 shadow-inner rounded-full mb-4">
                  <File className="w-10 h-10 md:w-12 md:h-12 text-green-400" />
                </div>
                <p className="text-base md:text-lg font-medium text-white mb-1 truncate max-w-[90%] md:max-w-full px-4">{file.name}</p>
                <p className="text-xs md:text-sm text-slate-400 mb-6">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  type="button"
                  onClick={() => { setFile(null); setCompanyName(''); setReportYear(''); }}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm transition-colors"
                >
                  <X className="w-4 h-4" /> Remove File
                </button>
              </motion.div>
            )}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-start gap-3">
              <X className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={!file || loading || scanning}
              className={`w-full md:w-auto primary-btn flex items-center min-w-[200px] justify-center ${(!file || loading || scanning) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating Analysis...
                </>
              ) : (
                'Upload & Analyze Full Report'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
