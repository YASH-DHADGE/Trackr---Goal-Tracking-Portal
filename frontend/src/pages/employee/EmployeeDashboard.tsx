import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, CheckCircle2, Clock, AlertCircle, Loader2, X, Users } from 'lucide-react';
import apiClient from '../../api/client';
import CheckinView from './CheckinView';
import GoalProgressBar from '../../components/GoalProgressBar';
import SkeletonLoader from '../../components/SkeletonLoader';

interface Cycle { id: string; name: string; status: string; }
interface GoalSheet { id: string; status: string; submitted_at: string | null; rework_note?: string; }
interface Goal {
  id: string; title: string; thrust_area: string; weightage: number;
  uom_type: string; target_value_numeric: string | null; target_value_text: string | null;
  deadline_date: string | null; is_locked: boolean;
  is_shared?: boolean; shared_goal_group_id?: string;
}

const statusColors: Record<string, string> = {
  draft: 'badge badge-neutral',
  submitted: 'badge badge-info',
  rework_requested: 'badge badge-warning',
  approved: 'badge badge-success',
  locked: 'badge badge-info',
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
  const [managerName, setManagerName] = useState<string | null>(null);
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

  useEffect(() => {
    apiClient.get('/auth/me').then(r => setManagerName(r.data.manager_name)).catch(() => {});
  }, []);

  // Load cycles on mount
  useEffect(() => {
    apiClient.get('/cycles')
      .then(r => {
        const all: Cycle[] = r.data;
        const seen = new Set<string>();
        const deduped = all.filter(c => seen.has(c.name) ? false : (seen.add(c.name), true));
        setCycles(deduped);
        const active = deduped.find(c => c.status === 'active') || deduped[0] || null;
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
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonLoader.Card />
          <SkeletonLoader.Card />
          <SkeletonLoader.Card />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl h-64 animate-pulse border border-slate-100 dark:border-slate-700/50 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')} className="btn btn-ghost p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="card p-8 flex justify-between items-center relative overflow-hidden flex-wrap gap-6 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Goal Sheet</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
            Welcome, <span className="font-bold text-slate-800 dark:text-slate-200">{user.full_name || 'Employee'}</span>
            {managerName && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <span>Reporting to: <span className="font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">{managerName}</span></span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 relative z-10">
          {cycles.length > 1 && (
            <select
              className="select w-40"
              value={activeCycle?.id || ''}
              onChange={e => { setActiveCycle(cycles.find(c => c.id === e.target.value) || null); setActiveTab('sheet'); }}
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {!sheet && activeCycle && (
            <button
              onClick={createSheet} disabled={sheetCreating}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> Start Sheet
            </button>
          )}
        </div>
      </div>

      {sheet && (sheet.status === 'approved' || sheet.status === 'locked') && (
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {[
            { id: 'sheet', label: 'Goal Sheet' },
            { id: 'q1', label: 'Q1 Check-in' },
            { id: 'q2', label: 'Q2 Check-in' },
            { id: 'q3', label: 'Q3 Check-in' },
            { id: 'q4', label: 'Q4 Check-in' },
          ].map(t => {
            const isActiveWindow = windows.find(w => w.window_type === t.id)?.is_active;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className={`relative px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === t.id 
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700' 
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}>
                {t.label}
                {isActiveWindow && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeTab !== 'sheet' ? (
        activeCycle && <CheckinView cycleId={activeCycle.id} quarter={activeTab} goals={goals} windows={windows} />
      ) : (
        <>
          {/* Status Alert */}
          <div className="flex gap-2">
            {sheet && (
              <span className={statusColors[sheet.status] || 'badge badge-neutral'}>
                {sheet.status.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {!isGoalSettingOpen && (
              <span className="badge badge-danger">
                GOAL SETTING CLOSED
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-card">
              <div className="stat-icon bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><Target className="w-8 h-8" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Total Goals</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{goals.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className={`stat-icon ${totalWeightage === 100 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Total Weightage</p>
                <p className={`text-2xl font-bold ${totalWeightage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{totalWeightage}%</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"><CheckCircle2 className="w-8 h-8" /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Sheet Status</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                  {sheet ? sheet.status.replace('_', ' ') : '—'}
                </p>
              </div>
            </div>
          </div>

          {goals.length > 0 && (
            <div className="card p-6">
              <GoalProgressBar goals={goals} />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!sheet && activeCycle && (
              <button
                onClick={createSheet} disabled={sheetCreating || !isGoalSettingOpen}
                className="btn btn-primary"
              >
                {sheetCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Start Goal Sheet
              </button>
            )}
            {isEditable && (
              <>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="btn btn-outline"
                >
                  <Plus className="w-4 h-4" /> Add Goal
                </button>
                <button
                  onClick={submitSheet} disabled={!canSubmit}
                  className="btn btn-primary"
                >
                  Submit
                </button>
              </>
            )}
          </div>

          {/* No cycle / No sheet placeholder */}
          {!activeCycle && (
            <div className="card p-12 text-center text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">No review cycles found.</p>
              <p className="text-sm mt-1">Ask your admin to create a cycle.</p>
            </div>
          )}

          {activeCycle && !sheet && (
            <div className="card p-12 text-center text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">No goal sheet yet for {activeCycle.name}.</p>
              <p className="text-sm mt-1">Click "Start Goal Sheet" to begin.</p>
            </div>
          )}

          {/* Rework note */}
          {sheet?.status === 'rework_requested' && sheet.rework_note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              <strong className="font-bold">Rework Requested:</strong> {sheet.rework_note}
            </div>
          )}

          {/* Goals list */}
          {goals.length > 0 && (
            <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="card-header bg-slate-50/50 dark:bg-slate-900/40">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Current Goals</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {goals.map(goal => (
                  <div key={goal.id} className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white">{goal.title}</h4>
                           <span className="badge badge-neutral">{goal.weightage}%</span>
                        </div>
                        <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{goal.thrust_area}</p>
                        <div className="flex items-center gap-6 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 flex-wrap">
                          <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                            <Target className="w-3.5 h-3.5" />
                            {goal.uom_type === 'timeline'
                              ? `Deadline: ${goal.deadline_date || '—'}`
                              : goal.target_value_numeric
                                ? `Target: ${goal.target_value_numeric}`
                                : goal.target_value_text || '—'}
                          </span>
                          {goal.is_locked && (
                            <span className="badge badge-info">Locked</span>
                          )}
                          {goal.is_shared && (
                            <span className="badge badge-success flex items-center gap-1.5">
                              <Users className="w-3 h-3" /> Shared
                            </span>
                          )}
                        </div>
                      </div>
                      {isEditable && !goal.is_locked && (
                        <button
                          onClick={() => deleteGoal(goal)}
                          className="btn btn-ghost p-2 hover:text-red-600 hover:bg-red-50"
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
            <div className="modal-backdrop">
              <div className="modal-panel max-w-lg">
                <div className="modal-header">
                  <h3 className="text-xl font-bold text-slate-800">Add New Goal</h3>
                  <button onClick={() => setShowAddGoal(false)} className="btn btn-ghost p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="modal-body">
                  <form onSubmit={addGoal} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label block mb-1">Title *</label>
                        <input required value={goalForm.title} onChange={e => setGoalForm(f => ({...f, title: e.target.value}))}
                          className="input" placeholder="Goal title" />
                      </div>
                      <div>
                        <label className="label block mb-1">Thrust Area *</label>
                        <input required value={goalForm.thrust_area} onChange={e => setGoalForm(f => ({...f, thrust_area: e.target.value}))}
                          className="input" placeholder="e.g. Sales" />
                      </div>
                    </div>
                    <div>
                      <label className="label block mb-1">Description</label>
                      <input value={goalForm.description} onChange={e => setGoalForm(f => ({...f, description: e.target.value}))}
                        className="input" placeholder="Brief description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label block mb-1">Measurement Type *</label>
                        <select value={goalForm.uom_type} onChange={e => setGoalForm(f => ({...f, uom_type: e.target.value}))}
                          className="select">
                          <option value="max_numeric">Max Numeric</option>
                          <option value="min_numeric">Min Numeric</option>
                          <option value="timeline">Timeline / Date</option>
                          <option value="zero_based">Zero Based</option>
                        </select>
                      </div>
                      <div>
                        <label className="label block mb-1">Weightage (%) *</label>
                        <input type="number" min="10" max="100" required value={goalForm.weightage}
                          onChange={e => setGoalForm(f => ({...f, weightage: e.target.value}))}
                          className="input" />
                      </div>
                    </div>
                    {goalForm.uom_type === 'timeline' ? (
                      <div>
                        <label className="label block mb-1">Deadline Date</label>
                        <input type="date" value={goalForm.deadline_date} onChange={e => setGoalForm(f => ({...f, deadline_date: e.target.value}))}
                          className="input" />
                      </div>
                    ) : (
                      <div>
                        <label className="label block mb-1">Target Value</label>
                        <input type="number" required value={goalForm.target_value_numeric} onChange={e => setGoalForm(f => ({...f, target_value_numeric: e.target.value}))}
                          className="input" placeholder="e.g. 150000" />
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowAddGoal(false)}
                        className="btn btn-outline flex-1">
                        Cancel
                      </button>
                      <button type="submit" disabled={goalSaving}
                        className="btn btn-primary flex-1">
                        {goalSaving ? 'Adding...' : 'Add Goal'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeDashboard;
