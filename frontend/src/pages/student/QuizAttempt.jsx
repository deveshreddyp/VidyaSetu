import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw, 
  HelpCircle,
  Loader2,
  ChevronRight,
  BrainCircuit
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function QuizAttempt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState({}); // { questionIndex: optionIndex }
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  
  // Generation form state (student can also self-generate)
  const [formData, setFormData] = useState({ subject: '', topic: '', numQuestions: 5 });
  const [loading, setLoading] = useState(false);

  // Load quiz from URL data param if present
  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setQuiz(parsed);
      } catch (e) {
        console.error('Failed to parse quiz data from URL');
      }
    }
  }, [searchParams]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.topic) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/generator/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setQuiz(data.questions);
      setCurrentQ(0);
      setSelected({});
      setSubmitted(false);
    } catch (err) {
      alert('Failed to generate quiz. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (optionIndex) => {
    if (submitted) return;
    setSelected({ ...selected, [currentQ]: optionIndex });
  };

  const { currentUser } = useAuth();
  
  const handleSubmit = async () => {
    let correct = 0;
    quiz.forEach((q, i) => {
      if (selected[i] === q.correctIndex) correct++;
    });
    setScore(correct);
    setSubmitted(true);

    const quizId = searchParams.get('id');
    const topic = searchParams.get('topic');
    if (quizId && currentUser) {
      try {
        await addDoc(collection(db, 'quizResults'), {
          quizId,
          topic,
          studentId: currentUser.uid,
          studentEmail: currentUser.email,
          score: correct,
          total: quiz.length,
          percentage: Math.round((correct / quiz.length) * 100),
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to save quiz result', e);
      }
    }
  };

  const handleRetry = () => {
    setSelected({});
    setSubmitted(false);
    setCurrentQ(0);
    setScore(0);
  };

  const percentage = quiz ? Math.round((score / quiz.length) * 100) : 0;

  // ---- No quiz loaded yet: show generation form ----
  if (!quiz) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-slate-800 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-secondary transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-headline-md text-2xl text-slate-900 font-semibold text-center mb-2">Adaptive Quiz</h2>
            <p className="text-sm text-slate-500 text-center mb-8">Generate a personalized quiz to test your knowledge.</p>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
                <input type="text" name="subject" required placeholder="e.g., Physics"
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                  value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Topic</label>
                <input type="text" name="topic" required placeholder="e.g., Newton's Laws"
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm"
                  value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Questions</label>
                <select 
                  className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm"
                  value={formData.numQuestions} onChange={(e) => setFormData({...formData, numQuestions: parseInt(e.target.value)})}
                >
                  {[3, 5, 10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <HelpCircle className="w-5 h-5" />}
                {loading ? 'Generating...' : 'Start Quiz'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---- Results Screen ----
  if (submitted) {
    return (
      <div className="min-h-screen bg-surface font-body-md text-slate-800 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <button 
            onClick={() => navigate('/student-dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-secondary transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </header>
        <div className="flex-1 p-8 max-w-3xl mx-auto w-full space-y-6">
          
          {/* Score Card */}
          <div className={`p-8 rounded-3xl text-center ${percentage >= 70 ? 'bg-gradient-to-br from-secondary to-secondary/80' : 'bg-gradient-to-br from-primary to-primary/80'} text-white`}>
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <p className="text-5xl font-display-lg font-bold">{percentage}%</p>
            <p className="text-lg mt-2 opacity-90">{score} out of {quiz.length} correct</p>
            <p className="text-sm mt-1 opacity-70">
              {percentage >= 90 ? 'Outstanding! You\'ve mastered this topic!' :
               percentage >= 70 ? 'Great job! Keep practicing to perfect it.' :
               percentage >= 50 ? 'Good effort. Review the explanations below.' :
               'Keep going! Review the material and try again.'}
            </p>
          </div>

          {/* Review All Questions */}
          <h3 className="font-headline-md text-xl text-slate-900 font-medium pt-2">Review Answers</h3>
          {quiz.map((q, idx) => {
            const userAnswer = selected[idx];
            const isCorrect = userAnswer === q.correctIndex;
            return (
              <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  {isCorrect 
                    ? <CheckCircle2 className="w-5 h-5 text-secondary" /> 
                    : <XCircle className="w-5 h-5 text-error" />
                  }
                  <span className={`text-xs font-bold uppercase tracking-wider ${isCorrect ? 'text-secondary' : 'text-error'}`}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">Q{idx + 1}</span>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-3">{q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, i) => {
                    let classes = 'px-4 py-2.5 rounded-xl text-sm border transition-all ';
                    if (i === q.correctIndex) {
                      classes += 'bg-secondary/10 border-secondary/30 text-secondary font-medium';
                    } else if (i === userAnswer && !isCorrect) {
                      classes += 'bg-error/10 border-error/30 text-error line-through';
                    } else {
                      classes += 'bg-slate-50 border-slate-100 text-slate-500';
                    }
                    return (
                      <div key={i} className={classes}>
                        <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Explanation:</span> {q.explanation}</p>
                </div>
              </div>
            );
          })}

          {/* Retry & Remediate */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-8">
            <button onClick={handleRetry}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retry Quiz
            </button>
            <button onClick={() => {
              const wrongQs = quiz.filter((q, idx) => selected[idx] !== q.correctIndex);
              const questionsText = wrongQs.map(q => `- ${q.question}`).join('\\n');
              const remediationPrompt = `I just failed a quiz on ${searchParams.get('topic') || 'a topic'}. I got these questions wrong:\\n${questionsText}\\nCan you explain these concepts to me step-by-step?`;
              navigate(`/student-dashboard/tutor?prompt=${encodeURIComponent(remediationPrompt)}`);
            }}
              className="flex-1 py-3 bg-secondary text-white rounded-xl font-medium hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-secondary/20"
            >
              <BrainCircuit className="w-4 h-4" /> Remediate with AI
            </button>
            <button onClick={() => { setQuiz(null); setSelected({}); setSubmitted(false); }}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              New Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Active Quiz: Question-by-question ----
  const q = quiz[currentQ];

  return (
    <div className="min-h-screen bg-surface font-body-md text-slate-800 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between">
        <button 
          onClick={() => navigate('/student-dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-secondary transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Exit Quiz
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium">
            {currentQ + 1} / {quiz.length}
          </span>
          <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${((currentQ + 1) / quiz.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Question {currentQ + 1} of {quiz.length}</p>
          <h2 className="font-headline-md text-2xl text-slate-900 font-semibold mb-8 leading-relaxed">{q.question}</h2>

          <div className="space-y-3 mb-10">
            {q.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left px-6 py-4 rounded-2xl border-2 text-sm font-medium transition-all ${
                  selected[currentQ] === i 
                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold mr-3 text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button 
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              className="px-6 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentQ < quiz.length - 1 ? (
              <button 
                onClick={() => setCurrentQ(currentQ + 1)}
                disabled={selected[currentQ] === undefined}
                className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1 shadow-md shadow-primary/20"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={Object.keys(selected).length < quiz.length}
                className="px-8 py-3 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-secondary/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-secondary/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
