import { useState, useEffect } from 'react';
import { Calendar, FileText, Database, Users, Plus, Loader2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import apiClient from '../../api/client';
import AdminReportsView from './AdminReportsView';
import AdminLogsView from './AdminLogsView';
import AdminSharedGoalsView from './AdminSharedGoalsView';
import AdminHierarchyView from './AdminHierarchyView';
import AdminAnalyticsView from './AdminAnalyticsView';
import SharedGoalModal from '../../components/SharedGoalModal';
import CycleWindowsModal from '../../components/CycleWindowsModal';
import { Target } from 'lucide-react';

interface User {
  id: string; full_name: string; email: string; role: string;
  designation: string | null; employee_code: string; is_active: boolean; created_at: string;
  manager_id?: string;
}
interface Cycle { id: string; name: string; status: string; start_date: string; end_date: string; }

const roleColors: Record<string, string> = {
  employee: 'bg-slate-100 text-slate-600',
  manager: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-purple-100 text-purple-700',
};

const cycleStatusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-700',
};

const AdminDashboard = () => {
  const [tab, setTab] = useState<'users' | 'cycles' | 'reports' | 'logs' | 'shared_goals' | 'analytics'>('analytics');
  const [userView, setUserView] = useState<'list' | 'tree'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddCycle, setShowAddCycle] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', start_date: '', end_date: '' });
  const [cycleLoading, setCycleLoading] = useState(false);
  const [showSharedGoalModal, setShowSharedGoalModal] = useState(false);
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [windowModalCycle, setWindowModalCycle] = useState<{id: string, name: string} | null>(null);

  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/users');
      setUsers(r.data);
    } catch { setError('Could not load users.'); }
    finally { setLoading(false); }
  };

  const loadCycles = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/cycles');
      setCycles(r.data);
      const active = r.data.find((c: any) => c.status === 'active') || r.data[0];
      if (active) setActiveCycleId(active.id);
    } catch { setError('Could not load cycles.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else loadCycles();
  }, [tab]);

  const changeRole = async (userId: string, role: string) => {
    try {
      const r = await apiClient.patch(`/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: r.data.role } : u));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update role.');
    }
  };

  const toggleUser = async (userId: string) => {
    try {
      const r = await apiClient.patch(`/users/${userId}/toggle`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: r.data.is_active } : u));
    } catch { setError('Failed to toggle user.'); }
  };

  const changeManager = async (employeeId: string, managerId: string) => {
    if (!managerId) return;
    try {
      await apiClient.post('/admin/reporting', { employee_id: employeeId, manager_id: managerId });
      setUsers(prev => prev.map(u => u.id === employeeId ? { ...u, manager_id: managerId } : u));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to assign manager.');
    }
  };

  const changeCycleStatus = async (cycleId: string, status: string) => {
    try {
      const r = await apiClient.patch(`/cycles/${cycleId}`, { status });
      setCycles(prev => prev.map(c => c.id === cycleId ? { ...c, status: r.data.status } : c));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update cycle.');
    }
  };

  const createCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCycleLoading(true);
    try {
      const r = await apiClient.post('/cycles', cycleForm);
      setCycles(prev => [r.data, ...prev]);
      setShowAddCycle(false);
      setCycleForm({ name: '', start_date: '', end_date: '' });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create cycle.');
    } finally {
      setCycleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Control Panel</h2>
          <p className="text-slate-500 mt-1">
            Welcome, <span className="font-medium text-slate-700">{loggedInUser.full_name || 'Admin'}</span> · Manage users, cycles, and system settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <TrendingUp className="w-8 h-8" />, label: 'Analytics', desc: 'Advanced performance insights', color: 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white', action: () => setTab('analytics') },
          { icon: <Calendar className="w-8 h-8" />, label: 'Review Cycles', desc: 'Create & manage FY cycles', color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white', action: () => setTab('cycles') },
          { icon: <Users className="w-8 h-8" />, label: 'User Management', desc: 'Manage roles & access', color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white', action: () => setTab('users') },
          { icon: <FileText className="w-8 h-8" />, label: 'Reports', desc: 'View completion reports', color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white', action: () => setTab('reports') },
          { icon: <Target className="w-8 h-8" />, label: 'Shared Goals', desc: 'Manage strategic KPIs', color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white', action: () => setTab('shared_goals') },
        ].map(item => (
          <div key={item.label}
            onClick={item.action}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group">
            <div className={`${item.color} p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-4 transition-colors`}>
              {item.icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{item.label}</h3>
            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 flex flex-wrap">
          {(['analytics', 'users', 'cycles', 'reports', 'logs', 'shared_goals'] as const).map(t => (
            <button key={t}
              onClick={() => setTab(t as any)}
              className={`px-6 py-4 text-sm font-semibold capitalize transition-colors ${tab === t ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'analytics' ? <><TrendingUp className="w-4 h-4 inline mr-1.5" />Analytics</> :
               t === 'users' ? <><Users className="w-4 h-4 inline mr-1.5" />Users</> : 
               t === 'cycles' ? <><Calendar className="w-4 h-4 inline mr-1.5" />Cycles</> :
               t === 'reports' ? <><FileText className="w-4 h-4 inline mr-1.5" />Reports</> :
               t === 'shared_goals' ? <><Target className="w-4 h-4 inline mr-1.5" />Shared Goals</> :
               <><Database className="w-4 h-4 inline mr-1.5" />Logs</>}
            </button>
          ))}
          {tab === 'users' && (
            <div className="ml-auto flex items-center gap-2 mr-4 my-2">
              <button onClick={() => setUserView('list')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${userView === 'list' ? 'bg-brand-100 text-brand-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>List View</button>
              <button onClick={() => setUserView('tree')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${userView === 'tree' ? 'bg-brand-100 text-brand-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Hierarchy Tree</button>
            </div>
          )}
          {tab === 'cycles' && (
            <button
              onClick={() => setShowAddCycle(true)}
              className="ml-auto mr-4 my-2 flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Cycle
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : tab === 'analytics' ? (
          <AdminAnalyticsView cycleId={activeCycleId} />
        ) : tab === 'reports' ? (
          <AdminReportsView />
        ) : tab === 'shared_goals' ? (
          <AdminSharedGoalsView cycleId={activeCycleId} />
        ) : tab === 'logs' ? (
          <AdminLogsView />
        ) : tab === 'users' ? (
          userView === 'tree' ? (
            <AdminHierarchyView />
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Manager</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{u.full_name}</p>
                        <p className="text-sm text-slate-500">{u.email}</p>
                        {u.designation && <p className="text-xs text-slate-400">{u.designation}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{u.employee_code}</td>
                      <td className="px-6 py-4">
                        {u.id === loggedInUser.id ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[u.role]}`}>{u.role}</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border-0 outline-none cursor-pointer ${roleColors[u.role]}`}
                          >
                            <option value="employee">employee</option>
                            <option value="manager">manager</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={u.manager_id || ''}
                          onChange={e => changeManager(u.id, e.target.value)}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium border border-slate-200 outline-none cursor-pointer w-full max-w-[150px]"
                        >
                          <option value="">No Manager</option>
                          {users.filter(m => (m.role === 'manager' || m.role === 'admin') && m.id !== u.id).map(m => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.id !== loggedInUser.id && (
                          <button onClick={() => toggleUser(u.id)} className="text-slate-400 hover:text-slate-700 transition-colors">
                            {u.is_active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          cycles.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No cycles yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Cycle</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Dates</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Windows</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Change Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cycles.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${cycleStatusColors[c.status] || 'bg-slate-100 text-slate-600'}`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => setWindowModalCycle({id: c.id, name: c.name})}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">
                          Configure Windows
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={c.status}
                          onChange={e => changeCycleStatus(c.id, e.target.value)}
                          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Add Cycle Modal */}
      {showAddCycle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-800">New Review Cycle</h3>
              <button onClick={() => setShowAddCycle(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={createCycle} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Cycle Name *</label>
                <input required value={cycleForm.name} onChange={e => setCycleForm(f => ({...f, name: e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="e.g. FY2027" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Start Date *</label>
                  <input type="date" required value={cycleForm.start_date} onChange={e => setCycleForm(f => ({...f, start_date: e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">End Date *</label>
                  <input type="date" required value={cycleForm.end_date} onChange={e => setCycleForm(f => ({...f, end_date: e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddCycle(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={cycleLoading}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors text-sm">
                  {cycleLoading ? 'Creating...' : 'Create Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Shared Goal Modal */}
      {showSharedGoalModal && (
        <SharedGoalModal 
          cycleId={activeCycleId} 
          onClose={() => setShowSharedGoalModal(false)}
          onSuccess={() => {
            setShowSharedGoalModal(false);
            // Optionally refresh something
          }}
        />
      )}
      {windowModalCycle && (
        <CycleWindowsModal
          cycleId={windowModalCycle.id}
          cycleName={windowModalCycle.name}
          onClose={() => setWindowModalCycle(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
