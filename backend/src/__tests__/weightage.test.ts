import { validateGoalSheetWeightage } from '../utils/validation';

describe('Goal Sheet Weightage Validation', () => {
  it('passes when total is 100% and min is 10% and max 8 goals', () => {
    const goals = [
      { weightage: 50 },
      { weightage: 30 },
      { weightage: 20 }
    ];
    const result = validateGoalSheetWeightage(goals);
    expect(result.valid).toBe(true);
  });

  it('fails when total is less than 100%', () => {
    const goals = [
      { weightage: 50 },
      { weightage: 40 }
    ];
    const result = validateGoalSheetWeightage(goals);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/must be exactly 100%/);
  });

  it('fails when total is greater than 100%', () => {
    const goals = [
      { weightage: 50 },
      { weightage: 60 }
    ];
    const result = validateGoalSheetWeightage(goals);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/must be exactly 100%/);
  });

  it('fails when any goal has less than 10% weightage', () => {
    const goals = [
      { weightage: 50 },
      { weightage: 45 },
      { weightage: 5 }
    ];
    const result = validateGoalSheetWeightage(goals);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/minimum of 10% weightage/);
  });

  it('fails when there are more than 8 goals', () => {
    const goals = Array(9).fill({ weightage: 11.11 });
    const result = validateGoalSheetWeightage(goals);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/maximum of 8 goals/);
  });

  it('fails when there are no goals', () => {
    const result = validateGoalSheetWeightage([]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least one goal/);
  });
});
