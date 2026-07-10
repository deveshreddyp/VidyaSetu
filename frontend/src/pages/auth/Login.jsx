import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    try { setError(''); setLoading(true); await login(email, password); navigate('/'); }
    catch (err) { setError('Failed to sign in: ' + err.message); }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try { setError(''); setLoading(true); await loginWithGoogle(); navigate('/'); }
    catch (err) { setError('Failed to sign in with Google: ' + err.message); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-mesh flex relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      {/* Left Branding Panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 animate-fade-in-up">
          <img src="/logo.jpeg" alt="VidyaSetu Logo" className="w-16 h-16 object-contain rounded-xl shadow-glow-purple bg-white p-1 mb-8" />
          <h1 className="text-5xl font-headline-md text-white font-bold leading-tight mb-4">
            Welcome to<br /><span className="text-gradient">VidyaSetu AI</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Bridging the gap in education with AI-powered learning, smart assessments, and career guidance.
          </p>
          <div className="flex gap-4 mt-10">
            {['AI Tutor', 'Smart Quizzes', 'Resume Builder'].map((f, i) => (
              <div key={f} className="glass-card-dark px-4 py-2 rounded-full text-xs text-slate-300 font-medium animate-fade-in-up" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 relative z-10">
        <div className="w-full max-w-md mx-auto animate-scale-in">
          
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.jpeg" alt="VidyaSetu Logo" className="w-14 h-14 object-contain rounded-xl shadow-glow-purple bg-white p-1 mx-auto mb-3" />
            <h2 className="text-2xl font-headline-md text-slate-900 font-bold">VidyaSetu AI</h2>
          </div>

          <h2 className="text-3xl font-headline-md text-slate-900 font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">Create one <ArrowRight className="w-3 h-3 inline" /></Link>
          </p>

          <div className="mt-8 glass-card rounded-3xl p-8 shadow-glass">
            {error && (
              <div className="mb-5 bg-error/10 border border-error/20 text-error p-3 rounded-xl text-sm animate-fade-in flex items-center gap-2">
                <span className="w-2 h-2 bg-error rounded-full shrink-0" /> {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/85 text-white rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button onClick={handleGoogleLogin} disabled={loading}
              className="w-full py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-sm">
              <img className="h-5 w-5" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
