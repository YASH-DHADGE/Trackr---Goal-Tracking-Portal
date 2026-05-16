import React from 'react';

interface Goal {
  id: string;
  title: string;
  weightage: number;
  color?: string;
}

interface GoalProgressBarProps {
  goals: Goal[];
}

const defaultColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 
  'bg-purple-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500'
];

const GoalProgressBar: React.FC<GoalProgressBarProps> = ({ goals }) => {
  const totalWeightage = goals.reduce((sum, goal) => sum + Number(goal.weightage), 0);
  
  if (goals.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">Weightage Distribution</span>
        <span className={`text-sm font-bold ${totalWeightage === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}`}>
          {totalWeightage}% / 100%
        </span>
      </div>
      
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className={`${defaultColors[index % defaultColors.length]} h-full transition-all duration-500 hover:brightness-110 cursor-help relative group`}
            style={{ width: `${(Number(goal.weightage) / Math.max(totalWeightage, 100)) * 100}%` }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {goal.title}: {goal.weightage}%
            </div>
          </div>
        ))}
        {totalWeightage < 100 && (
          <div 
            className="bg-slate-200 h-full border-l border-white/20"
            style={{ width: `${((100 - totalWeightage) / 100) * 100}%` }}
          ></div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {goals.map((goal, index) => (
          <div key={goal.id} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${defaultColors[index % defaultColors.length]}`}></div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={goal.title}>
              {goal.title} ({goal.weightage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalProgressBar;
