import { useState, useEffect } from 'react';
import { X, Loader2, Calendar } from 'lucide-react';
import apiClient from '../api/client';

interface CycleWindowsModalProps {
  onClose: () => void;
  cycleId: string;
  cycleName: string;
}

const windowTypes = [
  { id: 'goal_setting', label: 'Goal Setting' },
  { id: 'q1', label: 'Q1 Check-in' },
  { id: 'q2', label: 'Q2 Check-in' },
  { id: 'q3', label: 'Q3 Check-in' },
  { id: 'q4', label: 'Q4 Check-in' }
];

export default function CycleWindowsModal({ onClose, cycleId, cycleName }: CycleWindowsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [windows, setWindows] = useState<Record<string, any>>({});

  useEffect(() => {
    apiClient.get(`/cycles/${cycleId}/windows`)
      .then(r => {
        const winMap: Record<string, any> = {};
        windowTypes.forEach(t => {
          winMap[t.id] = { window_type: t.id, opens_at: '', closes_at: '', is_active: false };
        });
        r.data.forEach((w: any) => {
          winMap[w.window_type] = {
            window_type: w.window_type,
            opens_at: w.opens_at ? new Date(w.opens_at).toISOString().slice(0, 16) : '',
            closes_at: w.closes_at ? new Date(w.closes_at).toISOString().slice(0, 16) : '',
            is_active: w.is_active
          };
        });
        setWindows(winMap);
      })
      .catch(() => setError('Failed to load cycle windows'))
      .finally(() => setLoading(false));
  }, [cycleId]);

  const handleSave = async (windowType: string) => {
    setSaving(true);
    setError('');
    try {
      const win = windows[windowType];
      if (!win.opens_at || !win.closes_at) {
         throw new Error(`Please provide both dates for ${windowType}`);
      }
      await apiClient.post(`/cycles/${cycleId}/windows`, {
        window_type: win.window_type,
        opens_at: new Date(win.opens_at).toISOString(),
        closes_at: new Date(win.closes_at).toISOString(),
        is_active: win.is_active
      });
      alert('Window saved successfully');
    } catch (e: any) {
      setError(e.message || e.response?.data?.error || 'Failed to save window');
    } finally {
      setSaving(false);
    }
  };

  const updateWindow = (type: string, field: string, value: any) => {
    setWindows(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              Configure Windows
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Set open and close dates for {cycleName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
          ) : (
            <div className="space-y-4">
              {windowTypes.map(t => {
                const win = windows[t.id];
                return (
                  <div key={t.id} className="p-4 border border-slate-200 rounded-xl flex items-center gap-4 flex-wrap">
                    <div className="w-32">
                      <p className="font-semibold text-slate-800">{t.label}</p>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-slate-500 block mb-1">Opens At</label>
                      <input type="datetime-local" value={win.opens_at} onChange={e => updateWindow(t.id, 'opens_at', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-slate-500 block mb-1">Closes At</label>
                      <input type="datetime-local" value={win.closes_at} onChange={e => updateWindow(t.id, 'closes_at', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    </div>
                    <div className="w-24">
                      <label className="flex items-center gap-2 cursor-pointer mt-5">
                        <input type="checkbox" checked={win.is_active} onChange={e => updateWindow(t.id, 'is_active', e.target.checked)}
                          className="rounded text-brand-600 focus:ring-brand-500" />
                        <span className="text-sm font-medium text-slate-700">Active</span>
                      </label>
                    </div>
                    <div className="mt-5">
                      <button onClick={() => handleSave(t.id)} disabled={saving}
                        className="px-4 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold rounded-lg text-sm transition-colors">
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
