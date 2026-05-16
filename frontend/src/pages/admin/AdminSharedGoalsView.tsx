import { useState, useEffect } from 'react';
import { Target, Plus } from 'lucide-react';
import apiClient from '../../api/client';
import SharedGoalModal from '../../components/SharedGoalModal';

export default function AdminSharedGoalsView({ cycleId }: { cycleId: string }) {
  const [sharedGoals, setSharedGoals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSharedGoals = async () => {
    try {
      const res = await apiClient.get(`/shared-goals/${cycleId}`);
      setSharedGoals(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cycleId) fetchSharedGoals();
  }, [cycleId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-brand-600" />
            Shared Goals
          </h2>
          <p className="text-slate-500 mt-1">Manage global KPIs pushed to multiple employees</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-200 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Shared Goal
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : sharedGoals.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Shared Goals</h3>
            <p className="text-slate-500 mt-1 max-w-md">You haven't created any shared goals for this cycle yet.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thrust Area</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Owner</th>
              </tr>
            </thead>
            <tbody>
              {sharedGoals.map(sg => (
                <tr key={sg.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">{sg.title}</td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                      {sg.thrust_area}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {sg.uom_type === 'timeline' ? new Date(sg.master_deadline_date).toLocaleDateString() : 
                     sg.uom_type === 'zero_based' ? '0' : sg.master_target_numeric}
                  </td>
                  <td className="p-4 text-sm text-slate-600">{sg.primary_owner_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <SharedGoalModal 
          cycleId={cycleId} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchSharedGoals} 
        />
      )}
    </div>
  );
}
