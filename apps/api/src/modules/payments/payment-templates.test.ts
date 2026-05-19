import { describe, expect, it } from 'vitest';
import { buildSchedule, PAYMENT_TEMPLATES } from './payment-templates';

describe('buildSchedule', () => {
  it('produces the right number of installments per template', () => {
    expect(buildSchedule('standard_4', 1_000_000, new Date('2026-01-01'))).toHaveLength(4);
    expect(buildSchedule('standard_6', 1_000_000, new Date('2026-01-01'))).toHaveLength(6);
    expect(buildSchedule('construction_linked', 1_000_000, new Date('2026-01-01'))).toHaveLength(
      10,
    );
  });

  it('amounts sum to the sale price (within rounding)', () => {
    for (const tpl of Object.keys(PAYMENT_TEMPLATES) as Array<keyof typeof PAYMENT_TEMPLATES>) {
      const sched = buildSchedule(tpl, 10_000_000, new Date('2026-01-01'));
      const total = sched.reduce((s, i) => s + i.amount, 0);
      // Allow a few rupees of rounding noise.
      expect(Math.abs(total - 10_000_000)).toBeLessThan(5);
    }
  });

  it('first installment is at the start date; subsequent dates advance', () => {
    const sched = buildSchedule('standard_4', 1_000_000, new Date('2026-01-01'));
    expect(sched[0]!.dueDate.toISOString().slice(0, 10)).toBe('2026-01-01');
    for (let i = 1; i < sched.length; i++) {
      expect(sched[i]!.dueDate.getTime()).toBeGreaterThan(sched[i - 1]!.dueDate.getTime());
    }
  });
});
