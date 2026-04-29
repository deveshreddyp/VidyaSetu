import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { 
  LogOut, 
  UploadCloud, 
  FileText, 
  HelpCircle, 
  Bell, 
  Search, 
  Settings, 
  BookOpen, 
  Users, 
  LayoutDashboard,
  TrendingDown,
  Download,
  X,
  Video,
  Trophy
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// Mock data removed, now using real Firestore data

export default function TeacherDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('teacherDashboardTab') || 'dashboard';
  });

  React.useEffect(() => {
    localStorage.setItem('teacherDashboardTab', activeTab);
  }, [activeTab]);
  const [isMaterialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', subject: '', link: '' });
  const [studentsList, setStudentsList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [quizzesList, setQuizzesList] = useState([]);
  const [worksheetsList, setWorksheetsList] = useState([]);
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [analyticsSectionFilter, setAnalyticsSectionFilter] = useState('All');
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const fileInputRef = React.useRef(null);
  const [isUploadingStudents, setIsUploadingStudents] = useState(false);

  const handleUploadStudents = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStudents(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      let addCount = 0;
      let updateCount = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        for (const row of sheetData) {
          const keys = Object.keys(row);
          const emailKey = keys.find(k => k.toLowerCase().includes('email'));
          const nameKey = keys.find(k => k.toLowerCase().includes('name'));
          const usnKey = keys.find(k => k.toLowerCase().includes('usn'));
          
          const email = emailKey && row[emailKey] ? String(row[emailKey]).trim() : null;
          if (!email) continue;

          const results = [];
          keys.forEach(k => {
            const kl = k.toLowerCase();
            if (!kl.includes('email') && !kl.includes('name') && !kl.includes('usn') && !kl.includes('phone') && !kl.includes('mobile')) {
              if (typeof row[k] === 'number' || (!isNaN(Number(row[k])) && String(row[k]).trim() !== '')) {
                let max = 100;
                if (kl.includes('iat')) max = 50;
                const markValue = Number(row[k]);
                results.push({ 
                  subject: k, 
                  mark: markValue, 
                  max: max,
                  isPass: markValue >= (max * 0.4)
                });
              }
            }
          });

          const studentData = {
            email: email,
            name: nameKey && row[nameKey] ? String(row[nameKey]) : email.split('@')[0],
            usn: usnKey && row[usnKey] ? String(row[usnKey]) : '',
            role: 'student',
            section: sheetName,
            results: results,
          };

          // Try to find existing user doc by email and merge results into it
          const emailQuery = query(collection(db, 'users'), where('email', '==', email));
          const emailSnap = await getDocs(emailQuery);
          
          if (!emailSnap.empty) {
            // Update existing user doc(s) with results
            for (const existingDoc of emailSnap.docs) {
              await setDoc(doc(db, 'users', existingDoc.id), { results: results, section: sheetName }, { merge: true });
            }
            updateCount++;
          } else {
            // No existing user — create a new doc
            const newDocRef = doc(collection(db, 'users'));
            await setDoc(newDocRef, { ...studentData, createdAt: new Date().toISOString() });
            addCount++;
          }
        }
      }
      
      const total = addCount + updateCount;
      if (total > 0) {
        alert(`Successfully processed ${total} students! (${updateCount} updated, ${addCount} new)`);
      } else {
        alert('No valid student data found. Ensure your excel has an "Email" column.');
      }
    } catch (err) {
      console.error("Excel upload error:", err);
      alert('Failed to process Excel file');
    }
    setIsUploadingStudents(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  React.useEffect(() => {
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentsList(data);
    });

    const qMaterials = query(collection(db, 'materials'));
    const unsubMaterials = onSnapshot(qMaterials, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setMaterialsList(data);
    });

    const qResults = query(collection(db, 'quizResults'));
    const unsubResults = onSnapshot(qResults, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setQuizResults(data);
    });

    const qQuizzes = query(collection(db, 'quizzes'));
    const unsubQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setQuizzesList(data);
    });

    const qWorksheets = query(collection(db, 'worksheets'));
    const unsubWorksheets = onSnapshot(qWorksheets, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setWorksheetsList(data);
    });

    return () => { unsubStudents(); unsubMaterials(); unsubResults(); unsubQuizzes(); unsubWorksheets(); };
  }, []);

  // Compute Real Data
  const computedAnalyticsData = React.useMemo(() => {
    const subjectScores = {};
    const subjectCounts = {};

    const filteredStudents = analyticsSectionFilter === 'All' 
      ? studentsList 
      : studentsList.filter(s => s.section === analyticsSectionFilter);

    filteredStudents.forEach(student => {
      if (student.results && Array.isArray(student.results)) {
        student.results.forEach(res => {
          if (!subjectScores[res.subject]) {
            subjectScores[res.subject] = 0;
            subjectCounts[res.subject] = 0;
          }
          subjectScores[res.subject] += Math.round((Number(res.mark) || 0) / res.max * 100);
          subjectCounts[res.subject] += 1;
        });
      }
    });

    const filteredQuizzes = analyticsSectionFilter === 'All'
      ? quizResults
      : quizResults.filter(res => {
          const s = studentsList.find(st => st.email === res.studentEmail);
          return s && s.section === analyticsSectionFilter;
        });

    filteredQuizzes.forEach(res => {
      const subject = res.topic || 'General Quiz';
      if (!subjectScores[subject]) {
        subjectScores[subject] = 0;
        subjectCounts[subject] = 0;
      }
      subjectScores[subject] += res.percentage || 0;
      subjectCounts[subject] += 1;
    });

    return Object.keys(subjectScores).map(subject => ({
      name: subject,
      score: Math.round(subjectScores[subject] / subjectCounts[subject])
    }));
  }, [studentsList, quizResults, analyticsSectionFilter]);

  const computedWeakStudents = React.useMemo(() => {
    const weakMap = {};
    
    const filteredStudents = analyticsSectionFilter === 'All' 
      ? studentsList 
      : studentsList.filter(s => s.section === analyticsSectionFilter);

    filteredStudents.forEach(student => {
      if (student.results && Array.isArray(student.results)) {
        student.results.forEach(res => {
          if (!res.isPass) {
            const studentKey = student.email;
            if (!weakMap[studentKey]) {
              weakMap[studentKey] = {
                id: student.id,
                name: student.name || student.email.split('@')[0],
                subjects: [],
                scores: [],
                trend: 'down'
              };
            }
            if (!weakMap[studentKey].subjects.includes(res.subject)) {
              weakMap[studentKey].subjects.push(res.subject);
              weakMap[studentKey].scores.push(Math.round((Number(res.mark) || 0) / res.max * 100));
            }
          }
        });
      }
    });

    const filteredQuizzes = analyticsSectionFilter === 'All'
      ? quizResults
      : quizResults.filter(res => {
          const s = studentsList.find(st => st.email === res.studentEmail);
          return s && s.section === analyticsSectionFilter;
        });

    // Add failing quizzes
    filteredQuizzes.forEach(res => {
      if (res.percentage < 50) {
        const studentKey = res.studentEmail;
        if (!weakMap[studentKey]) {
          weakMap[studentKey] = {
            id: res.id, // Using quiz result ID if student ID not found
            name: res.studentEmail?.split('@')[0] || 'Unknown',
            subjects: [],
            scores: [],
            trend: 'down'
          };
        }
        const subj = res.topic || 'Quiz';
        if (!weakMap[studentKey].subjects.includes(subj)) {
          weakMap[studentKey].subjects.push(subj);
          weakMap[studentKey].scores.push(res.percentage);
        }
      }
    });

    return Object.values(weakMap).map(student => ({
      id: student.id,
      name: student.name,
      subject: student.subjects.join(', '),
      score: Math.round(student.scores.reduce((a, b) => a + b, 0) / student.scores.length),
      trend: student.trend
    })).sort((a, b) => a.score - b.score).slice(0, 5); // Take top 5
  }, [studentsList, quizResults, analyticsSectionFilter]);

  const computedRecentFiles = React.useMemo(() => {
    const files = [
      ...materialsList.map(m => ({ id: m.id, title: m.title, type: 'Material', date: new Date(m.createdAt).toLocaleString(), createdAt: new Date(m.createdAt).getTime() })),
      ...quizzesList.map(q => ({ id: q.id, title: q.topic, type: 'Quiz', date: new Date(q.createdAt).toLocaleString(), createdAt: new Date(q.createdAt).getTime() })),
      ...worksheetsList.map(w => ({ id: w.id, title: w.topic, type: 'Worksheet', date: new Date(w.createdAt).toLocaleString(), createdAt: new Date(w.createdAt).getTime() }))
    ];
    // Sort by timestamp descending
    files.sort((a, b) => b.createdAt - a.createdAt);
    return files.slice(0, 5); // Take most recent 5
  }, [materialsList, quizzesList, worksheetsList]);

  const handleShareMaterial = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'materials'), {
        teacherId: currentUser.uid,
        title: materialForm.title,
        subject: materialForm.subject,
        link: materialForm.link,
        createdAt: new Date().toISOString()
      });
      setMaterialModalOpen(false);
      setMaterialForm({ title: '', subject: '', link: '' });
      alert('Material shared successfully!');
    } catch (err) {
      alert('Failed to share material.');
    }
  };

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const availableSubjects = React.useMemo(() => {
    const subjects = new Set();
    studentsList.forEach(s => {
      if (s.results) s.results.forEach(r => subjects.add(r.subject));
    });
    return Array.from(subjects).sort();
  }, [studentsList]);

  const availableSections = React.useMemo(() => {
    const sections = new Set();
    studentsList.forEach(s => {
      if (s.section) sections.add(s.section);
    });
    return Array.from(sections).sort();
  }, [studentsList]);

  const filteredStudents = React.useMemo(() => studentsList.filter(student => {
    const matchesSection = sectionFilter === 'All' || student.section === sectionFilter;
    const searchLower = studentSearch.toLowerCase();
    const matchesSearch = student.email.toLowerCase().includes(searchLower) || 
                          (student.name && student.name.toLowerCase().includes(searchLower));
    
    let matchesStatus = true;
    const results = student.results || [];

    if (subjectFilter !== 'All') {
      const subjResult = results.find(r => r.subject === subjectFilter);
      if (!subjResult) {
         matchesStatus = false;
      } else {
         if (statusFilter === 'Passed') matchesStatus = subjResult.isPass;
         if (statusFilter === 'Failed') matchesStatus = !subjResult.isPass;
      }
    } else {
      if (statusFilter === 'Passed') matchesStatus = results.length > 0 && !results.some(r => !r.isPass);
      if (statusFilter === 'Failed') matchesStatus = results.some(r => !r.isPass);
    }

    return matchesSection && matchesSearch && matchesStatus;
  }), [studentsList, sectionFilter, studentSearch, subjectFilter, statusFilter]);

  return (
    <div className="flex h-screen bg-mesh font-body-md overflow-hidden text-slate-800">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col transition-all duration-300 hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-purple">
            <span className="material-symbols-outlined text-white text-xl">link</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-headline-md tracking-wide">VidyaSetu</h1>
            <p className="text-[10px] uppercase tracking-widest text-primary-fixed">Teacher Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('classes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'classes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Users className="w-5 h-5" />
            <span className="font-medium text-sm">My Classes</span>
          </button>
          <button onClick={() => setActiveTab('resources')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'resources' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <BookOpen className="w-5 h-5" />
            <span className="font-medium text-sm">Resources</span>
          </button>
          <button onClick={() => setActiveTab('quizzes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'quizzes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Quiz Results</span>
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
            <h2 className="text-2xl font-headline-md text-slate-900 font-semibold">Welcome back, {currentUser?.email?.split('@')[0] || 'Teacher'}</h2>
            <p className="text-sm text-slate-500">Here's what's happening with your classes today.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all w-64" />
            </div>
            <button className="p-2 relative text-slate-500 hover:text-primary transition-colors bg-surface-container-low rounded-full">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-primary-fixed border-2 border-white shadow-sm flex items-center justify-center text-primary font-bold">
              {currentUser?.email?.[0].toUpperCase() || 'T'}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Action Cards Row */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
            
            {/* Upload Students Card */}
            <div 
              onClick={() => !isUploadingStudents && fileInputRef.current?.click()}
              className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 hover:border-primary/30"
            >
              <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleUploadStudents} className="hidden" />
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-1">
                {isUploadingStudents ? 'Uploading...' : 'Sync Students Data'}
              </h3>
              <p className="text-xs text-slate-500 mb-4 px-4">Upload an Excel file to replace student data section-wise.</p>
              <button disabled={isUploadingStudents} className="px-5 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors w-full disabled:opacity-50">
                {isUploadingStudents ? 'Syncing...' : 'Upload Excel'}
              </button>
            </div>

            {/* Share Material Card */}
            <div 
              onClick={() => setMaterialModalOpen(true)}
              className="bg-white p-6 rounded-3xl shadow-card border border-slate-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 hover:border-secondary/30"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-1">Share Material</h3>
              <p className="text-xs text-slate-500 mb-4 px-4">Share YouTube links or materials to students' dashboard.</p>
              <button className="px-5 py-2 bg-secondary text-white rounded-full text-sm font-medium hover:bg-secondary/90 transition-colors w-full">
                Share Now
              </button>
            </div>

            {/* Generate Worksheet Card */}
            <div 
              onClick={() => navigate('/teacher-dashboard/worksheet')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:shadow-md transition-all hover:border-secondary/30"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-1">Generate Worksheet</h3>
              <p className="text-xs text-slate-500 mb-4 px-4">Create custom practice sheets based on current topics.</p>
              <button className="px-5 py-2 bg-secondary text-white rounded-full text-sm font-medium hover:bg-secondary/90 transition-colors w-full">
                Create New
              </button>
            </div>

            {/* Generate Quiz Card */}
            <div 
              onClick={() => navigate('/teacher-dashboard/quiz')}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
            >
              <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-headline-md text-lg text-slate-900 font-medium mb-1">Generate Quiz</h3>
              <p className="text-xs text-slate-500 mb-4 px-4">Quickly assemble multiple-choice or short-answer quizzes.</p>
              <button className="px-5 py-2 bg-primary-container text-on-primary-container rounded-full text-sm font-medium hover:bg-primary-fixed transition-colors w-full">
                Build Quiz
              </button>
            </div>

          </section>

          {/* Middle Row: Analytics & Alerts */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Analytics Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-headline-md text-xl text-slate-900 font-medium">Class Performance</h3>
                  <p className="text-xs text-slate-500">Average scores by subject</p>
                </div>
                <select 
                  className="bg-surface-container-low border-none text-sm rounded-lg py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer"
                  value={analyticsSectionFilter}
                  onChange={(e) => setAnalyticsSectionFilter(e.target.value)}
                >
                  <option value="All">All Sections</option>
                  {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                  <BarChart data={computedAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={40}>
                      {computedAnalyticsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score < 70 ? '#f472b6' : '#6b21a8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weak Student Alerts */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-headline-md text-xl text-slate-900 font-medium flex items-center gap-2">Needs Attention <span className="bg-error-container text-on-error-container text-xs font-bold px-2 py-0.5 rounded-md">{computedWeakStudents.length}</span></h3>
                </div>
                <select 
                  className="bg-surface-container-low border-none text-sm rounded-lg py-1 px-3 text-slate-600 focus:ring-0 cursor-pointer"
                  value={analyticsSectionFilter}
                  onChange={(e) => setAnalyticsSectionFilter(e.target.value)}
                >
                  <option value="All">All Sections</option>
                  {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              
              <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                {computedWeakStudents.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">All students are performing well!</p>
                ) : (
                  computedWeakStudents.map((student) => (
                    <div key={student.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{student.name}</h4>
                        <p className="text-xs text-error font-medium mb-2 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Struggling in {student.subject} ({student.score}%)
                        </p>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-error h-full rounded-full" style={{ width: `${student.score}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button onClick={() => setActiveTab('classes')} className="w-full mt-4 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors">
                View All Students
              </button>
            </div>

          </section>

          {/* Bottom Row: Recent Files */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-xl text-slate-900 font-medium">Recently Generated</h3>
              <button onClick={() => setActiveTab('resources')} className="text-sm text-primary font-medium hover:underline">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-surface-container-low text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl rounded-bl-xl">Resource Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date Generated</th>
                    <th className="px-6 py-4 rounded-tr-xl rounded-br-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {computedRecentFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          file.type === 'Worksheet' ? 'bg-secondary/10 text-secondary' : 
                          file.type === 'Quiz' ? 'bg-primary/10 text-primary' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {file.type === 'Worksheet' ? <FileText className="w-4 h-4" /> : 
                           file.type === 'Quiz' ? <HelpCircle className="w-4 h-4" /> : 
                           <BookOpen className="w-4 h-4" />}
                        </div>
                        {file.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{file.date}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {computedRecentFiles.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500">No recent files generated.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in-up">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-headline-md text-xl text-slate-900 font-medium">My Students</h3>
                  <p className="text-xs text-slate-500">List of all registered students in your classes</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search students..." 
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-48"
                    />
                  </div>
                  <select 
                    value={sectionFilter} 
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="bg-surface-container-low border-none text-sm rounded-xl py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer"
                  >
                    <option value="All">All Sections</option>
                    {availableSections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                  <select 
                    value={subjectFilter} 
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="bg-surface-container-low border-none text-sm rounded-xl py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer max-w-[150px] truncate"
                  >
                    <option value="All">All Subjects</option>
                    {availableSubjects.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-surface-container-low border-none text-sm rounded-xl py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer"
                  >
                    <option value="All">All Status</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <span className="bg-primary/10 text-primary font-bold px-3 py-2 rounded-xl text-sm">{filteredStudents.length} Students</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-surface-container-low text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl rounded-bl-xl">Student Details</th>
                      <th className="px-6 py-4">Section</th>
                      <th className="px-6 py-4 text-center">Performance</th>
                      <th className="px-6 py-4 rounded-tr-xl rounded-br-xl text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => (
                      <React.Fragment key={student.id}>
                        <tr 
                          onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer group ${expandedStudentId === student.id ? 'bg-slate-50' : ''}`}
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                              {student.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">{student.name || student.email.split('@')[0]}</span>
                              <span className="text-xs text-slate-400">{student.usn ? `${student.usn} • ` : ''}{student.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-secondary/10 text-secondary px-2.5 py-1 rounded-md text-xs font-bold">
                              Section {student.section || 'A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {(() => {
                              const results = student.results || [];
                              if (results.length === 0) return <span className="text-slate-400">-</span>;
                              const totalMarks = results.reduce((sum, res) => sum + (typeof res.mark === 'number' ? res.mark : 0), 0);
                              const totalMax = results.reduce((sum, res) => sum + res.max, 0);
                              const percent = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0;
                              return <span className="font-bold text-slate-800">{percent}%</span>;
                            })()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {(() => {
                              const results = student.results || [];
                              if (results.length === 0) return <span className="text-slate-400">N/A</span>;
                              const hasFailedAny = results.some(res => !res.isPass);
                              return hasFailedAny ? (
                                <span className="bg-error/10 text-error px-2.5 py-1 rounded-md text-xs font-bold">Failed</span>
                              ) : (
                                <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold">Passed</span>
                              );
                            })()}
                          </td>
                        </tr>
                        {expandedStudentId === student.id && (
                          <tr className="bg-slate-50/50">
                            <td colSpan="4" className="px-6 py-4 border-t border-slate-100">
                              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Detailed Performance</h4>
                                {student.results && student.results.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {student.results.map((res, i) => (
                                      <div key={i} className={`p-3 rounded-xl border ${res.isPass ? 'border-green-100 bg-green-50/30' : 'border-error/20 bg-error/5'}`}>
                                        <p className="text-xs font-medium text-slate-500 truncate" title={res.subject}>{res.subject}</p>
                                        <div className="flex justify-between items-end mt-1">
                                          <span className={`text-lg font-bold ${res.isPass ? 'text-slate-800' : 'text-error'}`}>{res.mark}</span>
                                          <span className="text-xs text-slate-400 mb-1">/ {res.max}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 italic">No detailed marks available for this student.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {studentsList.length === 0 && (
                      <tr><td colSpan="3" className="text-center py-8 text-slate-500">No students found in the database.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h3 className="font-headline-md text-2xl text-slate-900 font-bold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" /> Learning Resources
                </h3>
                <p className="text-sm text-slate-500 mt-1">Manage and share YouTube videos and PDF links with your students.</p>
              </div>
              <button onClick={() => setMaterialModalOpen(true)} className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-2 transition-all">
                <Video className="w-4 h-4" /> Share Material
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Published Materials</h4>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold">{materialsList.length} total</div>
              </div>
              <div className="p-6">
                {materialsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materialsList.map((mat) => (
                      <div key={mat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600">{mat.subject}</span>
                          <span className="text-xs text-slate-400">{new Date(mat.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 mb-2 leading-tight">{mat.title}</h4>
                        <a href={mat.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium mt-4">
                          <Video className="w-4 h-4" /> Open Link
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-700 mb-2">No Materials Published</h4>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">You haven't shared any learning resources yet. Click 'Share Material' to upload a YouTube link or PDF.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div>
                <h3 className="font-headline-md text-2xl text-slate-900 font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-primary" /> Quiz Results
                </h3>
                <p className="text-sm text-slate-500 mt-1">Track student performance on AI-generated and published quizzes.</p>
              </div>
              <button onClick={() => navigate('/teacher-dashboard/quiz')} className="px-6 py-3 bg-primary-fixed text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-all flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> New Quiz
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Recent Attempts</h4>
                <div className="bg-secondary/10 text-secondary px-3 py-1 rounded-lg text-xs font-bold">{quizResults.length} total</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Topic</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quizResults.map((result) => (
                      <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-slate-900">{result.studentEmail?.split('@')[0]}</div>
                          <div className="text-xs text-slate-500">{result.studentEmail}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-surface-container-low rounded-lg text-xs font-medium text-slate-700">
                            {result.topic || 'General Quiz'}
                          </span>
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
                          {new Date(result.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {quizResults.length === 0 && (
                      <tr><td colSpan="4" className="text-center py-12 text-slate-500">No quiz results found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Share Material Modal */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl relative animate-fade-in-up">
            <button onClick={() => setMaterialModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Share Material
            </h2>
            <form onSubmit={handleShareMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                <input required type="text" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" placeholder="e.g. Intro to Matrices Video" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                <input required type="text" value={materialForm.subject} onChange={e => setMaterialForm({...materialForm, subject: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link (YouTube or PDF URL)</label>
                <input required type="url" value={materialForm.link} onChange={e => setMaterialForm({...materialForm, link: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-medium shadow-md">Publish to Students</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
