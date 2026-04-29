import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
  ChevronLeft, ChevronRight, Printer, Loader2, Sparkles, 
  User, Briefcase, GraduationCap, Code, Award, Plus, Trash2, Save
} from 'lucide-react';
import ResumePreview from '../../components/ResumePreview';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';

const TEMPLATES = [
  { id: 'cmrit', name: 'CMRIT 2-Page', desc: 'Classic two-column academic format', color: 'bg-primary' },
  { id: 'ats', name: 'ATS Friendly', desc: 'Clean single-column, ATS-optimized', color: 'bg-slate-900' },
  { id: 'fresher', name: 'Fresher', desc: 'Modern layout for first-time job seekers', color: 'bg-secondary' },
];

const STEPS = ['Template', 'Personal', 'Education', 'Internship', 'Projects', 'Skills', 'Extras', 'Preview'];

const emptyExp = { role: '', company: '', duration: '', bullets: [''] };
const emptyEdu = { degree: '', institution: '', year: '', gpa: '' };

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState('ats');
  const [loadingBullets, setLoadingBullets] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [saving, setSaving] = useState(false);
  const printRef = useRef();

  const [data, setData] = useState({
    name: '', email: '', phone: '', address: '', linkedin: '', github: '', leetcode: '', summary: '',
    education: [{ ...emptyEdu }],
    experience: [{ ...emptyExp }], // Used for internships
    projects: [{ ...emptyExp }], // Used for projects
    skills: [], skillInput: '',
    cocurricular: '',
    certifications: '',
    achievements: '',
    dob: '', gender: '', nationality: 'Indian', permAddress: '', languages: '', hobbies: ''
  });

  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('id');
  const [draftName, setDraftName] = useState('Untitled Resume');

  useEffect(() => {
    const loadDraft = async () => {
      if (!currentUser) return;
      try {
        let snap;
        if (resumeId) {
          snap = await getDoc(doc(db, 'resumes', currentUser.uid, 'drafts', resumeId));
        } else {
          snap = await getDoc(doc(db, 'resumes', currentUser.uid)); // backward compatibility
        }
        if (snap && snap.exists()) {
          const loadedData = snap.data();
          if (loadedData.data) setData(loadedData.data);
          if (loadedData.template) setTemplate(loadedData.template);
          if (loadedData.name) setDraftName(loadedData.name);
        }
      } catch (e) {
        console.error("Error loading resume draft:", e);
      }
    };
    loadDraft();
  }, [currentUser, resumeId]);

  const saveDraft = async () => {
    if (!currentUser) return alert('Please login to save drafts.');
    const name = prompt("Enter a name for this resume draft:", draftName);
    if (!name) return;
    setDraftName(name);
    setSaving(true);
    try {
      const draftRef = resumeId 
        ? doc(db, 'resumes', currentUser.uid, 'drafts', resumeId)
        : doc(collection(db, 'resumes', currentUser.uid, 'drafts'));

      await setDoc(draftRef, {
        name,
        data,
        template,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      alert('Resume draft saved successfully!');
      if (!resumeId) navigate(`/student-dashboard/resume?id=${draftRef.id}`, { replace: true });
    } catch (e) {
      console.error("Error saving resume draft:", e);
      alert('Failed to save draft.');
    }
    setSaving(false);
  };

  const handlePrint = useReactToPrint({ content: () => printRef.current, documentTitle: `Resume_${data.name || 'Draft'}` });

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  // --- AI helpers ---
  const generateBullets = async (expIdx) => {
    const exp = data.experience[expIdx];
    if (!exp.role) return;
    setLoadingBullets(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/resume/bullets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: exp.role, company: exp.company, description: exp.bullets.join('. ') || exp.role }),
      });
      const json = await res.json();
      const updated = [...data.experience];
      updated[expIdx] = { ...updated[expIdx], bullets: json.bullets };
      update('experience', updated);
    } catch { alert('Backend not reachable'); }
    finally { setLoadingBullets(false); }
  };

  const suggestSkills = async () => {
    setLoadingSkills(true);
    try {
      const field = data.experience[0]?.role || data.education[0]?.degree || 'Computer Science';
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/resume/skills`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, currentSkills: data.skills }),
      });
      const json = await res.json();
      const all = [...(json.technical || []), ...(json.soft || [])];
      update('skills', [...new Set([...data.skills, ...all])]);
    } catch { alert('Backend not reachable'); }
    finally { setLoadingSkills(false); }
  };

  // --- Array helpers ---
  const addItem = (field, empty) => update(field, [...data[field], { ...empty }]);
  const removeItem = (field, idx) => update(field, data[field].filter((_, i) => i !== idx));
  const updateItem = (field, idx, key, val) => {
    const arr = [...data[field]]; arr[idx] = { ...arr[idx], [key]: val }; update(field, arr);
  };
  const addSkill = () => {
    if (data.skillInput.trim() && !data.skills.includes(data.skillInput.trim())) {
      update('skills', [...data.skills, data.skillInput.trim()]); update('skillInput', '');
    }
  };

  const fillMockData = () => {
    setData({
      name: 'John Doe', email: 'john.doe@example.com', phone: '+91 9876543210', address: 'Bangalore, India', 
      linkedin: 'linkedin.com/in/johndoe', github: 'github.com/johndoe', leetcode: 'leetcode.com/johndoe', 
      summary: 'Passionate computer science student with a strong foundation in software engineering and hands-on experience in full-stack development. Eager to leverage technical skills to build scalable and efficient solutions.',
      education: [
        { degree: 'B.E. Computer Science', institution: 'CMR Institute of Technology', year: '2023 - 2027', gpa: '9.2 CGPA' },
        { degree: 'Class 12th (PUC)', institution: 'Deeksha College', year: '2021 - 2023', gpa: '94%' }
      ],
      experience: [{ role: 'Frontend Developer Intern', company: 'Tech Solutions Inc.', duration: 'May 2024 - Jul 2024', bullets: ['Developed responsive UI components using React.js and TailwindCSS.', 'Collaborated with the backend team to integrate RESTful APIs.', 'Improved website load time by 15% through image optimization.'] }],
      projects: [
        { role: 'VidyaSetu Learning Platform', company: 'React, Node.js, Firebase', duration: '', bullets: ['Built a comprehensive e-learning platform with real-time database synchronization.', 'Implemented AI-driven quiz generation using Google Gemini.', 'Designed an intuitive Teacher Dashboard for analytics.'] },
        { role: 'AI Resume Analyzer', company: 'Python, Flask, NLP', duration: '', bullets: ['Developed an automated resume parsing engine using Natural Language Processing.', 'Achieved 92% accuracy in extracting key skills and experiences.', 'Created a clean REST API for frontend integration.'] }
      ],
      skills: [
        'Programming Languages: Python (Advanced), Java, C Programming, Scala, C++, SQL, JavaScript',
        'Database Management: MySQL, MongoDB (NoSQL), Vector Databases (FAISS/Milvus)',
        'Operating Systems: Windows, Linux (Ubuntu/Bash)',
        'Data Analysis & Visualization: Tableau, Power BI, Microsoft Excel',
        'AI & Frameworks: GraphRAG, LangChain, TensorFlow, Akka (Actor Model), React',
        'DevOps & Tools: Git, Docker, AWS, Visual Studio Code'
      ], skillInput: '',
      cocurricular: 'Hackathons:\n- Won 1st Prize at CMRIT TechFest Hackathon\nOnline Courses:\n- Advanced React Patterns (Udemy)',
      certifications: 'AWS Certified Cloud Practitioner',
      achievements: 'Secured Top 50 rank in National Level Coding Challenge\nAwarded Academic Excellence Scholarship 2023',
      dob: '15th August 2005', gender: 'Male', nationality: 'Indian', permAddress: '123 Tech Street, Layout, Bangalore', languages: 'English, Hindi, Kannada', hobbies: 'Open Source Contribution, Chess, Reading'
    });
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-slate-800 flex flex-col print:bg-white">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 print:hidden">
        <button onClick={() => navigate('/student-dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-secondary text-sm font-medium">
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="flex-1" />
        <h1 className="font-headline-md text-lg font-bold text-slate-900">CareerSetu Resume Builder</h1>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <button onClick={() => setStep(i)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === i ? 'bg-primary text-white shadow' : step > i ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>{s}
              </button>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > i ? 'bg-primary' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full print:p-0 print:max-w-none">

        {/* Step 0: Template Selection */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900">Choose a Template</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setTemplate(t.id); setStep(1); }}
                  className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md ${template === t.id ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-200 bg-white'}`}>
                  <div className={`w-10 h-10 rounded-xl ${t.color} mb-4`} />
                  <h3 className="font-bold text-slate-900">{t.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900 flex items-center gap-2"><User className="w-6 h-6 text-primary" />Personal Details</h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['name','Full Name'], ['address', 'Current Address'], ['email','Email'], ['phone','Phone'], ['linkedin','LinkedIn URL'], ['github','GitHub URL'], ['leetcode', 'LeetCode URL']].map(([k,l]) => (
                <div key={k}><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{l}</label>
                <input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={data[k]} onChange={e => update(k, e.target.value)} /></div>
              ))}
              <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Career Objective / Summary</label>
              <textarea rows={3} className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none" value={data.summary} onChange={e => update('summary', e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* Step 2: Education */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900 flex items-center gap-2"><GraduationCap className="w-6 h-6 text-primary" />Education</h2>
            {data.education.map((edu, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 relative">
                {data.education.length > 1 && <button onClick={() => removeItem('education', i)} className="absolute top-4 right-4 text-slate-400 hover:text-error"><Trash2 className="w-4 h-4" /></button>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['degree','Degree / Program'], ['institution','Institution'], ['year','Year'], ['gpa','GPA / Percentage']].map(([k,l]) => (
                    <div key={k}><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{l}</label>
                    <input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={edu[k]} onChange={e => updateItem('education', i, k, e.target.value)} /></div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => addItem('education', emptyEdu)} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"><Plus className="w-4 h-4" />Add Education</button>
          </div>
        )}

        {/* Step 3: Internship */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900 flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" />Internships</h2>
            {data.experience.map((exp, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 relative">
                {data.experience.length > 1 && <button onClick={() => removeItem('experience', i)} className="absolute top-4 right-4 text-slate-400 hover:text-error"><Trash2 className="w-4 h-4" /></button>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role / Designation</label><input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={exp.role} onChange={e => updateItem('experience', i, 'role', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company</label><input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={exp.company} onChange={e => updateItem('experience', i, 'company', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration</label><input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" placeholder="Jan 2024 - Present" value={exp.duration} onChange={e => updateItem('experience', i, 'duration', e.target.value)} /></div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Responsibilities</label>
                  </div>
                  {exp.bullets.map((b, bi) => (
                    <div key={bi} className="flex gap-2 mb-2">
                      <span className="text-slate-300 mt-3">•</span>
                      <input className="flex-1 bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={b}
                        onChange={e => { const bs = [...exp.bullets]; bs[bi] = e.target.value; updateItem('experience', i, 'bullets', bs); }} />
                      {exp.bullets.length > 1 && <button onClick={() => { const bs = exp.bullets.filter((_, j) => j !== bi); updateItem('experience', i, 'bullets', bs); }} className="text-slate-400 hover:text-error"><Trash2 className="w-3 h-3" /></button>}
                    </div>
                  ))}
                  <button onClick={() => updateItem('experience', i, 'bullets', [...exp.bullets, ''])} className="text-xs text-primary font-medium flex items-center gap-1 mt-1"><Plus className="w-3 h-3" />Add bullet</button>
                </div>
              </div>
            ))}
            <button onClick={() => addItem('experience', emptyExp)} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"><Plus className="w-4 h-4" />Add Internship</button>
          </div>
        )}

        {/* Step 4: Projects */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900 flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" />Projects</h2>
            {data.projects.map((exp, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 relative">
                {data.projects.length > 1 && <button onClick={() => removeItem('projects', i)} className="absolute top-4 right-4 text-slate-400 hover:text-error"><Trash2 className="w-4 h-4" /></button>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Title</label><input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={exp.role} onChange={e => updateItem('projects', i, 'role', e.target.value)} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tech Stack (Languages/Tools)</label><input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={exp.company} onChange={e => updateItem('projects', i, 'company', e.target.value)} /></div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Description / Subpoints (Max 4)</label>
                  </div>
                  {exp.bullets.map((b, bi) => (
                    <div key={bi} className="flex gap-2 mb-2">
                      <span className="text-slate-300 mt-3">•</span>
                      <input className="flex-1 bg-surface-container-low border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={b}
                        onChange={e => { const bs = [...exp.bullets]; bs[bi] = e.target.value; updateItem('projects', i, 'bullets', bs); }} />
                      {exp.bullets.length > 1 && <button onClick={() => { const bs = exp.bullets.filter((_, j) => j !== bi); updateItem('projects', i, 'bullets', bs); }} className="text-slate-400 hover:text-error"><Trash2 className="w-3 h-3" /></button>}
                    </div>
                  ))}
                  <button onClick={() => updateItem('projects', i, 'bullets', [...exp.bullets, ''])} className="text-xs text-primary font-medium flex items-center gap-1 mt-1"><Plus className="w-3 h-3" />Add subpoint</button>
                </div>
              </div>
            ))}
            <button onClick={() => addItem('projects', emptyExp)} className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"><Plus className="w-4 h-4" />Add Project</button>
          </div>
        )}

        {/* Step 5: Technical Skills */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900 flex items-center gap-2"><Code className="w-6 h-6 text-primary" />Technical Skills</h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex gap-2">
                <input placeholder="e.g. Programming Languages: Python, Java..." className="flex-1 bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={data.skillInput} onChange={e => update('skillInput', e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} />
                <button onClick={addSkill} className="px-4 bg-primary text-white rounded-xl text-sm font-medium">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((s, i) => (
                  <span key={i} className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    {s}<button onClick={() => update('skills', data.skills.filter((_, j) => j !== i))} className="hover:text-error"><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Extras */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="font-headline-md text-2xl font-semibold text-slate-900 flex items-center gap-2"><Award className="w-6 h-6 text-primary" />Extras & Details</h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['dob','Date of Birth (e.g., 3rd May 2025)'], ['gender','Gender'], ['nationality','Nationality'], ['languages','Linguistic Competency'], ['permAddress', 'Permanent Address'], ['hobbies', 'Hobbies (Max 3)']].map(([k,l]) => (
                <div key={k}><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{l}</label>
                <input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20" value={data[k]} onChange={e => update(k, e.target.value)} /></div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Co-curricular & Extra Curricular Activities</label>
                <textarea rows={4} className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Patent & Copyright:\nOnline Courses & Certification:\nHackathons:\nTechnical Club Activities:\nSeminars & Workshops:" value={data.cocurricular} onChange={e => update('cocurricular', e.target.value)} />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Awards & Achievements</label>
                <textarea rows={4} className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Secured..." value={data.achievements} onChange={e => update('achievements', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Preview */}
        {step === 7 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
              <h2 className="font-headline-md text-2xl font-semibold text-slate-900">Preview</h2>
              <div className="flex items-center gap-3">
                <button onClick={saveDraft} disabled={saving} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handlePrint} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-colors">
                  <Printer className="w-4 h-4" />Export PDF
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 print:border-none print:shadow-none print:p-0">
              <ResumePreview ref={printRef} data={data} template={template} />
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between items-center mt-8 print:hidden">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-6 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-30 flex items-center gap-1"><ChevronLeft className="w-4 h-4" />Back</button>
          <div className="flex items-center gap-4">
            <button onClick={fillMockData} className="px-6 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors">Fill Mock Data</button>
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep(step + 1)} className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
