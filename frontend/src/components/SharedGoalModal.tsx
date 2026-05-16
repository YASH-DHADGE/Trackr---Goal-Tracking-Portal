import { useState, useEffect } from 'react';
import { X, Loader2, Target, Users, Info } from 'lucide-react';
import apiClient from '../api/client';

interface SharedGoalModalProps {
  onClose: () => void;
  onSuccess: () => void;
  cycleId: string;
}

export default function SharedGoalModal({ onClose, onSuccess, cycleId }: SharedGoalModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    thrust_area: 'Operational Excellence',
    uom_type: 'min_numeric',
    master_target_numeric: '',
    master_target_text: '',
    master_deadline_date: '',
    primary_owner_id: '',
    employee_ids: [] as string[]
  });

  const thrustAreas = [
    'Operational Excellence',
    'Customer Satisfaction',
    'Strategic Growth',
    'Talent & Culture',
    'Innovation',
    'Digital Transformation'
  ];

  useEffect(() => {
    apiClient.get('/users').then(r => {
      setUsers(r.data);
      // Default primary owner to current user if they are admin/manager
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      if (me.id) setForm(f => ({ ...f, primary_owner_id: me.id }));
    });
  }, []);

  const handleSubmit = async () => {
    if (!form.title || !form.primary_owner_id || form.employee_ids.length === 0) {
      setError('Please fill in all required fields and select at least one assignee.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 1. Create the group
      const groupRes = await apiClient.post('/shared-goals', {
        ...form,
        cycle_id: cycleId
      });
      
      // 2. Assign to employees
      await apiClient.post('/shared-goals/assign', {
        shared_goal_group_id: groupRes.data.id,
        employee_ids: form.employee_ids
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create shared goal.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setForm(f => ({
      ...f,
      employee_ids: f.employee_ids.includes(id) 
        ? f.employee_ids.filter(eid => eid !== id)
        : [...f.employee_ids, id]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-600" />
              Create Shared Goal
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Push a master KPI to multiple employees</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs/Steps Indicator */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setStep(1)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${step === 1 ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            1. Goal Details
          </button>
          <button 
            onClick={() => setStep(2)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${step === 2 ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            2. Assignees ({form.employee_ids.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Thrust Area</label>
                  <select 
                    value={form.thrust_area}
                    onChange={e => setForm({...form, thrust_area: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                  >
                    {thrustAreas.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Goal Title *</label>
                  <input 
                    required
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="e.g., Increase department efficiency"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                  <textarea 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    rows={2}
                    placeholder="Provide more context..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Unit of Measure</label>
                  <select 
                    value={form.uom_type}
                    onChange={e => setForm({...form, uom_type: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                  >
                    <option value="min_numeric">Min Numeric (Higher is Better)</option>
                    <option value="max_numeric">Max Numeric (Lower is Better)</option>
                    <option value="timeline">Timeline (Date Based)</option>
                    <option value="zero_based">Zero Based (Target = 0)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {form.uom_type === 'timeline' ? 'Deadline' : 'Target Value'}
                  </label>
                  {form.uom_type === 'timeline' ? (
                    <input type="date" value={form.master_deadline_date} onChange={e => setForm({...form, master_deadline_date: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow" />
                  ) : form.uom_type === 'zero_based' ? (
                    <input disabled value="0" className="w-full border border-slate-100 bg-slate-50 rounded-xl px-4 py-2.5 text-sm text-slate-400" />
                  ) : (
                    <input type="number" value={form.master_target_numeric} onChange={e => setForm({...form, master_target_numeric: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow" />
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Primary Owner * (Achievement updates from this user will sync to all)</label>
                  <select 
                    value={form.primary_owner_id}
                    onChange={e => setForm({...form, primary_owner_id: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                  >
                    <option value="">Select Primary Owner</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center sticky top-0 bg-white pb-2 z-10">
                <p className="text-sm font-medium text-slate-600">Select employees to receive this goal:</p>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setForm({...form, employee_ids: users.filter(u => u.role === 'employee').map(u => u.id)})}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase"
                   >
                     Select All Employees
                   </button>
                   <span className="text-slate-300">|</span>
                   <button 
                    onClick={() => setForm({...form, employee_ids: []})}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase"
                   >
                     Clear
                   </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {users.map(u => (
                  <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${form.employee_ids.includes(u.id) ? 'border-brand-200 bg-brand-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox"
                      checked={form.employee_ids.includes(u.id)}
                      onChange={() => toggleEmployee(u.id)}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.designation || u.role}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-white transition-colors text-sm"
            >
              Back
            </button>
          )}
          <button 
            onClick={step === 1 ? () => setStep(2) : handleSubmit}
            disabled={loading}
            className="flex-[2] py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 1 ? 'Next: Select Assignees' : 'Create & Assign Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}
