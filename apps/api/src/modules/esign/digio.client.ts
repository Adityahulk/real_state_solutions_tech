import { Injectable, Logger } from '@nestjs/common';

export interface DigioSigner {
  identifier: string; // email or phone
  name: string;
  reason: string;
}

export interface DigioRequest {
  /** Internal correlation id (e.g. Document.id) */
  referenceId: string;
  documentName: string;
  fileBase64: string;
  mimeType: string;
  signers: DigioSigner[];
  /** Where the user is sent after signing */
  callbackUrl?: string;
}

export interface DigioResponse {
  id: string;
  status: string;
  signers: { identifier: string; status: string; signedAt?: string }[];
  /** Per-signer signing URLs */
  signLinks: { identifier: string; url: string }[];
  simulated: boolean;
}

/**
 * Digio (https://digio.in) e-sign client.
 *
 * Live calls require DIGIO_CLIENT_ID/SECRET; without them we run sandbox mode —
 * a deterministic "signed in 1 click" link routed through our own webhook,
 * so the rest of the flow (status flip + audit) works without credentials.
 */
@Injectable()
export class DigioClient {
  private readonly log = new Logger(DigioClient.name);

  get enabled() {
    return !!(process.env.DIGIO_CLIENT_ID && process.env.DIGIO_CLIENT_SECRET);
  }

  async createRequest(req: DigioRequest): Promise<DigioResponse> {
    if (!this.enabled) {
      const apiBase =
        process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
      return {
        id: `sandbox_${req.referenceId}`,
        status: 'requested',
        signers: req.signers.map((s) => ({ identifier: s.identifier, status: 'pending' })),
        signLinks: req.signers.map((s) => ({
          identifier: s.identifier,
          url: `${apiBase}/api/webhooks/sandbox/esign/${req.referenceId}/${encodeURIComponent(s.identifier)}`,
        })),
        simulated: true,
      };
    }

    const auth =
      'Basic ' +
      Buffer.from(`${process.env.DIGIO_CLIENT_ID}:${process.env.DIGIO_CLIENT_SECRET}`).toString(
        'base64',
      );
    const res = await fetch('https://api.digio.in/v2/client/document/uploadpdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({
        file_name: req.documentName,
        file_data: req.fileBase64,
        signers: req.signers.map((s) => ({
          identifier: s.identifier,
          name: s.name,
          reason: s.reason,
          sign_type: 'aadhaar',
        })),
        expire_in_days: 14,
        send_sign_link: true,
        notify_signers: true,
        callback_url: req.callbackUrl,
        comment: req.referenceId,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Digio create failed: ${res.status} ${text}`);
    }
    const data = (await res.json()) as {
      id: string;
      agreement_status: string;
      signing_parties: { identifier: string; status: string; signing_url?: string }[];
    };
    return {
      id: data.id,
      status: data.agreement_status,
      signers: data.signing_parties.map((p) => ({
        identifier: p.identifier,
        status: p.status,
      })),
      signLinks: data.signing_parties
        .filter((p) => p.signing_url)
        .map((p) => ({ identifier: p.identifier, url: p.signing_url! })),
      simulated: false,
    };
  }
}
