import type { PaymentTemplate } from '@rest/shared-types/schemas';

export interface TemplateMilestone {
  /** display label */
  label: string;
  /** % of total sale price */
  percent: number;
  /** offset in days from start date */
  offsetDays: number;
}

/**
 * Indian builder-payment templates. These are the customary ladders;
 * Super Admin can override per-allotment if a custom plan is negotiated.
 */
export const PAYMENT_TEMPLATES: Record<PaymentTemplate, TemplateMilestone[]> = {
  standard_4: [
    { label: 'Booking', percent: 10, offsetDays: 0 },
    { label: 'Agreement', percent: 20, offsetDays: 30 },
    { label: 'Plinth', percent: 30, offsetDays: 120 },
    { label: 'Possession', percent: 40, offsetDays: 365 },
  ],
  standard_6: [
    { label: 'Booking', percent: 10, offsetDays: 0 },
    { label: 'Agreement', percent: 15, offsetDays: 30 },
    { label: 'Foundation', percent: 15, offsetDays: 90 },
    { label: 'Slab 1', percent: 15, offsetDays: 180 },
    { label: 'Brickwork', percent: 25, offsetDays: 270 },
    { label: 'Possession', percent: 20, offsetDays: 365 },
  ],
  construction_linked: [
    { label: 'Booking', percent: 10, offsetDays: 0 },
    { label: 'Agreement', percent: 10, offsetDays: 30 },
    { label: 'On Excavation', percent: 10, offsetDays: 60 },
    { label: 'On Plinth', percent: 10, offsetDays: 120 },
    { label: 'On 1st Slab', percent: 10, offsetDays: 180 },
    { label: 'On 2nd Slab', percent: 10, offsetDays: 240 },
    { label: 'On 3rd Slab', percent: 10, offsetDays: 300 },
    { label: 'On Brickwork', percent: 10, offsetDays: 360 },
    { label: 'On Plastering', percent: 10, offsetDays: 420 },
    { label: 'On Possession', percent: 10, offsetDays: 480 },
  ],
};

/** Build concrete installments for an allotment, given a start date + price. */
export function buildSchedule(
  template: PaymentTemplate,
  salePrice: number,
  startDate: Date,
): { label: string; amount: number; dueDate: Date }[] {
  return PAYMENT_TEMPLATES[template].map((m) => {
    const due = new Date(startDate);
    due.setDate(due.getDate() + m.offsetDays);
    return {
      label: m.label,
      amount: Math.round(salePrice * (m.percent / 100) * 100) / 100,
      dueDate: due,
    };
  });
}
