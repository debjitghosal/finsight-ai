import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

export default function Chatbot({ reportId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI financial assistant. You can ask me questions about this report, like "What was the revenue growth?" or "What are the major risks?"' }
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
    scrollToBottom();
  }, [messages]);

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
      
      // Provide user-friendly feedback for common errors
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please enable microphone permissions in your browser settings for this site.");
      } else if (event.error === 'network') {
        alert("A network error occurred. Speech recognition requires an active internet connection on some browsers.");
      } else if (event.error === 'no-speech') {
        // Just stop listening silently if no speech was detected
        return;
      } else {
        alert(`Voice Search Error: ${event.error}. Note: This feature requires HTTPS or localhost.`);
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
      const response = await fetch(`${api.defaults.baseURL}/reports/${reportId}/ask-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ question: userMessage })
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
        content: 'Sorry, I encountered an error while analyzing the report. Please try again.',
        isError: true
      }]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] glass-card overflow-hidden shadow-2xl">
      <div className="bg-[var(--bg-surface)] px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Bot className="w-5 h-5 text-indigo-500" />
          </div>
          <h3 className="font-black text-[var(--text-main)] text-sm uppercase tracking-tighter">FinSight AI Agent</h3>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-[var(--bg-card)]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-all ${
              msg.role === 'user' 
                ? 'bg-indigo-600 border-indigo-500/30 text-white' 
                : 'bg-[var(--bg-deep)] border-[var(--border-subtle)] text-indigo-500'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/10' 
                : msg.isError 
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-tl-sm'
                  : 'glass-surface text-[var(--text-main)] rounded-tl-sm border-[var(--border-subtle)]'
            }`}>
              <div className={`prose prose-sm max-w-none dark:prose-invert text-[var(--text-main)] prose-p:text-[var(--text-main)] prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-li:text-[var(--text-main)] prose-p:leading-relaxed font-bold tracking-tight ${msg.role === 'user' ? '!text-white' : ''}`}>
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
          <div className="flex gap-4 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-indigo-500 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="glass-surface rounded-2xl rounded-tl-sm px-5 py-3 border-[var(--border-subtle)]">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
        <div className="relative flex items-center group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening... Speak now" : "Query institutional data..."}
            className={`w-full bg-[var(--bg-card)] border rounded-xl pl-5 pr-24 py-3.5 text-sm font-bold text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner ${
              isListening ? 'border-rose-500/50 ring-2 ring-rose-500/10' : 'border-[var(--border-subtle)]'
            }`}
            disabled={loading}
          />
          <div className="absolute right-2 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-all active:scale-95 ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-[var(--bg-deep)] text-indigo-500 hover:bg-indigo-500/10'
              }`}
              title={isListening ? "Stop listening" : "Start voice search"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:opacity-50 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
