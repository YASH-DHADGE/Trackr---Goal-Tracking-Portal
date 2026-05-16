import { useState, useEffect } from 'react';
import { Search, Loader2, X, MessageSquare, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/client';

interface TeamCheckin {
  id: string; employee_name: string; employee_status: string; manager_status: string;
}
interface Goal { id: string; title: string; target_value_numeric: string | null; target_value_text: string | null; deadline_date: string | null; uom_type: string; weightage: string; }

export default function ManagerCheckinView({ cycleId, quarter }: { cycleId: string, quarter: string }) {
  const [checkins, setCheckins] = useState<TeamCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{ checkin: any, goals: Goal[] } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTeamCheckins = () => {
    setLoading(true);
    apiClient.get(`/checkins/team/${cycleId}/${quarter}`)
      .then(r => setCheckins(r.data))
      .catch(() => setError('Failed to load team check-ins.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeamCheckins(); }, [cycleId, quarter]);

  const openReview = async (id: string) => {
    setReviewingId(id);
    setReviewLoading(true);
    setComment('');
    try {
      const cRes = await apiClient.get(`/checkins/${id}`);
      
      // Wait, getting their sheet: `/goal-sheets/me` won't work for manager.
      // Manager should get the employee's sheet via the team sheet list, or the backend should just provide goals.
      // Let's use the `/checkins/${id}` to get the checkin, and we can fetch the sheet goals.
      // But we don't have an endpoint for a manager to get an employee's goals directly by employee ID easily except via team sheets.
      // Let's use the existing endpoint: `/goals?sheetId=...`
      // First, get their sheet. 
      const sheetsRes = await apiClient.get(`/goal-sheets/team/${cycleId}`);
      
      // Actually, since this is complex, let's just use the `checkins` response employee_id to find the sheet.
      const sheetId = sheetsRes.data.find((s: any) => s.employee_name === checkins.find(c => c.id === id)?.employee_name)?.id;
      
      let goals = [];
      if (sheetId) {
        const goalsRes = await apiClient.get(`/goals?sheetId=${sheetId}`);
        goals = goalsRes.data;
      }
      
      setReviewData({ checkin: cRes.data, goals });
    } catch (e) {
      setError('Failed to load checkin details.');
    } finally {
      setReviewLoading(false);
    }
  };

  const submitReview = async () => {
    if (!reviewingId) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/checkins/${reviewingId}/review`, { comment_text: comment });
      setReviewingId(null);
      loadTeamCheckins();
    } catch (e) {
      setError('Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = checkins.filter(c => c.employee_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>}
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
          <h3 className="text-lg font-bold text-slate-800">Team {quarter.toUpperCase()} Check-ins</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search team member..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No check-ins found.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Emp Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Mgr Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{c.employee_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.employee_status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {c.employee_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.manager_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.manager_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {c.employee_status === 'submitted' && c.manager_status !== 'completed' ? (
                      <button onClick={() => openReview(c.id)} className="text-sm font-medium text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
                        Review
                      </button>
                    ) : (
                      <button onClick={() => openReview(c.id)} className="text-sm font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reviewingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-slate-800">Review Check-in</h3>
              <button onClick={() => setReviewingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
              {reviewLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
              ) : reviewData ? (
                reviewData.goals.map(goal => {
                  const entry = reviewData.checkin.entries.find((e: any) => e.goal_id === goal.id);
                  if (!entry) return null;
                  return (
                    <div key={goal.id} className="bg-white p-5 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-2">{goal.title}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-slate-500 mb-1 text-xs uppercase font-semibold">Planned Target</p>
                          <p className="font-medium text-slate-800">{goal.uom_type === 'timeline' ? goal.deadline_date : goal.target_value_numeric || goal.target_value_text}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-blue-600 mb-1 text-xs uppercase font-semibold">Actual Achievement</p>
                          <p className="font-medium text-blue-900">{goal.uom_type === 'timeline' ? entry.completion_date?.split('T')[0] : entry.actual_value_numeric || entry.actual_value_text || '—'}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Status: {entry.status.replace('_', ' ')}</span>
                      </div>
                      {entry.remarks && (
                        <div className="mt-4 p-3 bg-slate-50 text-slate-700 text-sm rounded-lg border border-slate-100">
                          <strong className="text-slate-500 block text-xs mb-1">Employee Remarks:</strong>
                          {entry.remarks}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-500 py-8">Could not load details.</div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0 bg-white">
              {reviewData?.checkin.manager_status !== 'completed' ? (
                <>
                  <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Manager Comments</label>
                  <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none mb-4" placeholder="Add your feedback and discussion notes here..." />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setReviewingId(null)} className="px-5 py-2.5 rounded-xl font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={submitReview} disabled={submitting} className="px-5 py-2.5 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Mark as Completed
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end">
                  <button onClick={() => setReviewingId(null)} className="px-5 py-2.5 rounded-xl font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
