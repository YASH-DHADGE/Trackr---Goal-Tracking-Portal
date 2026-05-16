import { useState, useEffect } from 'react';
import { Loader2, Unlock, Download } from 'lucide-react';
import apiClient from '../../api/client';

export default function AdminReportsView() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/cycles').then(r => {
      setCycles(r.data);
      const active = r.data.find((c: any) => c.status === 'active') || r.data[0];
      if (active) setActiveCycleId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!activeCycleId) return;
    setLoading(true);
    apiClient.get(`/admin/reports/completion?cycleId=${activeCycleId}`)
      .then(r => setReport(r.data))
      .finally(() => setLoading(false));
  }, [activeCycleId]);

  const unlockSheet = async (sheetId: string) => {
    if (!window.confirm('Unlock this goal sheet? This will allow the employee to edit their goals again.')) return;
    try {
      await apiClient.post(`/goal-sheets/${sheetId}/unlock`);
      const r = await apiClient.get(`/admin/reports/completion?cycleId=${activeCycleId}`);
      setReport(r.data);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to unlock sheet');
    }
  };

  const downloadAchievementReport = async () => {
    try {
      const response = await apiClient.get(`/admin/reports/achievement/export?cycleId=${activeCycleId}`, {
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Completion Dashboard</h3>
        <div className="flex items-center gap-3">
          {cycles.length > 0 && (
            <select 
              value={activeCycleId} onChange={e => setActiveCycleId(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button 
            onClick={downloadAchievementReport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export Achievements
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Goal Sheet</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Q1</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Q2</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Q3</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Q4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.map(r => (
                <tr key={r.employee_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{r.full_name}</p>
                    <p className="text-xs text-slate-500">{r.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.sheet_status ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.sheet_status ? r.sheet_status.replace('_', ' ').toUpperCase() : 'NOT STARTED'}
                      </span>
                      {(r.sheet_status === 'approved' || r.sheet_status === 'locked') && (
                        <button 
                          onClick={() => unlockSheet(r.sheet_id)}
                          className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
                          title="Unlock Goal Sheet"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  {['q1', 'q2', 'q3', 'q4'].map(q => {
                    const chk = r.checkins?.find((c: any) => c.quarter === q);
                    return (
                      <td key={q} className="px-6 py-4">
                        {chk ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${chk.manager_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {chk.manager_status === 'completed' ? 'DONE' : 'PENDING'}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
