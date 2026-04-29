import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  HelpCircle, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  Share2
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function QuizGenerator() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    numQuestions: 5,
    contextText: ''
  });
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null); // array of question objects
  const [published, setPublished] = useState(false);

  const [parsingPdf, setParsingPdf] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsingPdf(true);
    try {
      const fd = new FormData();
      fd.append('pdfFile', file);
      const res = await fetch('http://localhost:5000/api/generator/parse-pdf', {
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.topic) return;

    setLoading(true);
    setQuiz(null);
    setPublished(false);
    try {
      const response = await fetch('http://localhost:5000/api/generator/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to generate');
      const data = await response.json();
      setQuiz(data.questions);
    } catch (err) {
      console.error(err);
      alert('Failed to generate quiz. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await addDoc(collection(db, 'quizzes'), {
        teacherId: currentUser.uid,
        subject: formData.subject,
        topic: formData.topic,
        questions: quiz,
        createdAt: new Date().toISOString()
      });
      setPublished(true);
      setTimeout(() => setPublished(false), 3000);
    } catch (error) {
      console.error("Error publishing quiz:", error);
      alert("Failed to publish quiz to database.");
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-slate-800">
      
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
        <button 
          onClick={() => navigate('/teacher-dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex-1" />
        <h1 className="font-headline-md text-lg font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Quiz Generator
        </h1>
      </header>

      <main className="flex flex-col md:flex-row p-6 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Sidebar Form */}
        <aside className="w-full md:w-80 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
          <h2 className="font-headline-md text-xl text-slate-900 font-medium mb-6">Quiz Parameters</h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
              <input 
                type="text" name="subject" required
                placeholder="e.g., Biology" 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.subject} onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Topic</label>
              <input 
                type="text" name="topic" required
                placeholder="e.g., Photosynthesis" 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.topic} onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Number of Questions</label>
              <select 
                name="numQuestions"
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                value={formData.numQuestions} onChange={handleChange}
              >
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
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
                placeholder="Paste reference material here or upload a PDF above. The AI will base the questions on this content..." 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm h-24 resize-none"
                value={formData.contextText} onChange={handleChange}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <HelpCircle className="w-5 h-5" />}
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </form>

          {quiz && (
            <button 
              onClick={handlePublish}
              className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {published ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              {published ? 'Published to Students!' : 'Publish Quiz to Students'}
            </button>
          )}
        </aside>

        {/* Quiz Preview */}
        <section className="flex-1">
          {quiz ? (
            <div className="space-y-5">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Quiz Generated! ({quiz.length} Questions)</p>
                  <p className="text-xs text-slate-500">Preview below. Copy the link to share with students.</p>
                </div>
              </div>

              {quiz.map((q, idx) => (
                <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Question {idx + 1}</p>
                  <p className="text-base font-medium text-slate-900 mb-4">{q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {q.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`px-4 py-3 rounded-xl text-sm border transition-all ${
                          i === q.correctIndex 
                            ? 'bg-secondary/10 border-secondary/30 text-secondary font-medium' 
                            : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                        {i === q.correctIndex && <CheckCircle2 className="w-4 h-4 inline ml-2" />}
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Explanation:</span> {q.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl flex-1 flex flex-col items-center justify-center text-slate-400 p-16 min-h-[500px]">
              <HelpCircle className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-500">No Quiz Generated Yet</h3>
              <p className="text-sm mt-2 text-center max-w-sm">Fill out the parameters and click generate to create an MCQ quiz with answers and explanations.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
