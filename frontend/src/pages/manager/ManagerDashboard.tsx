import { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, Search, ChevronRight, Loader2, X, Download, BarChart2 } from 'lucide-react';
import apiClient from '../../api/client';
import ManagerCheckinView from './ManagerCheckinView';
import PlannedVsActualTable from '../../components/PlannedVsActualTable';

interface Cycle { id: string; name: string; status: string; }
interface TeamSheet {
  id: string; status: string; submitted_at: string | null;
  employee_name: string; employee_email: string;
}
interface Goal {
  id: string; title: string; thrust_area: string; weightage: number;
  uom_type: string; target_value_numeric: string | null; target_value_text: string | null;
  deadline_date: string | null; is_locked: boolean;
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
  const [activeTab, setActiveTab] = useState<'goal_setting' | 'q1' | 'q2' | 'q3' | 'q4' | 'planned_vs_actual'>('goal_setting');
  const [actionGoals, setActionGoals] = useState<Goal[]>([]);
  const [plannedVsActual, setPlannedVsActual] = useState<any[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Goal>>({});
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
    setPlannedVsActual([]);
    
    apiClient.get(`/goal-sheets/team/${activeCycle.id}`)
      .then(r => { setTeam(r.data); setFiltered(r.data); })
      .catch(() => {});

    apiClient.get(`/goal-sheets/team/${activeCycle.id}/planned-vs-actual`)
      .then(r => setPlannedVsActual(r.data))
      .catch(() => {});
  }, [activeCycle]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(team.filter(m =>
      m.employee_name.toLowerCase().includes(q) || m.employee_email.toLowerCase().includes(q)
    ));
  }, [search, team]);

  const handleReview = async (member: TeamSheet) => {
    setActionSheet(member);
    setActionType(null);
    setReworkNote('');
    setEditingGoalId(null);
    setGoalsLoading(true);
    try {
      const r = await apiClient.get(`/goals?sheetId=${member.id}`);
      setActionGoals(r.data);
    } catch (e) {
      setError('Could not load goals for this sheet.');
    } finally {
      setGoalsLoading(false);
    }
  };

  const saveGoalEdit = async (goalId: string) => {
    try {
      const r = await apiClient.patch(`/goals/${goalId}`, editForm);
      setActionGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...r.data } : g));
      setEditingGoalId(null);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update goal.');
    }
  };

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

  const downloadAchievementReport = async () => {
    if (!activeCycle) return;
    try {
      const response = await apiClient.get(`/admin/reports/achievement/export?cycleId=${activeCycle.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `achievement_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert('Failed to download report');
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
        <div className="flex items-center gap-3">
          {cycles.length > 1 && (
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              value={activeCycle?.id || ''}
              onChange={e => { setActiveCycle(cycles.find(c => c.id === e.target.value) || null); setActiveTab('goal_setting'); }}
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {activeCycle && (
            <button 
              onClick={downloadAchievementReport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-xl w-fit shadow-sm overflow-x-auto max-w-full">
        {[
          { id: 'goal_setting', label: 'Goal Approvals' },
          { id: 'q1', label: 'Q1 Check-ins' },
          { id: 'q2', label: 'Q2 Check-ins' },
          { id: 'q3', label: 'Q3 Check-ins' },
          { id: 'q4', label: 'Q4 Check-ins' },
          { id: 'planned_vs_actual', label: 'Planned vs Actual' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'planned_vs_actual' ? (
        activeCycle && <PlannedVsActualTable data={plannedVsActual} />
      ) : activeTab !== 'goal_setting' ? (
        activeCycle && <ManagerCheckinView cycleId={activeCycle.id} quarter={activeTab} />
      ) : (
        <>
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
                            onClick={() => handleReview(member)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                          >
                            <Search className="w-4 h-4" /> Review
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
      {actionSheet && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Review Goal Sheet
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  {actionSheet.employee_name} ({actionSheet.employee_email})
                </p>
              </div>
              <button onClick={() => setActionSheet(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {goalsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
              ) : (
                <div className="space-y-4">
                  {actionGoals.map(goal => (
                    <div key={goal.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{goal.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">Thrust Area: {goal.thrust_area}</p>
                          
                          {editingGoalId === goal.id ? (
                            <div className="mt-4 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <div>
                                <label className="text-xs font-medium text-slate-700 block mb-1">Weightage (%)</label>
                                <input type="number" value={editForm.weightage || ''} onChange={e => setEditForm({...editForm, weightage: parseFloat(e.target.value)})}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                              </div>
                              {goal.uom_type === 'timeline' ? (
                                <div>
                                  <label className="text-xs font-medium text-slate-700 block mb-1">Deadline</label>
                                  <input type="date" value={editForm.deadline_date || ''} onChange={e => setEditForm({...editForm, deadline_date: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                                </div>
                              ) : goal.uom_type === 'zero_based' || goal.uom_type === 'max_numeric' || goal.uom_type === 'min_numeric' ? (
                                <div>
                                  <label className="text-xs font-medium text-slate-700 block mb-1">Target Numeric</label>
                                  <input type="number" value={editForm.target_value_numeric || ''} onChange={e => setEditForm({...editForm, target_value_numeric: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                                </div>
                              ) : (
                                <div>
                                  <label className="text-xs font-medium text-slate-700 block mb-1">Target Text</label>
                                  <input type="text" value={editForm.target_value_text || ''} onChange={e => setEditForm({...editForm, target_value_text: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-brand-500 outline-none" />
                                </div>
                              )}
                              <div className="col-span-2 flex gap-2 justify-end mt-2">
                                <button onClick={() => setEditingGoalId(null)} className="px-3 py-1 text-xs text-slate-600 border border-slate-200 hover:bg-slate-100 rounded">Cancel</button>
                                <button onClick={() => saveGoalEdit(goal.id)} className="px-3 py-1 text-xs text-white bg-brand-600 hover:bg-brand-700 rounded">Save</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-6 mt-3">
                              <span className="text-sm"><span className="text-slate-400">Weightage:</span> <span className="font-medium">{goal.weightage}%</span></span>
                              <span className="text-sm"><span className="text-slate-400">Target:</span> <span className="font-medium">
                                {goal.uom_type === 'timeline' ? goal.deadline_date : goal.target_value_numeric || goal.target_value_text || '—'}
                              </span></span>
                            </div>
                          )}
                        </div>
                        {!editingGoalId && (
                          <button onClick={() => { setEditingGoalId(goal.id); setEditForm(goal); }} className="text-brand-600 hover:text-brand-800 text-sm font-medium">Edit</button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {actionGoals.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-xl mt-4">
                      <strong>Total Weightage:</strong> {actionGoals.reduce((s,g)=>s+Number(g.weightage),0)}%
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0 bg-white">
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
              
              <div className="flex gap-3 justify-end">
                {!actionType ? (
                  <>
                    <button onClick={() => setActionType('rework')} className="px-5 py-2.5 rounded-xl font-medium border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">Request Rework</button>
                    <button onClick={() => setActionType('approve')} className="px-5 py-2.5 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Approve Sheet</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setActionType(null)} className="px-5 py-2.5 rounded-xl font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Back</button>
                    <button
                      onClick={handleAction}
                      disabled={actionLoading || (actionType === 'rework' && !reworkNote.trim())}
                      className={`px-5 py-2.5 rounded-xl text-white font-medium transition-colors disabled:opacity-60 ${
                        actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approve' : 'Send for Rework'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;
