import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import apiClient from '../../api/client';

export default function AdminLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/audit-logs')
      .then(r => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <div className="p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6">System Audit Logs</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Time</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Action / Field</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">No logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                    {new Date(log.changed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {log.changed_by_name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-semibold text-brand-600">{log.entity_type}</span>: {log.field_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex flex-col gap-1 max-w-sm">
                      {log.old_value !== null && (
                        <div className="flex items-start gap-1">
                          <span className="text-[10px] font-bold text-red-400 uppercase mt-1">From:</span>
                          <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-xs break-all">
                            {typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase mt-1">To:</span>
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs break-all font-medium">
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
    </div>
  );
}
