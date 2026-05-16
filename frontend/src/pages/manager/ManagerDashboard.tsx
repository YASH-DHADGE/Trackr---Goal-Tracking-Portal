import { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, Search, ChevronRight, Loader2, X, ThumbsUp, RefreshCw } from 'lucide-react';
import apiClient from '../../api/client';

interface Cycle { id: string; name: string; status: string; }
interface TeamSheet {
  id: string; status: string; submitted_at: string | null;
  employee_name: string; employee_email: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  rework_requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-purple-100 text-purple-700',
};

const ManagerDashboard = () => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [team, setTeam] = useState<TeamSheet[]>([]);
  const [filtered, setFiltered] = useState<TeamSheet[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionSheet, setActionSheet] = useState<TeamSheet | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'rework' | null>(null);
  const [reworkNote, setReworkNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    apiClient.get('/cycles')
      .then(r => {
        const all: Cycle[] = r.data;
        setCycles(all);
        const active = all.find(c => c.status === 'active') || all[0] || null;
        setActiveCycle(active);
      })
      .catch(() => setError('Could not load cycles.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeCycle) return;
    setTeam([]);
    apiClient.get(`/goal-sheets/team/${activeCycle.id}`)
      .then(r => { setTeam(r.data); setFiltered(r.data); })
      .catch(() => {});
  }, [activeCycle]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(team.filter(m =>
      m.employee_name.toLowerCase().includes(q) || m.employee_email.toLowerCase().includes(q)
    ));
  }, [search, team]);

  const handleAction = async () => {
    if (!actionSheet || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === 'approve') {
        await apiClient.patch(`/goal-sheets/${actionSheet.id}/approve`, { comments: '' });
      } else {
        await apiClient.patch(`/goal-sheets/${actionSheet.id}/rework`, { rework_note: reworkNote });
      }
      // Refresh team list
      const r = await apiClient.get(`/goal-sheets/team/${activeCycle!.id}`);
      setTeam(r.data);
      setActionSheet(null);
      setActionType(null);
      setReworkNote('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const approved = team.filter(m => m.status === 'approved' || m.status === 'locked').length;
  const pending = team.filter(m => m.status === 'submitted').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Team Dashboard</h2>
          <p className="text-slate-500 mt-1">
            Welcome, <span className="font-medium text-slate-700">{user.full_name || 'Manager'}</span>
            {activeCycle && <span className="text-slate-400"> · {activeCycle.name}</span>}
          </p>
        </div>
        {cycles.length > 1 && (
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            value={activeCycle?.id || ''}
            onChange={e => setActiveCycle(cycles.find(c => c.id === e.target.value) || null)}
          >
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Users className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Direct Reports</p>
            <p className="text-2xl font-bold text-slate-800">{team.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CheckCircle className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Goals Approved</p>
            <p className="text-2xl font-bold text-slate-800">{approved} / {team.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Clock className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Review</p>
            <p className="text-2xl font-bold text-slate-800">{pending}</p>
          </div>
        </div>
      </div>

      {/* Team table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-lg font-bold text-slate-800">Team Goal Sheets</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text" placeholder="Search team member..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">{team.length === 0 ? 'No team members found for this cycle.' : 'No results match your search.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Goal Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Submitted</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{member.employee_name}</p>
                      <p className="text-sm text-slate-500">{member.employee_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[member.status] || 'bg-slate-100 text-slate-600'}`}>
                        {member.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {member.submitted_at ? new Date(member.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {member.status === 'submitted' ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setActionSheet(member); setActionType('approve'); }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <ThumbsUp className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => { setActionSheet(member); setActionType('rework'); }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" /> Rework
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-sm font-medium text-slate-400">
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionSheet && actionType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {actionType === 'approve' ? '✅ Approve Goal Sheet' : '🔄 Request Rework'}
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              {actionSheet.employee_name}'s goal sheet
            </p>
            {actionType === 'rework' && (
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 block mb-1">Reason for rework *</label>
                <textarea
                  rows={3} required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                  placeholder="Explain what needs to be changed..."
                  value={reworkNote} onChange={e => setReworkNote(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setActionSheet(null); setActionType(null); }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || (actionType === 'rework' && !reworkNote.trim())}
                className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors text-sm disabled:opacity-60 ${
                  actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approve' : 'Send for Rework'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
