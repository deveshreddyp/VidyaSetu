import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  UploadCloud, 
  Send, 
  FileText, 
  Loader2, 
  BrainCircuit, 
  Sparkles,
  BookOpen,
  HelpCircle,
  ListChecks,
  ChevronLeft,
  Trash2,
  Info,
  Mic,
  MicOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Tutor() {
  const [searchParams] = useSearchParams();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('pathfinderSessionId') || `session-${Date.now()}`;
  });
  const [pdfContextSet, setPdfContextSet] = useState(() => {
    return localStorage.getItem('pathfinderPdfContextSet') === 'true';
  });
  const [retrievalStats, setRetrievalStats] = useState(() => {
    const saved = localStorage.getItem('pathfinderRetrievalStats');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('pathfinderMessages');
    return saved ? JSON.parse(saved) : [
      { role: 'ai', content: "Hi! I'm **Pathfinder AI** 🧠\n\nUpload your study notes (PDF) on the left panel, and I'll become your personal tutor for that material.\n\nYou can ask me anything, or use the **quick action buttons** below to get started!" }
    ];
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const hasSentInitialPrompt = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('pathfinderSessionId', sessionId);
    localStorage.setItem('pathfinderPdfContextSet', pdfContextSet);
    localStorage.setItem('pathfinderRetrievalStats', JSON.stringify(retrievalStats));
    localStorage.setItem('pathfinderMessages', JSON.stringify(messages));
  }, [sessionId, pdfContextSet, retrievalStats, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle auto-prompt from dashboard
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && !hasSentInitialPrompt.current) {
      hasSentInitialPrompt.current = true;
      sendMessage(prompt, 'tutor');
    }
  }, [searchParams, sessionId]);

  async function handleFileUpload(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setFile(selectedFile);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sessionId', sessionId);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/pathfinder/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload');
      const data = await response.json();
      
      setPdfContextSet(true);
      setRetrievalStats({ totalChunks: data.chunksGenerated, pages: data.pages });
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `✅ I've processed **"${selectedFile.name}"** successfully!\n\n📄 **${data.pages} pages** indexed into **${data.chunksGenerated} knowledge chunks**.\n\nI'm now grounded in your notes. Ask me anything, or try the quick actions below!`
      }]);
    } catch (err) {
      console.error(err);
      alert('Error uploading file. Please ensure the backend is running.');
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage(text, mode = 'tutor') {
    if (!text.trim() || sending) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/pathfinder/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId,
          history: messages.slice(-10),
          mode: mode
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data.retrieval) {
        setRetrievalStats(prev => ({ ...prev, ...data.retrieval }));
      }

      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I'm having trouble connecting to the server. Please try again later." }]);
    } finally {
      setSending(false);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    sendMessage(input, 'tutor');
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Please try Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  function handleQuickAction(mode) {
    const prompts = {
      'explain': 'Explain the key concepts from my notes in simple terms with examples.',
      'quiz-me': 'Quiz me on my uploaded notes to test my understanding.',
      'summarize': 'Summarize my uploaded notes with key takeaways and bullet points.'
    };
    sendMessage(prompts[mode], mode);
  }

  function handleClearChat() {
    setMessages([
      { role: 'ai', content: "Chat cleared! 🔄\n\nYour uploaded notes are still indexed. Ask me anything or use the quick actions below." }
    ]);
  }

  return (
    <div className="flex h-screen bg-surface">
      
      {/* Left Panel: Upload & Context */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <button 
            onClick={() => window.history.back()} 
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-medium mb-4 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" /> Back to Dashboard
          </button>
          <h2 className="font-headline-md text-2xl text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-secondary" />
            Pathfinder AI
          </h2>
          <p className="text-xs text-slate-400 mt-1">RAG-powered academic tutor</p>
        </div>

        {/* Knowledge Base */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Knowledge Base</h3>
          
          <label className={`
            border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all
            ${pdfContextSet ? 'border-secondary/30 bg-secondary/5' : 'border-slate-200 hover:border-secondary hover:bg-slate-50'}
          `}>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            
            {uploading ? (
              <Loader2 className="w-8 h-8 text-secondary animate-spin mb-2" />
            ) : pdfContextSet ? (
              <FileText className="w-8 h-8 text-secondary mb-2" />
            ) : (
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
            )}
            
            <p className="text-sm font-medium text-slate-700">
              {uploading ? 'Indexing & Chunking...' : pdfContextSet ? 'Notes Indexed ✓' : 'Upload PDF Notes'}
            </p>
            {!pdfContextSet && !uploading && <p className="text-xs text-slate-500 mt-1">Click to browse</p>}
            {file && !uploading && <p className="text-xs text-secondary font-medium mt-2 truncate max-w-[200px]">{file.name}</p>}
          </label>

          {/* RAG Stats */}
          {retrievalStats && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Info className="w-3 h-3" /> RAG Pipeline Stats
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-2 text-center border border-slate-100">
                  <p className="text-lg font-bold text-primary">{retrievalStats.totalChunks || retrievalStats.chunksAvailable || 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Indexed Chunks</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-slate-100">
                  <p className="text-lg font-bold text-secondary">{retrievalStats.chunksRetrieved || '—'}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Last Retrieved</p>
                </div>
              </div>
              {retrievalStats.pages && (
                <p className="text-[10px] text-slate-400 text-center">{retrievalStats.pages} pages processed</p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Actions</h3>
            <button 
              onClick={() => handleQuickAction('explain')}
              disabled={sending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-colors text-sm font-medium text-left disabled:opacity-50"
            >
              <BookOpen className="w-4 h-4 shrink-0" /> Explain My Notes
            </button>
            <button 
              onClick={() => handleQuickAction('quiz-me')}
              disabled={sending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/5 hover:bg-secondary/10 text-secondary transition-colors text-sm font-medium text-left disabled:opacity-50"
            >
              <HelpCircle className="w-4 h-4 shrink-0" /> Quiz Me
            </button>
            <button 
              onClick={() => handleQuickAction('summarize')}
              disabled={sending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors text-sm font-medium text-left disabled:opacity-50"
            >
              <ListChecks className="w-4 h-4 shrink-0" /> Summarize Notes
            </button>
          </div>
        </div>

        {/* Clear Chat */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleClearChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-error hover:bg-error/5 transition-colors text-xs font-medium"
          >
            <Trash2 className="w-3 h-3" /> Clear Chat
          </button>
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 flex flex-col">
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center mr-3 shrink-0">
                  <BrainCircuit className="w-4 h-4 text-secondary" />
                </div>
              )}
              
              <div className={`max-w-3xl rounded-2xl p-5 ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-white border border-slate-100 shadow-sm rounded-bl-none prose prose-slate prose-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center mr-3 shrink-0">
                <BrainCircuit className="w-4 h-4 text-secondary" />
              </div>
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-none p-5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                <span className="text-sm text-slate-500">Retrieving context & thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-200">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pdfContextSet ? "Ask me anything about your notes..." : "Upload a PDF first, or ask a general question..."} 
              className="w-full bg-surface-container-low border-none rounded-full py-4 pl-6 pr-16 focus:ring-2 focus:ring-secondary/20 text-slate-700"
              disabled={sending}
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button 
                type="button"
                onClick={handleVoiceInput}
                disabled={sending}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                title="Use Voice Typing"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button 
                type="submit" 
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center hover:bg-secondary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <div className="text-center mt-3 flex items-center justify-center gap-2">
             <p className="text-[10px] text-slate-400">Pathfinder AI can make mistakes. Verify important information.</p>
             {retrievalStats && retrievalStats.chunksRetrieved > 0 && (
               <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">
                 RAG: {retrievalStats.chunksRetrieved} chunks used
               </span>
             )}
          </div>
        </div>
      </div>

    </div>
  );
}
