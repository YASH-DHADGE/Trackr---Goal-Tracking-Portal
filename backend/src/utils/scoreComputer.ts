export const computeTimelineScore = (deadline: Date, completionDate: Date | null): number => {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const c = typeof completionDate === 'string' ? new Date(completionDate) : completionDate;

  if (!c || isNaN(c.getTime())) return 0;
  if (!d || isNaN(d.getTime())) return 0;
  
  const diffTime = d.getTime() - c.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) return 1.0;   // On time or early
  if (diffDays >= -7) return 0.75; // Up to 1 week late
  if (diffDays >= -14) return 0.5; // Up to 2 weeks late
  return 0.25;                     // More than 2 weeks late
};

export const computeScore = (
  uomType: 'min_numeric' | 'max_numeric' | 'timeline' | 'zero_based',
  target: number | null,
  actual: number | null,
  deadline: Date | null,
  completionDate: Date | null
): number => {
  switch (uomType) {
    case 'min_numeric': {
      const t = Number(target);
      const a = Number(actual);
      if (isNaN(t) || isNaN(a) || a === 0) return 0;
      return t / a; // target / actual (lower actual = higher score)
    }
    case 'max_numeric': {
      const t = Number(target);
      const a = Number(actual);
      if (isNaN(t) || isNaN(a) || t === 0) return 0;
      return a / t; // actual / target (higher actual = higher score)
    }
    case 'zero_based':
      return Number(actual) === 0 ? 1.0 : 0.0;
    case 'timeline':
      if (!deadline) return 0;
      return computeTimelineScore(deadline, completionDate);
    default:
      return 0;
  }
};
