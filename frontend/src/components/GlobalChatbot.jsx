import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Loader2, MessageSquareText, X, AlertCircle, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import api from '../api';

export default function GlobalChatbot({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am Fortuna. Ask me anything spanning across all your recent uploads or any global financial query.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollContainerRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please check your browser's permissions for Fortuna to hear you.");
      } else if (event.error === 'no-speech') {
        return;
      } else {
        alert(`Transcription Error: ${event.error}. Note: This feature requires HTTPS when deployed.`);
      }
    };

    recognition.onresult = (event) => {
      let resultText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          resultText += event.results[i][0].transcript;
        }
      }
      if (resultText) {
        setInput(prev => prev + (prev ? ' ' : '') + resultText);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${api.defaults.baseURL}/reports/global-ask-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
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

 

  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col items-end shadow-2xl">
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
                <Sparkles className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Fortuna</h3>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest">Global Account Memory</p>
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
                    msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-dark-800 text-amber-300 border border-amber-500/30'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' 
                        : msg.isError 
                          ? 'bg-red-500/10 text-red-200 border border-red-500/20 rounded-tl-sm empty:hidden'
                          : 'glass-surface text-[var(--text-main)] rounded-tl-sm border-[var(--border-subtle)] shadow-lg'
                    }`}>
                      <div className="prose prose-sm dark:prose-invert text-[var(--text-main)] max-w-none prose-p:text-[var(--text-main)] prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-li:text-[var(--text-main)] prose-p:leading-relaxed">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-dark-800 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-dark-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-xs text-slate-400">Synthesizing...</span>
                  </div>
                </div>
              )}
              {/* Scroll anchor removed, handled via parent container */}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 bg-dark-900 border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Fortuna is listening..." : "Analyze cross-report trends..."}
                  className={`w-full bg-dark-800 border rounded-full pl-4 pr-24 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner ${
                    isListening ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-white/10 focus:border-indigo-500'
                  }`}
                  disabled={loading}
                />
                <div className="absolute right-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-all active:scale-95 ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
                        : 'bg-dark-700 text-indigo-400 hover:text-indigo-300'
                    }`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
