import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, limit, where, doc, getDocs } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { 
  LogOut, 
  UploadCloud, 
  BrainCircuit, 
  HelpCircle, 
  Bell, 
  Search, 
  Settings, 
  BookOpen, 
  LayoutDashboard,
  TrendingUp,
  FileBadge,
  Sparkles,
  ChevronRight,
  Target,
  PlayCircle,
  X,
  Loader2,
  Map
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';


export default function StudentDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('studentDashboardTab') || 'dashboard';
  });

  React.useEffect(() => {
    localStorage.setItem('studentDashboardTab', activeTab);
  }, [activeTab]);
  const [quizzes, setQuizzes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [myQuizResults, setMyQuizResults] = useState([]);
  const [myResumes, setMyResumes] = useState([]);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [masteryNotes, setMasteryNotes] = useState(null);
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [selectedResumeForAts, setSelectedResumeForAts] = useState(null);
  const [jdText, setJdText] = useState('');
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [isAnalyzingAts, setIsAnalyzingAts] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState(null);
  const [roadmapRole, setRoadmapRole] = useState('');
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [careerRoadmap, setCareerRoadmap] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleUploadNotes = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGeneratingNotes(true);
    setMasteryNotes(null);

    try {
      const fd = new FormData();
      fd.append('pdfFile', file);
      const parseRes = await fetch('http://localhost:5000/api/generator/parse-pdf', {
        method: 'POST',
        body: fd
      });
      if (!parseRes.ok) throw new Error('Failed to extract text from PDF');
      const parseData = await parseRes.json();
      
      const notesRes = await fetch('http://localhost:5000/api/generator/mastery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextText: parseData.text })
      });
      if (!notesRes.ok) throw new Error('Failed to generate mastery notes');
      const notesData = await notesRes.json();
      
      setMasteryNotes(notesData.notes);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsGeneratingNotes(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyzeAts = async () => {
    if (!jdText.trim()) return alert('Please enter a Job Description');
    setIsAnalyzingAts(true);
    setAtsAnalysis(null);
    setCoverLetter(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/resume/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: selectedResumeForAts.data, jdText })
      });
      if (!res.ok) throw new Error('Failed to analyze ATS');
      const data = await res.json();
      setAtsAnalysis(data);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsAnalyzingAts(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jdText.trim() || !selectedResumeForAts) return;
    setIsGeneratingCoverLetter(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/resume/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: selectedResumeForAts.data, jdText })
      });
      if (!res.ok) throw new Error('Failed to generate cover letter');
      const data = await res.json();
      setCoverLetter(data.coverLetter);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!roadmapRole.trim()) return alert("Please enter a target role");
    setIsGeneratingRoadmap(true);
    setCareerRoadmap(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/generator/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roadmapRole })
      });
      if (!res.ok) throw new Error('Failed to generate roadmap');
      const data = await res.json();
      setCareerRoadmap(data.roadmap);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    // Fetch Quizzes
    const qQuizzes = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(5));
    const unsubQuizzes = onSnapshot(qQuizzes, (snap) => {
      setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Materials
    const qMaterials = query(collection(db, 'materials'), orderBy('createdAt', 'desc'), limit(5));
    const unsubMaterials = onSnapshot(qMaterials, (snap) => {
      setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch user profile and quiz results
    const unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
      let data = docSnap.exists() ? docSnap.data() : { role: 'student', email: currentUser.email };
      let updatedData = false;
      
      // If no results in the UID-based doc (or doc doesn't exist), try to find results by email
      if (!docSnap.exists() || !data.results || data.results.length === 0) {
        try {
          const emailQuery = query(
            collection(db, 'users'),
            where('email', '==', currentUser.email)
          );
          const emailSnap = await getDocs(emailQuery);
          let foundResults = null;
          let foundProfile = null;
          emailSnap.forEach(d => {
            const dData = d.data();
            if (dData.results && dData.results.length > 0 && d.id !== currentUser.uid) {
              foundResults = dData.results;
              foundProfile = dData;
            }
          });
          if (foundProfile && !docSnap.exists()) {
            data = foundProfile;
            updatedData = true;
          }
          if (foundResults) {
            data.results = foundResults;
            updatedData = true;
          }
        } catch (err) {
          console.warn('Fallback email results query failed:', err);
        }
      } else {
        updatedData = true;
      }
      
      if (updatedData) {
        setUserProfile(data);
        if (data.quizResults) {
          setMyQuizResults(Object.values(data.quizResults).sort((a,b) => b.timestamp - a.timestamp));
        }
      }
    });

    // Fetch user's saved resumes
    const qResumes = query(collection(db, 'resumes', currentUser.uid, 'drafts'), orderBy('updatedAt', 'desc'));
    const unsubResumes = onSnapshot(qResumes, (snap) => {
      setMyResumes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubQuizzes(); unsubMaterials(); unsubUser(); unsubResumes(); };
  }, [currentUser]);

  const computedProgressData = React.useMemo(() => {
    // If they have official results from Excel sync
    if (userProfile && userProfile.results && userProfile.results.length > 0) {
      return userProfile.results.map(r => ({
        name: r.subject,
        score: Math.round((Number(r.mark) || 0) / r.max * 100)
      }));
    }
    // Fallback to quiz results if no official results
    if (myQuizResults.length > 0) {
       return myQuizResults.slice(0, 10).reverse().map(q => ({
          name: q.topic || 'Quiz',
          score: q.percentage || 0
       }));
    }
    return [];
  }, [userProfile, myQuizResults]);

  const computedMasteryScore = React.useMemo(() => {
    if (computedProgressData.length === 0) return 0;
    const total = computedProgressData.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(total / computedProgressData.length);
  }, [computedProgressData]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-mesh font-body-md overflow-hidden text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col transition-all duration-300 hidden md:flex">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-glow-teal">
            <span className="material-symbols-outlined text-white text-xl">link</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-headline-md tracking-wide">VidyaSetu</h1>
            <p className="text-[10px] uppercase tracking-widest text-secondary-container">Learning Bridge</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-secondary/10 border-l-4 border-secondary text-secondary-container font-bold' : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </button>
          <button onClick={() => navigate('/student-dashboard/tutor')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tutor' ? 'bg-secondary/10 border-l-4 border-secondary text-secondary-container font-bold' : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}`}>
            <BrainCircuit className="w-5 h-5" />
            <span className="text-sm">Pathfinder AI</span>
          </button>
          <button onClick={() => setActiveTab('results')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'results' ? 'bg-secondary/10 border-l-4 border-secondary text-secondary-container font-bold' : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}`}>
            <Target className="w-5 h-5" />
            <span className="text-sm">My Results</span>
          </button>
          <button onClick={() => setActiveTab('library')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'library' ? 'bg-secondary/10 border-l-4 border-secondary text-secondary-container font-bold' : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm">My Library</span>
          </button>
          
          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Career Hub</p>
          </div>
          <button onClick={() => navigate('/student-dashboard/resume')} className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white group border-l-4 border-transparent transition-all">
            <div className="flex items-center gap-3">
              <FileBadge className="w-5 h-5 text-primary-inverse" />
              <span className="text-sm">Create Resume</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary-inverse" />
          </button>
          <button onClick={() => setActiveTab('resumes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'resumes' ? 'bg-secondary/10 border-l-4 border-secondary text-secondary-container font-bold' : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}`}>
            <FileBadge className="w-5 h-5" />
            <span className="text-sm">My Saved Resumes</span>
          </button>
          <button onClick={() => setActiveTab('roadmap')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'roadmap' ? 'bg-secondary/10 border-l-4 border-secondary text-secondary-container font-bold' : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'}`}>
            <Map className="w-5 h-5 text-secondary" />
            <span className="text-sm text-secondary">Career Roadmap</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:text-error/80 transition-colors rounded-lg hover:bg-error/10">
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto scroll-smooth">
        
        {/* Top Header */}
        <header className="h-20 glass-card border-b border-white/20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-headline-md text-slate-900 font-semibold">Hello, {currentUser?.email?.split('@')[0] || 'Student'}</h2>
            <p className="text-sm text-slate-500">Ready to bridge the gap in your learning today?</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search topics..." className="pl-9 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-secondary/20 transition-all w-64" />
            </div>
            <button className="p-2 relative text-slate-500 hover:text-secondary transition-colors bg-surface-container-low rounded-full">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-secondary-container border-2 border-white shadow-sm flex items-center justify-center text-on-secondary-container font-bold">
              {currentUser?.email?.[0].toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Top Row: Mastery & Quick Actions */}
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in-up">
            
            {/* Mastery Score Card (Takes 1 column) */}
            <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between text-white">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-primary-fixed" />
                  <h3 className="text-sm font-semibold text-primary-fixed uppercase tracking-wider">Mastery Score</h3>
                </div>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-5xl font-display-lg font-bold text-white">{computedMasteryScore}</span>
                  <span className="text-lg text-primary-fixed">/100</span>
                </div>
                <p className="text-xs text-primary-fixed mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-secondary-container" />
                  +12 points this week
                </p>
              </div>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 right-0 p-4 z-10">
                <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center">
                   <Sparkles className="w-8 h-8 text-secondary-container" />
                </div>
              </div>
            </div>

            {/* Action Cards (Takes 3 columns) */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Upload Notes */}
              <div 
                onClick={() => !isGeneratingNotes && fileInputRef.current?.click()}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-all group cursor-pointer"
              >
                <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleUploadNotes} className="hidden" />
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  {isGeneratingNotes ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-600 group-hover:text-primary transition-colors" />}
                </div>
                <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-2">Upload Notes</h3>
                <p className="text-xs text-slate-500 mb-4 flex-1">Upload your PDF notes to generate custom Mastery Notes instantly.</p>
                <button disabled={isGeneratingNotes} className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                  {isGeneratingNotes ? 'Generating...' : 'Upload file'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Ask Pathfinder AI */}
              <div 
                onClick={() => navigate('/student-dashboard/tutor')}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-all group cursor-pointer border-l-4 hover:border-l-secondary"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <BrainCircuit className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-2">Ask Pathfinder AI</h3>
                <p className="text-xs text-slate-500 mb-4 flex-1">Stuck on a concept? Chat with our AI tutor for step-by-step explanations.</p>
                <button className="text-sm font-medium text-secondary flex items-center gap-1 group-hover:gap-2 transition-all">
                  Start Session <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Take Adaptive Quiz */}
              <div 
                onClick={() => navigate('/student-dashboard/quiz')}
                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-primary-fixed transition-colors">
                  <HelpCircle className="w-6 h-6 text-slate-600 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-2">Adaptive Quiz</h3>
                <p className="text-xs text-slate-500 mb-4 flex-1">Test your knowledge with quizzes that adapt to your skill level.</p>
                <button className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                  Take a Quiz <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </section>

          {/* Middle Row: Progress Graph & Recommended Topics */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Progress Graph */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-headline-md text-xl text-slate-900 font-medium">Subject Performance</h3>
                  <p className="text-xs text-slate-500">Your recent scores across subjects</p>
                </div>
                <select className="bg-surface-container-low border-none text-sm rounded-lg py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer">
                  <option>Overall</option>
                  <option>Mathematics</option>
                  <option>Science</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                  <AreaChart data={computedProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assigned Quizzes & Materials */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col max-h-[400px] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline-md text-xl text-slate-900 font-medium">Classroom Updates</h3>
              </div>
              
              <div className="flex-1 space-y-3">
                {materials.length === 0 && quizzes.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-4">No recent updates.</div>
                )}

                {/* Display Materials */}
                {materials.map((m) => {
                  const getYouTubeEmbedUrl = (url) => {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                    const match = url.match(regExp);
                    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
                  };
                  const embedUrl = getYouTubeEmbedUrl(m.link);

                  return (
                    <div key={m.id} 
                      onClick={() => embedUrl ? setSelectedVideo(embedUrl) : window.open(m.link, '_blank')} 
                      className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-100 text-blue-700">Material</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" /> {m.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">{m.subject}</p>
                    </div>
                  );
                })}

                {/* Display Quizzes */}
                {quizzes.map((quiz) => (
                  <div key={quiz.id} 
                    onClick={() => {
                      const quizPayload = encodeURIComponent(JSON.stringify(quiz.questions));
                      navigate(`/student-dashboard/quiz?data=${quizPayload}&id=${quiz.id}&topic=${encodeURIComponent(quiz.topic)}`);
                    }}
                    className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 hover:bg-orange-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-100 text-orange-700">Quiz</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-orange-600 transition-colors">
                      {quiz.topic}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      Subject: <span className="font-medium text-slate-700">{quiz.subject}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </section>
        </div>
        )}

        {activeTab === 'results' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h3 className="font-headline-md text-2xl text-slate-900 font-bold flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary" /> My Academic Results
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Detailed subject-wise breakdown of your performance</p>
                </div>
                {userProfile?.results && userProfile.results.length > 0 && (
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Status</p>
                      {userProfile.results.some(r => !r.isPass) ? (
                        <span className="bg-error/10 text-error px-3 py-1 rounded-md text-sm font-bold">Failed</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm font-bold">Passed</span>
                      )}
                    </div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Percentage</p>
                      <span className="font-bold text-slate-900 text-lg">
                        {((userProfile.results.reduce((s, r) => s + (typeof r.mark === 'number' ? r.mark : 0), 0) / 
                           userProfile.results.reduce((s, r) => s + r.max, 0)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {userProfile?.results && userProfile.results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userProfile.results.map((res, i) => (
                    <div key={i} className={`p-5 rounded-2xl border-2 transition-all hover:-translate-y-1 hover:shadow-md ${res.isPass ? 'border-green-100 bg-gradient-to-br from-green-50/50 to-white' : 'border-error/20 bg-gradient-to-br from-error/5 to-white'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-slate-800 text-sm md:text-base leading-tight pr-2">{res.subject}</h4>
                        {res.isPass ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">Pass</span>
                        ) : (
                          <span className="bg-error text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">Fail</span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                            <span>Score</span>
                            <span>{res.mark} / {res.max}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${res.isPass ? 'bg-green-500' : 'bg-error'}`} 
                              style={{ width: `${Math.min(100, Math.max(0, (Number(res.mark) || 0) / res.max * 100))}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-white px-3 py-2 rounded-lg border border-slate-100">
                          <Target className="w-3.5 h-3.5 opacity-50" />
                          Passing Mark: {res.pass}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-700 mb-2">No Results Found</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">We couldn't find any academic results linked to your account yet. If you believe this is an error, please contact your administrator.</p>
                </div>
              )}
            </div>

            {/* Quiz Results Section */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-md text-xl text-slate-900 font-bold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-secondary" /> Quiz Results
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Topic</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myQuizResults.map((result) => (
                      <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <span className="font-medium text-slate-900">{result.topic || 'General Quiz'}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${result.percentage >= 70 ? 'text-secondary' : result.percentage >= 50 ? 'text-amber-500' : 'text-error'}`}>
                              {result.percentage}%
                            </span>
                            <span className="text-xs text-slate-500">({result.score}/{result.total})</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {new Date(result.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {myQuizResults.length === 0 && (
                      <tr><td colSpan="3" className="text-center py-12 text-slate-500">No quiz attempts yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="mb-8">
                <h3 className="font-headline-md text-2xl text-slate-900 font-bold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" /> My Library
                </h3>
                <p className="text-sm text-slate-500 mt-1">All your assigned study materials, notes, and worksheets in one place.</p>
              </div>

              {materials.length === 0 ? (
                <div className="text-center text-slate-400 py-12">No materials available yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materials.map((m) => {
                    const getYouTubeEmbedUrl = (url) => {
                      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                      const match = url.match(regExp);
                      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
                    };
                    const embedUrl = getYouTubeEmbedUrl(m.link);

                    return (
                      <div key={m.id} 
                        onClick={() => embedUrl ? setSelectedVideo(embedUrl) : window.open(m.link, '_blank')} 
                        className="bg-surface-container-low p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                          <PlayCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-headline-md text-lg text-slate-900 font-medium mb-2 group-hover:text-blue-600 transition-colors">
                          {m.title}
                        </h4>
                        <p className="text-sm text-slate-500 font-medium flex-1">{m.subject}</p>
                        <div className="mt-4 text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                          {embedUrl ? 'Watch Video' : 'Open Link'} <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Resumes Tab */}
        {activeTab === 'resumes' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-headline-md text-2xl text-slate-900 font-bold flex items-center gap-2">
                    <FileBadge className="w-6 h-6 text-primary" /> My Saved Resumes
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Access, edit, and export your resume drafts.</p>
                </div>
                <button onClick={() => navigate('/student-dashboard/resume')} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-md shadow-primary/20 transition-all">
                  Create New Resume
                </button>
              </div>

              {myResumes.length === 0 ? (
                <div className="text-center text-slate-400 py-12">No saved resumes found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myResumes.map((resume) => (
                    <div key={resume.id} 
                      onClick={() => navigate(`/student-dashboard/resume?id=${resume.id}`)}
                      className="bg-surface-container-low p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <FileBadge className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-headline-md text-lg text-slate-900 font-medium mb-1 group-hover:text-primary transition-colors">
                        {resume.name || 'Untitled Resume'}
                      </h4>
                      <p className="text-xs text-slate-400 mb-4">
                        Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-500 font-medium flex-1">
                        Template: <span className="uppercase">{resume.template || 'ATS'}</span>
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <div 
                          className="text-xs font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all"
                          onClick={(e) => { e.stopPropagation(); navigate(`/student-dashboard/resume?id=${resume.id}`); }}
                        >
                          Edit Resume <ChevronRight className="w-4 h-4" />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedResumeForAts(resume); setAtsModalOpen(true); setJdText(''); setAtsAnalysis(null); }}
                          className="px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-xs font-bold hover:bg-secondary/20 transition-colors"
                        >
                          Analyze JD
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Roadmap Tab */}
        {activeTab === 'roadmap' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="mb-8">
                <h3 className="font-headline-md text-2xl text-slate-900 font-bold flex items-center gap-2">
                  <Map className="w-6 h-6 text-primary" /> Career Roadmap Generator
                </h3>
                <p className="text-sm text-slate-500 mt-1">Get a personalized 3-month AI learning plan for your dream role.</p>
              </div>

              {!careerRoadmap ? (
                <div className="max-w-xl space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">What role are you targeting?</label>
                    <input 
                      type="text" 
                      className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 text-slate-700"
                      placeholder="e.g. Data Scientist, Frontend Developer, DevOps Engineer"
                      value={roadmapRole}
                      onChange={(e) => setRoadmapRole(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleGenerateRoadmap}
                    disabled={isGeneratingRoadmap || !roadmapRole.trim()}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto transition-all"
                  >
                    {isGeneratingRoadmap ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Map className="w-5 h-5" /> Generate Roadmap</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Target Role</span>
                      <h4 className="text-lg font-bold text-slate-900">{roadmapRole}</h4>
                    </div>
                    <button 
                      onClick={() => { setCareerRoadmap(null); setRoadmapRole(''); }}
                      className="text-sm text-slate-500 hover:text-primary transition-colors"
                    >
                      Start Over
                    </button>
                  </div>
                  <div className="prose prose-slate max-w-none bg-surface-container-low p-6 md:p-8 rounded-2xl border border-slate-100">
                    <ReactMarkdown>{careerRoadmap}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-black rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-4 flex justify-end bg-black">
              <button onClick={() => setSelectedVideo(null)} className="text-white/50 hover:text-white transition-colors bg-white/10 rounded-full p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="relative w-full pb-[56.25%]">
              <iframe 
                src={selectedVideo} 
                className="absolute top-0 left-0 w-full h-full border-0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Mastery Notes Modal */}
      {masteryNotes && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 md:p-8 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-headline-md font-bold text-slate-900 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-primary" /> Mastery Notes
              </h2>
              <button onClick={() => setMasteryNotes(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 prose prose-slate max-w-none">
              <ReactMarkdown>{masteryNotes}</ReactMarkdown>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button onClick={() => setMasteryNotes(null)} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATS Analysis Modal */}
      {atsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl relative flex flex-col overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-headline-md text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" /> ATS & Interview Analyzer
                </h3>
                <p className="text-sm text-slate-500 mt-1">Analyzing: <span className="font-medium text-slate-700">{selectedResumeForAts?.name}</span></p>
              </div>
              <button onClick={() => { setAtsModalOpen(false); setAtsAnalysis(null); setCoverLetter(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {!atsAnalysis ? (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block">Paste Job Description (JD)</label>
                    <textarea 
                      rows={8}
                      className="w-full border-none bg-surface-container-low rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 text-slate-700"
                      placeholder="Paste the full job description here..."
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleAnalyzeAts}
                      disabled={isAnalyzingAts || !jdText.trim()}
                      className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                      {isAnalyzingAts ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : 'Analyze Resume Match'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  {/* Score */}
                  <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * atsAnalysis.score) / 100} className={atsAnalysis.score >= 80 ? "text-green-500 transition-all duration-1000" : atsAnalysis.score >= 60 ? "text-yellow-500 transition-all duration-1000" : "text-red-500 transition-all duration-1000"} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{atsAnalysis.score}%</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-headline-md text-lg font-bold text-slate-900 mb-1">Match Score</h4>
                      <p className="text-sm text-slate-600">Your resume has a {atsAnalysis.score}% keyword and skill match with this job description.</p>
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  <div className="space-y-3">
                    <h4 className="font-headline-md text-base font-bold text-slate-900 flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500" /> Missing Keywords to Add
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {atsAnalysis.missingKeywords?.length > 0 ? atsAnalysis.missingKeywords.map((kw, i) => (
                        <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-100">{kw}</span>
                      )) : <span className="text-sm text-green-600 font-medium">Your resume covers all major keywords!</span>}
                    </div>
                  </div>

                  {/* Expected Interview Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-headline-md text-base font-bold text-slate-900">🧠 Expected HR Questions</h4>
                      <ul className="space-y-2">
                        {atsAnalysis.hrQuestions?.map((q, i) => (
                          <li key={i} className="text-sm text-slate-700 bg-surface-container-low p-3 rounded-xl border border-slate-100">{q}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-headline-md text-base font-bold text-slate-900">💻 Expected Technical Questions</h4>
                      <ul className="space-y-2">
                        {atsAnalysis.technicalQuestions?.map((q, i) => (
                          <li key={i} className="text-sm text-slate-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Cover Letter Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="font-headline-md text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileBadge className="w-4 h-4 text-primary" /> AI Cover Letter
                      </h4>
                      {!coverLetter && (
                        <button 
                          onClick={handleGenerateCoverLetter} 
                          disabled={isGeneratingCoverLetter}
                          className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          {isGeneratingCoverLetter ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {isGeneratingCoverLetter ? 'Generating...' : 'Auto-Generate'}
                        </button>
                      )}
                    </div>
                    {coverLetter && (
                      <div className="relative group">
                        <textarea 
                          readOnly 
                          className="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 text-sm text-slate-700 min-h-[200px]" 
                          value={coverLetter}
                        ></textarea>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(coverLetter); alert('Copied to clipboard!'); }}
                          className="absolute top-4 right-4 p-2 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-500 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button onClick={() => { setAtsAnalysis(null); setCoverLetter(null); }} className="text-sm font-medium text-slate-500 hover:text-slate-900">
                      Analyze another JD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
