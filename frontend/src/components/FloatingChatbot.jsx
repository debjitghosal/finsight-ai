import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquareText, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import api from '../api';

export default function FloatingChatbot({ reportIds }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI mult-report assistant. Ask me questions comparing the selected companies.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !reportIds || reportIds.length === 0) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${api.defaults.baseURL}/reports/multi-ask-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          report_ids: reportIds,
          question: userMessage 
        })
      });

      if (!response.ok) {
        throw new Error("Failed to stream answer");
      }

      setLoading(false);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      let currentText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        currentText += chunk;
        
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = currentText;
          return newMsgs;
        });
      }

    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while analyzing the reports. Please try again.',
        isError: true
      }]);
      setLoading(false);
    }
  };

  if (!reportIds || reportIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] glass-card flex flex-col overflow-hidden shadow-2xl shadow-indigo-500/10 border-indigo-500/20"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-4 py-3 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-200" />
                <div>
                  <h3 className="font-semibold text-white text-sm">FinSight AI Connect</h3>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest">{reportIds.length} Reports Linked</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-900/80 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-inner ${
                    msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-dark-800 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : msg.isError 
                        ? 'bg-red-500/10 text-red-200 border border-red-500/20 rounded-tl-sm empty:hidden'
                        : 'bg-dark-800 text-slate-200 border border-white/5 rounded-tl-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-dark-900 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-dark-800 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-dark-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-xs text-slate-400">Synthesizing...</span>
                  </div>
                </div>
              )}
              {/* Scroll anchor removed */}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 bg-dark-900 border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Analyze cross-report trends..."
                  className="w-full bg-dark-800 border border-white/10 rounded-full pl-4 pr-12 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-1 p-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1'} text-white p-4 rounded-full transition-all flex items-center justify-center z-50 group border border-white/10`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquareText className="w-6 h-6" />}
      </button>
    </div>
  );
}
