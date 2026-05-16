import { useState, useEffect } from 'react';
import { Save, Send, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/client';

interface Goal {
  id: string; title: string; uom_type: string; target_value_numeric: string | null; target_value_text: string | null; deadline_date: string | null;
}
interface CheckinEntry {
  goal_id: string; actual_value_numeric: string | null; actual_value_text: string | null; completion_date: string | null; status: 'not_started' | 'on_track' | 'completed'; remarks: string | null;
}
interface Checkin {
  id: string; employee_status: string; manager_status: string; entries: CheckinEntry[];
}

export default function CheckinView({ cycleId, quarter, goals, windows }: { cycleId: string, quarter: string, goals: Goal[], windows: any[] }) {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [entries, setEntries] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiClient.get(`/checkins/me/${cycleId}/${quarter}`)
      .then(r => {
        const c = r.data;
        setCheckin(c);
        if (c?.entries) {
          // Merge with existing goals in case some are missing
          const merged = goals.map(g => {
            const ext = c.entries.find((e: any) => e.goal_id === g.id);
            return ext ? {
              goal_id: g.id,
              actual_value_numeric: ext.actual_value_numeric || '',
              actual_value_text: ext.actual_value_text || '',
              completion_date: ext.completion_date ? ext.completion_date.split('T')[0] : '',
              status: ext.status || 'not_started',
              remarks: ext.remarks || ''
            } : {
              goal_id: g.id, actual_value_numeric: '', actual_value_text: '', completion_date: '', status: 'not_started' as const, remarks: ''
            };
          });
          setEntries(merged);
        } else {
          setEntries(goals.map(g => ({ goal_id: g.id, actual_value_numeric: '', actual_value_text: '', completion_date: '', status: 'not_started', remarks: '' })));
        }
      })
      .catch(() => setError('Failed to load checkin.'))
      .finally(() => setLoading(false));
  }, [cycleId, quarter, goals]);

  const updateEntry = (goalId: string, field: keyof CheckinEntry, value: string) => {
    setEntries(prev => prev.map(e => e.goal_id === goalId ? { ...e, [field]: value } : e));
  };

  const handleSave = async (submit: boolean = false) => {
    setSaving(true);
    setError('');
    try {
      const payload = { entries: entries.map(e => ({
        ...e,
        actual_value_numeric: e.actual_value_numeric || null,
        actual_value_text: e.actual_value_text || null,
        completion_date: e.completion_date || null
      })) };
      
      const r = await apiClient.put(`/checkins/me/${cycleId}/${quarter}`, payload);
      
      if (submit) {
        const sr = await apiClient.patch(`/checkins/${r.data.checkinId}/submit`);
        setCheckin(sr.data);
      } else {
        // Just reload checkin state
        const cRes = await apiClient.get(`/checkins/me/${cycleId}/${quarter}`);
        setCheckin(cRes.data);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save checkin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading check-in...</div>;

  const currentWindow = windows.find(w => w.window_type === quarter);
  const isWindowOpen = !currentWindow || currentWindow.is_active;
  const isReadonly = checkin?.employee_status === 'submitted' || !isWindowOpen;

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-900/40">{error}</div>}
      
      {checkin?.employee_status === 'submitted' && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/40 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="w-5 h-5" />
          <span>You have submitted this check-in. It is pending manager review.</span>
        </div>
      )}

      {!isWindowOpen && (
        <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900/40 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200">
          <span>The {quarter.toUpperCase()} check-in window is currently closed.</span>
        </div>
      )}

      <div className="space-y-4">
        {goals.map(goal => {
          const entry = entries.find(e => e.goal_id === goal.id);
          if (!entry) return null;
          return (
            <div key={goal.id} className="card p-5">
              <div className="mb-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-100">{goal.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                  Target:{' '}
                  {(() => {
                    const val = goal.uom_type === 'timeline'
                      ? goal.deadline_date
                      : goal.target_value_numeric || goal.target_value_text;
                    return val
                      ? <span className="font-medium text-slate-700 dark:text-slate-100">{val}</span>
                      : <span className="font-medium text-amber-600 dark:text-amber-300 italic">Not set — contact your manager</span>;
                  })()}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goal.uom_type === 'timeline' ? (
                  <div>
                    <label className="label block mb-1">Completion Date</label>
                    <input type="date" value={entry.completion_date || ''} onChange={e => updateEntry(goal.id, 'completion_date', e.target.value)}
                      disabled={isReadonly} className="input disabled:bg-slate-50" />
                  </div>
                ) : goal.uom_type === 'zero_based' || goal.uom_type === 'max_numeric' || goal.uom_type === 'min_numeric' ? (
                  <div>
                    <label className="label block mb-1">Actual Numeric Value</label>
                    <input type="number" value={entry.actual_value_numeric || ''} onChange={e => updateEntry(goal.id, 'actual_value_numeric', e.target.value)}
                      disabled={isReadonly} className="input disabled:bg-slate-50" />
                  </div>
                ) : (
                  <div>
                    <label className="label block mb-1">Actual Text Value</label>
                    <input type="text" value={entry.actual_value_text || ''} onChange={e => updateEntry(goal.id, 'actual_value_text', e.target.value)}
                      disabled={isReadonly} className="input disabled:bg-slate-50" />
                  </div>
                )}
                
                <div>
                  <label className="label block mb-1">Status</label>
                  <select value={entry.status} onChange={e => updateEntry(goal.id, 'status', e.target.value)}
                    disabled={isReadonly} className="select disabled:bg-slate-50">
                    <option value="not_started">Not Started</option>
                    <option value="on_track">On Track</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="label block mb-1">Remarks / Comments</label>
                  <textarea rows={2} value={entry.remarks || ''} onChange={e => updateEntry(goal.id, 'remarks', e.target.value)}
                    disabled={isReadonly} className="textarea disabled:bg-slate-50" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isReadonly && goals.length > 0 && (
        <div className="flex gap-3 justify-end pt-4">
          <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-outline">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="btn btn-primary">
            <Send className="w-4 h-4" /> Submit Check-in
          </button>
        </div>
      )}
    </div>
  );
}
