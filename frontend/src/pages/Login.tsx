import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import apiClient from '../api/client';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'manager') navigate('/manager/dashboard');
      else navigate('/employee/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, role, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('user', JSON.stringify(user));

      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'manager') navigate('/manager/dashboard');
      else navigate('/employee/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass rounded-3xl p-8 shadow-2xl border border-white/50">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Trackr Logo" className="w-20 h-20 object-contain drop-shadow-lg" />

        </div>
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">Welcome Back</h2>
        <p className="text-center text-slate-500 mb-6">Sign in to your Trackr portal</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email" required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="you@company.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password" required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
