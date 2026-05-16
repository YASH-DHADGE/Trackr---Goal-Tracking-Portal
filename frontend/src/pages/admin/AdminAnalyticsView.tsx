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
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-xl">{error}</div>;
  if (!summary) return null;

  const totalSheets = summary.totalEmployees || 1; // avoid div by 0
  const submissionRate = Math.round((summary.submittedSheets / totalSheets) * 100) || 0;
  const approvalRate = Math.round((summary.approvedSheets / totalSheets) * 100) || 0;

  // Pie chart calculations (using stroke-dasharray)
  const radius = 15.91549430918954; // circumference = 100
  const submittedStroke = submissionRate;
  const approvedStroke = approvalRate;

  // Bar chart (Q1-Q4 averages)
  const qScores = [
    { label: 'Q1', score: Number(summary.quarterlyAverages.q1 || 0) },
    { label: 'Q2', score: Number(summary.quarterlyAverages.q2 || 0) },
    { label: 'Q3', score: Number(summary.quarterlyAverages.q3 || 0) },
    { label: 'Q4', score: Number(summary.quarterlyAverages.q4 || 0) },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <p className="text-2xl font-bold text-slate-800">{summary.totalEmployees}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><FileText className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Goal Sheets</p>
            <p className="text-2xl font-bold text-slate-800">{summary.totalSheets}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><Target className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Submission Rate</p>
            <p className="text-2xl font-bold text-slate-800">{submissionRate}%</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Approval Rate</p>
            <p className="text-2xl font-bold text-slate-800">{approvalRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown (Donut) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="font-bold text-slate-800 mb-6">Sheet Status Breakdown</h3>
          <div className="flex flex-col items-center">
            <svg width="160" height="160" viewBox="0 0 42 42" className="drop-shadow-sm">
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
              {/* Draft */}
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#94a3b8" strokeWidth="6"
                strokeDasharray={`${(summary.draftSheets/totalSheets)*100} 100`} strokeDashoffset="25" />
              {/* Submitted */}
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#3b82f6" strokeWidth="6"
                strokeDasharray={`${(summary.submittedSheets/totalSheets)*100} 100`} strokeDashoffset={`${25 - ((summary.draftSheets/totalSheets)*100)}`} />
              {/* Approved/Locked */}
              <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#10b981" strokeWidth="6"
                strokeDasharray={`${(summary.approvedSheets/totalSheets)*100} 100`} strokeDashoffset={`${25 - ((summary.draftSheets/totalSheets)*100) - ((summary.submittedSheets/totalSheets)*100)}`} />
            </svg>
            <div className="w-full mt-6 space-y-2 text-sm">
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-400"></span>Draft</span><span className="font-medium">{summary.draftSheets}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span>Submitted</span><span className="font-medium">{summary.submittedSheets}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>Approved/Locked</span><span className="font-medium">{summary.approvedSheets}</span></div>
              <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span>Rework</span><span className="font-medium">{summary.reworkSheets}</span></div>
            </div>
          </div>
        </div>

        {/* Quarterly Average Scores (Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-6">Average Progress Score by Quarter</h3>
          <div className="h-48 flex items-end justify-around gap-4 mt-8 pb-6 border-b border-slate-100 relative">
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-400 pb-6 pr-2 border-r border-slate-100">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            {qScores.map((q) => (
              <div key={q.label} className="w-16 flex flex-col items-center group">
                <div className="w-full bg-brand-100 rounded-t-lg relative flex items-end justify-center group-hover:bg-brand-200 transition-colors" style={{ height: '100%', maxHeight: '100%' }}>
                  <div className="w-full bg-brand-500 rounded-t-lg transition-all duration-500" style={{ height: `${q.score}%` }}></div>
                  <span className="absolute -top-6 text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">{q.score}%</span>
                </div>
                <span className="text-sm font-semibold text-slate-600 mt-2">{q.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-slate-800 mb-4 text-xl">Planned vs Actual Detailed View</h3>
        <PlannedVsActualTable data={plannedVsActual} />
      </div>
    </div>
  );
}
