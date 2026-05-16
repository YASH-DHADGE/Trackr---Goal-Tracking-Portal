import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, CheckCircle2, Clock, AlertCircle, Loader2, X } from 'lucide-react';
import apiClient from '../../api/client';
import CheckinView from './CheckinView';

interface Cycle { id: string; name: string; status: string; }
interface GoalSheet { id: string; status: string; submitted_at: string | null; rework_note?: string; }
interface Goal {
  id: string; title: string; thrust_area: string; weightage: number;
  uom_type: string; target_value_numeric: string | null; target_value_text: string | null;
  deadline_date: string | null; is_locked: boolean;
  is_shared?: boolean; shared_goal_group_id?: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  rework_requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-purple-100 text-purple-700',
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  
  useEffect(() => {
    if (role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (role === 'manager') navigate('/manager/dashboard', { replace: true });
  }, [role, navigate]);

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetCreating, setSheetCreating] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sheet' | 'q1' | 'q2' | 'q3' | 'q4'>('sheet');
  const [windows, setWindows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [goalForm, setGoalForm] = useState({
    title: '', thrust_area: '', description: '', uom_type: 'max_numeric',
    target_value_numeric: '', target_value_text: '', deadline_date: '', weightage: '10',
  });
  const [goalSaving, setGoalSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Load cycles on mount
  useEffect(() => {
    apiClient.get('/cycles')
      .then(r => {
        const all: Cycle[] = r.data;
        setCycles(all);
        const active = all.find(c => c.status === 'active') || all[0] || null;
        setActiveCycle(active);
      })
      .catch(() => setError('Could not load review cycles.'))
      .finally(() => setLoading(false));
  }, []);

  // Load sheet + goals when active cycle changes
  useEffect(() => {
    if (!activeCycle) return;
    setSheet(null);
    setGoals([]);

    apiClient.get(`/goal-sheets/me/${activeCycle.id}`)
      .then(r => {
        const s = r.data;
        setSheet(s);
        if (s?.id) {
          return apiClient.get(`/goals?sheetId=${s.id}`).then(gr => setGoals(gr.data));
        }
      })
      .catch(() => {});

    apiClient.get(`/cycles/${activeCycle.id}/windows`)
      .then(r => setWindows(r.data))
      .catch(() => {});
  }, [activeCycle]);

  const createSheet = async () => {
    if (!activeCycle) return;
    setSheetCreating(true);
    try {
      const r = await apiClient.post('/goal-sheets', { cycleId: activeCycle.id });
      setSheet(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not create goal sheet.');
    } finally {
      setSheetCreating(false);
    }
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheet) return;
    setGoalSaving(true);
    try {
      const payload: any = {
        goal_sheet_id: sheet.id,
        title: goalForm.title,
        thrust_area: goalForm.thrust_area,
        description: goalForm.description,
        uom_type: goalForm.uom_type,
        weightage: parseFloat(goalForm.weightage),
      };
      if (goalForm.uom_type === 'timeline') payload.deadline_date = goalForm.deadline_date;
      else if (goalForm.target_value_numeric) payload.target_value_numeric = parseFloat(goalForm.target_value_numeric);
      if (goalForm.target_value_text) payload.target_value_text = goalForm.target_value_text;

      const r = await apiClient.post('/goals', payload);
      setGoals(prev => [...prev, r.data]);
      setShowAddGoal(false);
      setGoalForm({ title: '', thrust_area: '', description: '', uom_type: 'max_numeric', target_value_numeric: '', target_value_text: '', deadline_date: '', weightage: '10' });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not add goal.');
    } finally {
      setGoalSaving(false);
    }
  };

  const deleteGoal = async (goal: Goal) => {
    if (goal.is_shared) {
      setError('Shared goals cannot be deleted by employees.');
      return;
    }
    if (!window.confirm('Delete this goal?')) return;
    try {
      await apiClient.delete(`/goals/${goal.id}`);
      setGoals(prev => prev.filter(g => g.id !== goal.id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not delete goal.');
    }
  };

  const submitSheet = async () => {
    if (!sheet) return;
    try {
      const r = await apiClient.post(`/goal-sheets/${sheet.id}/submit`);
      setSheet(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not submit goal sheet.');
    }
  };

  const totalWeightage = goals.reduce((s, g) => s + Number(g.weightage), 0);
  const goalSettingWin = windows.find(w => w.window_type === 'goal_setting');
  const isGoalSettingOpen = !goalSettingWin || goalSettingWin.is_active;

  const isEditable = sheet && (sheet.status === 'draft' || sheet.status === 'rework_requested') && isGoalSettingOpen;
  const canSubmit = isEditable && goals.length > 0 && goals.length <= 8;

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
          <h2 className="text-2xl font-bold text-slate-800">My Goal Sheet</h2>
          <p className="text-slate-500 mt-1">
            Welcome, <span className="font-medium text-slate-700">{user.full_name || 'Employee'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {cycles.length > 1 && (
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              value={activeCycle?.id || ''}
              onChange={e => { setActiveCycle(cycles.find(c => c.id === e.target.value) || null); setActiveTab('sheet'); }}
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {!sheet && activeCycle && (
            <button
              onClick={createSheet} disabled={sheetCreating}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Start Goal Sheet
            </button>
          )}
        </div>
      </div>

      {sheet && (sheet.status === 'approved' || sheet.status === 'locked') && (
        <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-xl w-fit shadow-sm">
          {[
            { id: 'sheet', label: 'Goal Sheet' },
            { id: 'q1', label: 'Q1 Check-in' },
            { id: 'q2', label: 'Q2 Check-in' },
            { id: 'q3', label: 'Q3 Check-in' },
            { id: 'q4', label: 'Q4 Check-in' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab !== 'sheet' ? (
        activeCycle && <CheckinView cycleId={activeCycle.id} quarter={activeTab} goals={goals} windows={windows} />
      ) : (
        <>
          {/* Status Alert */}
          <div className="flex gap-2">
            {sheet && (
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[sheet.status] || 'bg-slate-100 text-slate-600'}`}>
                {sheet.status.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {!isGoalSettingOpen && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                GOAL SETTING CLOSED
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Target className="w-8 h-8" /></div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Goals</p>
                <p className="text-2xl font-bold text-slate-800">{goals.length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${totalWeightage === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Weightage</p>
                <p className={`text-2xl font-bold ${totalWeightage === 100 ? 'text-emerald-600' : 'text-slate-800'}`}>{totalWeightage}%</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CheckCircle2 className="w-8 h-8" /></div>
              <div>
                <p className="text-sm font-medium text-slate-500">Sheet Status</p>
                <p className="text-2xl font-bold text-slate-800 capitalize">
                  {sheet ? sheet.status.replace('_', ' ') : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!sheet && activeCycle && (
              <button
                onClick={createSheet} disabled={sheetCreating || !isGoalSettingOpen}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm"
              >
                {sheetCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Start Goal Sheet
              </button>
            )}
            {isEditable && (
              <>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Goal
                </button>
                <button
                  onClick={submitSheet} disabled={!canSubmit}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm"
                >
                  Submit
                </button>
              </>
            )}
          </div>

          {/* No cycle / No sheet placeholder */}
          {!activeCycle && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No review cycles found.</p>
              <p className="text-sm mt-1">Ask your admin to create a cycle.</p>
            </div>
          )}

          {activeCycle && !sheet && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No goal sheet yet for {activeCycle.name}.</p>
              <p className="text-sm mt-1">Click "Start Goal Sheet" to begin.</p>
            </div>
          )}

          {/* Rework note */}
          {sheet?.status === 'rework_requested' && sheet.rework_note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              <strong>Rework Requested:</strong> {sheet.rework_note}
            </div>
          )}

          {/* Goals list */}
          {goals.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Current Goals</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {goals.map(goal => (
                  <div key={goal.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-800">{goal.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{goal.thrust_area}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-4 h-4 text-slate-400" />
                            Weight: <span className="font-medium text-slate-700">{goal.weightage}%</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-slate-400" />
                            {goal.uom_type === 'timeline'
                              ? `Deadline: ${goal.deadline_date || '—'}`
                              : goal.target_value_numeric
                                ? `Target: ${goal.target_value_numeric}`
                                : goal.target_value_text || '—'}
                          </span>
                          {goal.is_locked && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Locked</span>
                          )}
                          {goal.is_shared && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <Users className="w-3 h-3" /> Shared Goal
                            </span>
                          )}
                        </div>
                      </div>
                      {isEditable && !goal.is_locked && (
                        <button
                          onClick={() => deleteGoal(goal)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={goal.is_shared ? "Shared goals cannot be deleted" : "Delete Goal"}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Goal Modal */}
          {showAddGoal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Add New Goal</h3>
                  <button onClick={() => setShowAddGoal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={addGoal} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Title *</label>
                      <input required value={goalForm.title} onChange={e => setGoalForm(f => ({...f, title: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Goal title" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Thrust Area *</label>
                      <input required value={goalForm.thrust_area} onChange={e => setGoalForm(f => ({...f, thrust_area: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Sales" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
                    <input value={goalForm.description} onChange={e => setGoalForm(f => ({...f, description: e.target.value}))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Brief description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Measurement Type *</label>
                      <select value={goalForm.uom_type} onChange={e => setGoalForm(f => ({...f, uom_type: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                        <option value="max_numeric">Max Numeric</option>
                        <option value="min_numeric">Min Numeric</option>
                        <option value="timeline">Timeline / Date</option>
                        <option value="zero_based">Zero Based</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Weightage (%) *</label>
                      <input type="number" min="10" max="100" required value={goalForm.weightage}
                        onChange={e => setGoalForm(f => ({...f, weightage: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                  </div>
                  {goalForm.uom_type === 'timeline' ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Deadline Date</label>
                      <input type="date" value={goalForm.deadline_date} onChange={e => setGoalForm(f => ({...f, deadline_date: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Target Value</label>
                      <input type="number" value={goalForm.target_value_numeric} onChange={e => setGoalForm(f => ({...f, target_value_numeric: e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. 150000" />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddGoal(false)}
                      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">
                      Cancel
                    </button>
                    <button type="submit" disabled={goalSaving}
                      className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors text-sm">
                      {goalSaving ? 'Adding...' : 'Add Goal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeDashboard;
