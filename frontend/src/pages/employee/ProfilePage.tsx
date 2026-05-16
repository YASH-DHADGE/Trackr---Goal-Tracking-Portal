import { useState, useEffect } from 'react';
import { User, Shield, Briefcase, Calendar, MapPin, Loader2, Camera } from 'lucide-react';
import apiClient from '../../api/client';

const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => setError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
      <p className="text-slate-500 animate-pulse">Loading your profile...</p>
    </div>
  );

  if (error || !user) return (
    <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
      {error || 'User not found'}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Profile Card */}
      <div className="relative card overflow-hidden">
        {/* Cover Pattern */}
        <div className="h-32 bg-gradient-to-r from-brand-600 to-sky-500 opacity-90"></div>
        
        <div className="px-8 pb-8">
          <div className="relative -mt-16 flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-2xl">
                <div className="w-full h-full rounded-[1.25rem] bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-slate-900 dark:text-slate-100 text-4xl font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
              <button className="absolute bottom-2 right-2 btn btn-outline p-2">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 mb-2">
              <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-100">{user.full_name}</h1>
              <p className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2 mt-1">
                {user.designation || 'Staff Member'}
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="capitalize">{user.role}</span>
              </p>
            </div>
            
            <div className="flex gap-3 mb-2">
              <span className={`badge ${user.is_active ? 'badge-success' : 'badge-neutral'}`}>
                {user.is_active ? 'Active Account' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-100 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-500" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Full Name</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{user.full_name}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Email Address</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{user.email}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Employee Code</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{user.employee_code}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">System Role</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand-500" />
              Work & Organization
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Department</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{user.department_id || 'Not Assigned'}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Designation</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{user.designation || 'Staff'}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Reporting Manager</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{user.manager_name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="label text-slate-600 dark:text-slate-400">Joined Date</p>
                <p className="text-slate-700 dark:text-slate-100 font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Stats/Actions */}
        <div className="space-y-6">
          <div className="card p-8 bg-slate-200 text-slate-900 border-slate-300/70">
            <h3 className="text-lg font-bold mb-4">Security</h3>
            <p className="text-slate-600 text-sm mb-6">Keep your account secure by managing your password and sessions.</p>
            <button className="btn btn-outline w-full">
              <Shield className="w-4 h-4" />
              Change Password
            </button>
          </div>

          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-100 mb-4">Quick Links</h3>
            <div className="space-y-3">
              <button className="btn btn-ghost w-full justify-between text-slate-700 dark:text-slate-100">
                <span className="flex items-center gap-3"><Calendar className="w-4 h-4" /> My Calendar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button className="btn btn-ghost w-full justify-between text-slate-700 dark:text-slate-100">
                <span className="flex items-center gap-3"><MapPin className="w-4 h-4" /> Office Location</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default ProfilePage;
