import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, Target, FileText } from 'lucide-react';
import apiClient from '../../api/client';
import PlannedVsActualTable from '../../components/PlannedVsActualTable';

export default function AdminAnalyticsView({ cycleId }: { cycleId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [plannedVsActual, setPlannedVsActual] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    
    Promise.all([
      apiClient.get(`/admin/analytics/summary?cycleId=${cycleId}`),
      apiClient.get(`/admin/analytics/planned-vs-actual?cycleId=${cycleId}`)
    ])
      .then(([sumRes, pvaRes]) => {
        setSummary(sumRes.data);
        setPlannedVsActual(pvaRes.data);
      })
      .catch(() => setError('Failed to load analytics data'))
      .finally(() => setLoading(false));
  }, [cycleId]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  if (error) return <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl">{error}</div>;
  if (!summary) return null;

  const totalSheets = summary.totalEmployees || 1; // avoid div by 0
  const submissionRate = Math.round((summary.submittedSheets / totalSheets) * 100) || 0;
  const approvalRate = Math.round((summary.approvedSheets / totalSheets) * 100) || 0;

  // Pie chart calculations (using stroke-dasharray)
  const radius = 15.91549430918954; // circumference = 100

  // Bar chart (Q1-Q4 averages)
  const qScores = [
    { label: 'Q1', score: Number(summary.quarterlyAverages.q1 || 0) },
    { label: 'Q2', score: Number(summary.quarterlyAverages.q2 || 0) },
    { label: 'Q3', score: Number(summary.quarterlyAverages.q3 || 0) },
    { label: 'Q4', score: Number(summary.quarterlyAverages.q4 || 0) },
  ];

  return (
    <div className="space-y-8 p-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="bg-blue-50 dark:bg-blue-500/10 stat-icon text-blue-600 dark:text-blue-400"><Users className="w-7 h-7" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Employees</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalEmployees}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 stat-icon text-indigo-600 dark:text-indigo-400"><FileText className="w-7 h-7" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Sheets</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalSheets}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 stat-icon text-emerald-600 dark:text-emerald-400"><Target className="w-7 h-7" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Submitted</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{submissionRate}%</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="bg-amber-50 dark:bg-amber-500/10 stat-icon text-amber-600 dark:text-amber-400"><TrendingUp className="w-7 h-7" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Approved</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{approvalRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Breakdown (Donut) */}
        <div className="card p-8 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-8">Status Breakdown</h3>
          <div className="flex flex-col items-center">
            <svg width="180" height="180" viewBox="0 0 42 42" className="drop-shadow-sm rotate-[-90deg]">
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="5" />
              {/* Draft */}
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#94a3b8" strokeWidth="5"
                strokeDasharray={`${(summary.draftSheets/totalSheets)*100} 100`} strokeDashoffset="0" />
              {/* Submitted */}
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#3b82f6" strokeWidth="5"
                strokeDasharray={`${(summary.submittedSheets/totalSheets)*100} 100`} strokeDashoffset={`${-((summary.draftSheets/totalSheets)*100)}`} />
              {/* Approved/Locked */}
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#10b981" strokeWidth="5"
                strokeDasharray={`${(summary.approvedSheets/totalSheets)*100} 100`} strokeDashoffset={`${-((summary.draftSheets/totalSheets)*100) - ((summary.submittedSheets/totalSheets)*100)}`} />
            </svg>
            <div className="w-full mt-10 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-3 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>Draft</span>
                <span className="text-slate-900 dark:text-white">{summary.draftSheets}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-3 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Submitted</span>
                <span className="text-slate-900 dark:text-white">{summary.submittedSheets}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-3 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Approved</span>
                <span className="text-slate-900 dark:text-white">{summary.approvedSheets}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quarterly Average Scores (Bar Chart) */}
        <div className="card p-8 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-8">Quarterly Progress Average</h3>
          <div className="h-56 flex items-end justify-around gap-6 pb-8 border-b border-slate-100 dark:border-slate-800 relative">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-bold text-slate-400 pb-8 pr-4 border-r border-slate-100 dark:border-slate-800">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            {qScores.map((q) => (
              <div key={q.label} className="w-16 flex flex-col items-center group flex-1 max-w-[80px]">
                <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl relative flex items-end justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors h-full">
                  <div className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-xl transition-all duration-1000 ease-out shadow-lg shadow-brand-500/20" style={{ height: `${q.score}%` }}></div>
                  <span className="absolute -top-8 text-xs font-bold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">{q.score}%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-4 tracking-widest uppercase">{q.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Planned vs Actual Detailed View</h3>
        <PlannedVsActualTable data={plannedVsActual} />
      </div>
    </div>
  );
}
