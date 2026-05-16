import React from 'react';

interface GoalData {
  id: string;
  title: string;
  thrustArea: string;
  weightage: number;
  uomType: string;
  plannedTarget: any;
  q1: { actual: any; score: number } | null;
  q2: { actual: any; score: number } | null;
  q3: { actual: any; score: number } | null;
  q4: { actual: any; score: number } | null;
}

interface EmployeeData {
  employeeName: string;
  goals: GoalData[];
}

export default function PlannedVsActualTable({ data }: { data: EmployeeData[] }) {
  const getScoreBadge = (score: number | undefined | null) => {
    if (score === null || score === undefined) return 'badge-neutral';
    if (score >= 90) return 'badge-success';
    if (score >= 70) return 'badge-warning';
    return 'badge-danger';
  };

  const renderQuarter = (q: { actual: any; score: number } | null) => {
    if (!q) return <td className="px-6 py-4 text-slate-400 dark:text-slate-600 text-center">—</td>;
    return (
      <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">
        <div className="font-bold text-slate-900 dark:text-white">{q.actual || '-'}</div>
        <div className={`mt-1.5 badge ${getScoreBadge(q.score)}`}>
          {q.score !== null ? `${q.score}%` : 'N/A'}
        </div>
      </td>
    );
  };

  if (!data || data.length === 0) {
    return <div className="p-12 text-center card text-slate-500">No data available for this view.</div>;
  }

  return (
    <div className="space-y-10">
      {data.map((emp, idx) => {
        let totalWeightage = 0;
        let weightedScoreSum = { q1: 0, q2: 0, q3: 0, q4: 0 };

        emp.goals.forEach(g => {
          totalWeightage += Number(g.weightage);
          if (g.q1?.score) weightedScoreSum.q1 += (g.q1.score * Number(g.weightage)) / 100;
          if (g.q2?.score) weightedScoreSum.q2 += (g.q2.score * Number(g.weightage)) / 100;
          if (g.q3?.score) weightedScoreSum.q3 += (g.q3.score * Number(g.weightage)) / 100;
          if (g.q4?.score) weightedScoreSum.q4 += (g.q4.score * Number(g.weightage)) / 100;
        });

        return (
          <div key={idx} className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">{emp.employeeName}</h3>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Total Weight: <span className="text-brand-600 dark:text-brand-400">{totalWeightage}%</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="table-head">
                    <th className="px-6 py-4">Goal Description</th>
                    <th className="px-6 py-4 text-center">Weight</th>
                    <th className="px-6 py-4">Planned Target</th>
                    <th className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">Q1</th>
                    <th className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">Q2</th>
                    <th className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">Q3</th>
                    <th className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800">Q4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emp.goals.map(g => (
                    <tr key={g.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{g.title}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">{g.thrustArea}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400 text-xs">{g.weightage}%</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{g.plannedTarget || '-'}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">{g.uomType.replace('_', ' ')}</div>
                      </td>
                      {renderQuarter(g.q1)}
                      {renderQuarter(g.q2)}
                      {renderQuarter(g.q3)}
                      {renderQuarter(g.q4)}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-slate-500 dark:text-slate-500 uppercase text-xs tracking-widest">Weighted Quarter Score:</td>
                    <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-brand-600 dark:text-brand-400 text-lg">{weightedScoreSum.q1.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-brand-600 dark:text-brand-400 text-lg">{weightedScoreSum.q2.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-brand-600 dark:text-brand-400 text-lg">{weightedScoreSum.q3.toFixed(1)}</td>
                    <td className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-800 font-bold text-brand-600 dark:text-brand-400 text-lg">{weightedScoreSum.q4.toFixed(1)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
