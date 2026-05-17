import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import apiClient from '../../api/client';

export default function AdminLogsView() {
  const [activeTab, setActiveTab] = useState<'audit' | 'escalation'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/admin/audit-logs'),
      apiClient.get('/admin/escalations')
    ]).then(([auditRes, escRes]) => {
      setAuditLogs(auditRes.data);
      setEscalations(escRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (id: string) => {
    const note = window.prompt('Enter resolution notes (optional):');
    if (note === null) return;
    try {
      await apiClient.put(`/admin/escalations/${id}/resolve`, { notes: note });
      loadData();
    } catch (e) {
      alert('Failed to resolve escalation.');
    }
  };

  const handleIgnore = async (id: string) => {
    if (!window.confirm('Are you sure you want to ignore this escalation?')) return;
    try {
      await apiClient.put(`/admin/escalations/${id}/ignore`);
      loadData();
    } catch (e) {
      alert('Failed to ignore escalation.');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button 
          onClick={() => setActiveTab('audit')}
          className={`font-bold pb-2 border-b-2 transition-colors ${activeTab === 'audit' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          System Audit Logs
        </button>
        <button 
          onClick={() => setActiveTab('escalation')}
          className={`font-bold pb-2 border-b-2 transition-colors ${activeTab === 'escalation' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Escalation Logs
        </button>
      </div>

      {activeTab === 'audit' ? (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Action / Field</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">No logs found.</td></tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.changed_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {log.changed_by_name}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">{log.entity_type}</span>: {log.field_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex flex-col gap-1 max-w-sm">
                        {log.old_value !== null && (
                          <div className="flex items-start gap-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase mt-1">From:</span>
                            <span className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded text-xs break-all">
                              {typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase mt-1">To:</span>
                          <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded text-xs break-all font-medium">
                            {typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value)}
                          </span>
                        </div>
                        {log.change_reason && (
                          <p className="text-[10px] text-slate-400 italic mt-1">Reason: {log.change_reason}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Trigger / Context</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Target User</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Delay</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Escalation Lvl</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {escalations.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">No escalations found.</td></tr>
              ) : (
                escalations.map(esc => (
                  <tr key={esc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {esc.status === 'open' && <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase"><AlertTriangle className="w-3 h-3"/> Open</span>}
                      {esc.status === 'resolved' && <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase"><CheckCircle className="w-3 h-3"/> Resolved</span>}
                      {esc.status === 'ignored' && <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full text-xs font-bold uppercase"> Ignored</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs mb-1">
                        {esc.trigger_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        Cycle: <span className="font-medium text-slate-700 dark:text-slate-300">{esc.cycle_name}</span>
                        {esc.quarter && <span> | Quarter: {esc.quarter.toUpperCase()}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{esc.target_user_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{esc.target_user_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="flex items-center gap-1 font-bold text-red-500 dark:text-red-400">
                        <Clock className="w-3.5 h-3.5" />
                        {esc.days_overdue} Days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${esc.escalation_level >= 1 ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${esc.escalation_level >= 2 ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${esc.escalation_level >= 3 ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {esc.escalation_level === 1 ? 'Employee' : esc.escalation_level === 2 ? 'Manager' : 'Admin/HR'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {esc.status === 'open' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleResolve(esc.id)} className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-bold transition-colors">Resolve</button>
                          <button onClick={() => handleIgnore(esc.id)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-700 rounded text-xs font-bold transition-colors">Ignore</button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic break-words max-w-[150px] inline-block">{esc.notes || 'No notes provided'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
