import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, 
  Printer, 
  Loader2, 
  Settings2,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WorksheetGenerator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    grade: '',
    chapter: '',
    difficulty: 'Medium',
    contextText: ''
  });
  const [loading, setLoading] = useState(false);
  const [worksheets, setWorksheets] = useState(null); // { easy, medium, hard }
  const [activeTab, setActiveTab] = useState('medium');
  const [parsingPdf, setParsingPdf] = useState(false);

  const componentRef = useRef();

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsingPdf(true);
    try {
      const fd = new FormData();
      fd.append('pdfFile', file);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/generator/parse-pdf`, {
        method: 'POST',
        body: fd
      });
      if (!res.ok) throw new Error('Failed to parse PDF');
      const data = await res.json();
      setFormData(prev => ({ ...prev, contextText: data.text }));
    } catch(err) {
      alert("Failed to parse PDF: " + err.message);
    }
    setParsingPdf(false);
    e.target.value = ''; // reset input
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Worksheet_${formData.subject}_Grade${formData.grade}`,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.grade || !formData.chapter) return;

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/generator/worksheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to generate');
      
      const data = await response.json();
      setWorksheets(data);
      setActiveTab('medium');
    } catch (err) {
      console.error(err);
      alert('Failed to generate worksheets. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface print:bg-white flex flex-col font-body-md text-slate-800">
      
      {/* Top Navigation - Hidden when printing */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 print:hidden">
        <button 
          onClick={() => navigate('/teacher-dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex-1"></div>
        <h1 className="font-headline-md text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Worksheet Generator
        </h1>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-7xl mx-auto w-full print:p-0 print:m-0">
        
        {/* Sidebar Form - Hidden when printing */}
        <aside className="w-full md:w-80 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit print:hidden">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="font-headline-md text-xl text-slate-900 font-medium">Parameters</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
              <input 
                type="text" 
                name="subject"
                required
                placeholder="e.g., Science, Math" 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.subject}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Grade Level</label>
              <input 
                type="text" 
                name="grade"
                required
                placeholder="e.g., 5, 10, High School" 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.grade}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Topic / Chapter</label>
              <input 
                type="text" 
                name="chapter"
                required
                placeholder="e.g., Photosynthesis" 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.chapter}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Base Target Difficulty</label>
              <select 
                name="difficulty"
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.difficulty}
                onChange={handleChange}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Reference (RAG)</label>
                <label className="text-xs text-primary font-bold cursor-pointer hover:underline flex items-center gap-1">
                  {parsingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Upload PDF</span>}
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={parsingPdf} />
                </label>
              </div>
              <textarea 
                name="contextText"
                placeholder="Paste lesson notes here or upload a PDF above. The AI will strictly base the questions on this content..." 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm h-32 resize-none"
                value={formData.contextText}
                onChange={handleChange}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SparklesIcon />}
              {loading ? 'Generating 3 Versions...' : 'Generate Worksheets'}
            </button>
          </form>
        </aside>

        {/* Results Area */}
        <section className="flex-1 flex flex-col print:w-full">
          
          {/* Tabs & Actions - Hidden when printing */}
          {worksheets && (
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 print:hidden">
              <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex gap-1">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button 
                    key={level}
                    onClick={() => setActiveTab(level)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === level ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button 
                onClick={handlePrint}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          )}

          {/* Printable Document Area */}
          {worksheets ? (
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 flex-1 overflow-y-auto print:border-none print:shadow-none print:p-0">
              {/* This ref is what react-to-print targets */}
              <div ref={componentRef} className="print-container">
                <style type="text/css" media="print">
                  {`
                    @page { size: auto;  margin: 20mm; }
                    body { font-family: 'Times New Roman', serif; color: black; background: white; }
                    .prose { max-width: 100% !important; }
                    .prose h1, .prose h2, .prose h3 { color: black !important; break-after: avoid; }
                    .print-container { padding: 0 !important; margin: 0 !important; }
                  `}
                </style>
                <div className="prose prose-slate prose-lg max-w-none w-full">
                  <ReactMarkdown>{worksheets[activeTab]}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex-1 flex flex-col items-center justify-center text-slate-400 p-12 print:hidden">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-500">No Worksheets Generated</h3>
              <p className="text-sm mt-2 text-center max-w-sm">Fill out the parameters on the left and click generate to create 3 differentiated versions of your worksheet.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

// Simple icon component to avoid extra imports if not needed from lucide
function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  );
}
