import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface PaymentLinkInput {
  amountInPaise: number;
  description: string;
  referenceId: string;
  customer?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  callbackUrl?: string;
}

export interface PaymentLink {
  id: string;
  shortUrl: string;
  status: string;
  /** true when running in sandbox/no-credentials mode (auto-pays on click) */
  simulated: boolean;
}

/**
 * Razorpay payment-link wrapper.
 *
 * When `RAZORPAY_KEY_ID/SECRET` are absent we run in **sandbox mode** — links
 * resolve to a local `/api/payments/sandbox/:installmentId/pay` route that
 * marks the installment paid on visit. Makes the whole flow exercisable in dev
 * without credentials.
 */
@Injectable()
export class RazorpayService {
  private readonly log = new Logger(RazorpayService.name);

  get enabled() {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  async createPaymentLink(input: PaymentLinkInput): Promise<PaymentLink> {
    if (!this.enabled) {
      const apiBase =
        process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
      return {
        id: `sandbox_${input.referenceId}`,
        shortUrl: `${apiBase}/api/webhooks/sandbox/pay/${input.referenceId}`,
        status: 'created',
        simulated: true,
      };
    }

    const body = {
      amount: input.amountInPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: input.referenceId,
      description: input.description,
      customer: input.customer,
      notify: { sms: !!input.customer?.contact, email: !!input.customer?.email },
      reminder_enable: true,
      callback_url: input.callbackUrl,
      callback_method: 'get',
      notes: input.notes,
    };

    const res = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
          ).toString('base64'),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Razorpay create-link failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {
      id: string;
      short_url: string;
      status: string;
    };
    return { id: data.id, shortUrl: data.short_url, status: data.status, simulated: false };
  }

  /**
   * Verify Razorpay webhook signature (HMAC SHA-256 over the raw body, keyed
   * by RAZORPAY_WEBHOOK_SECRET).
   */
  verifyWebhook(rawBody: string, signatureHeader: string | undefined): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signatureHeader) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signatureHeader),
      );
    } catch {
      return false;
    }
  }
}
