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
  const getScoreColor = (score: number | undefined | null) => {
    if (score === null || score === undefined) return 'bg-slate-100 text-slate-500';
    if (score >= 90) return 'bg-emerald-100 text-emerald-700';
    if (score >= 70) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const renderQuarter = (q: { actual: any; score: number } | null) => {
    if (!q) return <td className="px-4 py-3 text-sm text-slate-400 text-center">—</td>;
    return (
      <td className="px-4 py-3 text-sm text-center border-l border-slate-100">
        <div className="font-medium text-slate-800">{q.actual || '-'}</div>
        <div className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(q.score)}`}>
          {q.score !== null ? `${q.score}%` : 'N/A'}
        </div>
      </td>
    );
  };

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-500">No data available for this view.</div>;
  }

  return (
    <div className="space-y-8">
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
          <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">{emp.employeeName}</h3>
              <div className="text-sm text-slate-500">
                Total Weightage: <span className="font-semibold text-slate-700">{totalWeightage}%</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Goal</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-20 text-center">Weight</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-32">Planned Target</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-28 border-l border-slate-200">Q1 Actual</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-28 border-l border-slate-200">Q2 Actual</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-28 border-l border-slate-200">Q3 Actual</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center w-28 border-l border-slate-200">Q4 Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emp.goals.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-sm">{g.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{g.thrustArea}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">{g.weightage}%</td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                        {g.plannedTarget || '-'}
                        <div className="text-[10px] text-slate-400 uppercase mt-0.5">{g.uomType.replace('_', ' ')}</div>
                      </td>
                      {renderQuarter(g.q1)}
                      {renderQuarter(g.q2)}
                      {renderQuarter(g.q3)}
                      {renderQuarter(g.q4)}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700 text-sm">Weighted Score:</td>
                    <td className="px-4 py-3 text-center border-l border-slate-200 font-bold text-slate-800">{weightedScoreSum.q1.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center border-l border-slate-200 font-bold text-slate-800">{weightedScoreSum.q2.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center border-l border-slate-200 font-bold text-slate-800">{weightedScoreSum.q3.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center border-l border-slate-200 font-bold text-slate-800">{weightedScoreSum.q4.toFixed(1)}</td>
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
