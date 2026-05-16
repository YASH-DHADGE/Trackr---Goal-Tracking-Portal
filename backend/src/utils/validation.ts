export const validateGoalSheetWeightage = (goals: {weightage: string | number}[]) => {
  if (!goals || goals.length === 0) {
    return { valid: false, error: 'Goal sheet must have at least one goal.' };
  }

  if (goals.length > 8) {
    return { valid: false, error: 'A goal sheet can have a maximum of 8 goals.' };
  }
  
  const totalWeightage = goals.reduce((sum, g) => sum + Number(g.weightage), 0);
  if (totalWeightage !== 100) {
    return { valid: false, error: `Total weightage must be exactly 100%. Currently it is ${totalWeightage}%.` };
  }

  const hasInvalidWeight = goals.some(g => Number(g.weightage) < 10);
  if (hasInvalidWeight) {
    return { valid: false, error: 'Each goal must have a minimum of 10% weightage.' };
  }

  return { valid: true };
};
