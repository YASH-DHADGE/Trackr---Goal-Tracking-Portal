export const computeTimelineScore = (deadline: Date, completionDate: Date | null): number => {
  if (!completionDate) return 0;
  
  // Calculate difference in days (deadline - completionDate)
  // Positive means early or on time, negative means late
  const diffTime = deadline.getTime() - completionDate.getTime();
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
    case 'min_numeric':
      if (target === null || actual === null || target === 0) return 0;
      return actual / target;
    case 'max_numeric':
      if (target === null || actual === null || actual === 0) return 0;
      return target / actual;
    case 'zero_based':
      return actual === 0 ? 1.0 : 0.0;
    case 'timeline':
      if (!deadline) return 0;
      return computeTimelineScore(deadline, completionDate);
    default:
      return 0;
  }
};
