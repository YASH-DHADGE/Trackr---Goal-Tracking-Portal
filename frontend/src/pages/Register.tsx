import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, Briefcase, IdCard } from 'lucide-react';
import apiClient from '../api/client';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    designation: '',
    employee_code: '',
    role: 'employee',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/');
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        designation: form.designation,
        employee_code: form.employee_code || undefined,
      });

      const { token, role, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('user', JSON.stringify(user));

      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'manager') navigate('/manager/dashboard');
      else navigate('/employee/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass rounded-3xl p-8 shadow-2xl border border-white/50">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Trackr Logo" className="w-20 h-20 object-contain drop-shadow-lg" />

        </div>
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-1">Create Account</h2>
        <p className="text-center text-slate-500 mb-6">Join the Trackr portal</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="text" name="full_name" required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="Jane Doe"
                value={form.full_name} onChange={handleChange}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="email" name="email" required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="you@company.com"
                value={form.email} onChange={handleChange}
              />
            </div>
          </div>

          {/* Designation & Employee Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text" name="designation"
                  className="w-full pl-9 pr-3 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm"
                  placeholder="Engineer"
                  value={form.designation} onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 ml-1">Emp. Code</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text" name="employee_code"
                  className="w-full pl-9 pr-3 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm"
                  placeholder="EMP-001"
                  value={form.employee_code} onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Role</label>
            <select
              name="role"
              className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              value={form.role} onChange={handleChange}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="password" name="password" required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="password" name="confirm_password" required
                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                placeholder="••••••••"
                value={form.confirm_password} onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
