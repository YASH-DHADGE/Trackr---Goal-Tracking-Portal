import { computeScore, computeTimelineScore } from '../utils/scoreComputer';

describe('Score Calculation Logic', () => {

  describe('computeTimelineScore', () => {
    it('returns 1.0 (100%) if completed on or before deadline', () => {
      const deadline = new Date('2025-12-31');
      const early = new Date('2025-12-25');
      const onTime = new Date('2025-12-31');
      
      expect(computeTimelineScore(deadline, early)).toBe(1.0);
      expect(computeTimelineScore(deadline, onTime)).toBe(1.0);
    });

    it('returns 0.75 (75%) if up to 1 week late', () => {
      const deadline = new Date('2025-12-01');
      const late = new Date('2025-12-05'); // 4 days late
      expect(computeTimelineScore(deadline, late)).toBe(0.75);
    });

    it('returns 0.5 (50%) if up to 2 weeks late', () => {
      const deadline = new Date('2025-12-01');
      const veryLate = new Date('2025-12-10'); // 9 days late
      expect(computeTimelineScore(deadline, veryLate)).toBe(0.5);
    });

    it('returns 0.25 (25%) if more than 2 weeks late', () => {
      const deadline = new Date('2025-12-01');
      const extremelyLate = new Date('2025-12-20'); // 19 days late
      expect(computeTimelineScore(deadline, extremelyLate)).toBe(0.25);
    });

    it('returns 0 if completion date is missing or invalid', () => {
      expect(computeTimelineScore(new Date(), null)).toBe(0);
    });
  });

  describe('computeScore', () => {
    describe('max_numeric', () => {
      it('returns actual/target', () => {
        expect(computeScore('max_numeric', 100, 80, null, null)).toBe(0.8);
      });
      it('returns >1 if actual exceeds target', () => {
        expect(computeScore('max_numeric', 100, 150, null, null)).toBe(1.5);
      });
      it('returns 0 if target is 0', () => {
        expect(computeScore('max_numeric', 0, 50, null, null)).toBe(0);
      });
    });

    describe('min_numeric', () => {
      it('returns target/actual', () => {
        expect(computeScore('min_numeric', 10, 5, null, null)).toBe(2.0); // 200%
      });
      it('returns <1 if actual exceeds target (which is bad)', () => {
        expect(computeScore('min_numeric', 10, 20, null, null)).toBe(0.5); // 50%
      });
      it('returns 0 if actual is 0 (to avoid infinity)', () => {
        expect(computeScore('min_numeric', 10, 0, null, null)).toBe(0);
      });
    });

    describe('zero_based', () => {
      it('returns 1.0 (100%) if actual is 0', () => {
        expect(computeScore('zero_based', null, 0, null, null)).toBe(1.0);
      });
      it('returns 0.0 (0%) if actual is not 0', () => {
        expect(computeScore('zero_based', null, 1, null, null)).toBe(0.0);
        expect(computeScore('zero_based', null, 5, null, null)).toBe(0.0);
      });
    });

    describe('timeline', () => {
      it('delegates to computeTimelineScore', () => {
        const deadline = new Date('2025-12-01');
        const onTime = new Date('2025-11-20');
        expect(computeScore('timeline', null, null, deadline, onTime)).toBe(1.0);
      });
      it('returns 0 if deadline is missing', () => {
        expect(computeScore('timeline', null, null, null, new Date())).toBe(0);
      });
    });
  });

});
