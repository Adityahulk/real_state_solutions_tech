import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';

export interface MuxDirectUpload {
  uploadId: string;
  /** PUT this URL with the video Blob to start ingestion */
  uploadUrl: string;
  simulated: boolean;
}

export interface MuxAssetSummary {
  assetId: string;
  playbackId: string | null;
  status: 'preparing' | 'ready' | 'errored' | 'pending';
}

/**
 * Mux wrapper.
 *
 * Live mode requires:
 *   MUX_TOKEN_ID + MUX_TOKEN_SECRET     — API access (Basic auth)
 *   MUX_WEBHOOK_SECRET                  — Mux signs webhooks with this
 *   MUX_SIGNING_KEY_ID + MUX_SIGNING_KEY_PRIVATE_BASE64
 *                                       — for signed playback (HS256 JWT)
 *
 * Without API credentials we run in **sandbox**: presign a normal S3 upload
 * via StorageService (provided by the caller), and emit deterministic
 * `sandbox_*` ids. The marketing controller treats the fake asset as `ready`
 * immediately so the rest of the workflow is exercisable.
 */
@Injectable()
export class MuxService {
  private readonly log = new Logger(MuxService.name);

  get enabled() {
    return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
  }

  async createDirectUpload(opts: { referenceId: string }): Promise<MuxDirectUpload> {
    if (!this.enabled) {
      // Caller must build an S3 presign and reuse the storage path; we just
      // emit the sandbox marker so downstream can branch.
      return {
        uploadId: `sandbox_upload_${opts.referenceId}`,
        uploadUrl: 'sandbox://see-storage-presign',
        simulated: true,
      };
    }

    const res = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: this.auth(),
      },
      body: JSON.stringify({
        cors_origin: process.env.NEXTAUTH_URL ?? '*',
        new_asset_settings: {
          playback_policy: ['signed'],
          mp4_support: 'standard',
        },
        // Mux returns this on asset events so we can correlate.
        passthrough: opts.referenceId,
      }),
    });
    if (!res.ok) {
      throw new Error(`Mux upload create failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as {
      data: { id: string; url: string };
    };
    return { uploadId: data.data.id, uploadUrl: data.data.url, simulated: false };
  }

  async resolveUpload(uploadId: string): Promise<MuxAssetSummary | null> {
    if (uploadId.startsWith('sandbox_')) {
      return { assetId: uploadId, playbackId: uploadId, status: 'ready' };
    }
    if (!this.enabled) return null;
    const res = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: { authorization: this.auth() },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data: { asset_id?: string; status: string };
    };
    if (!data.data.asset_id) return { assetId: '', playbackId: null, status: 'preparing' };
    // Fetch the asset for its playback ids
    const a = await fetch(`https://api.mux.com/video/v1/assets/${data.data.asset_id}`, {
      headers: { authorization: this.auth() },
    });
    if (!a.ok) return { assetId: data.data.asset_id, playbackId: null, status: 'preparing' };
    const asset = (await a.json()) as {
      data: {
        id: string;
        status: 'preparing' | 'ready' | 'errored';
        playback_ids?: { id: string; policy: string }[];
      };
    };
    return {
      assetId: asset.data.id,
      playbackId: asset.data.playback_ids?.[0]?.id ?? null,
      status: asset.data.status,
    };
  }

  /**
   * Build a signed HS256 JWT for a private playback id. Mux uses RS256 with a
   * private key in production; for v1 we support HS256 via shared signing
   * secret which is fine for staging or a sandbox-with-real-Mux setup.
   * If signing keys are absent, returns a public-ish stream URL (works when
   * playback policy is "public", and is the default in sandbox).
   */
  signedPlaybackUrl(playbackId: string, opts: { ttlSeconds?: number } = {}): string {
    if (playbackId.startsWith('sandbox_')) {
      // The web layer renders a placeholder for sandbox playback ids.
      return `mux://sandbox/${playbackId}`;
    }
    const kid = process.env.MUX_SIGNING_KEY_ID;
    const secret = process.env.MUX_SIGNING_KEY_PRIVATE_BASE64;
    if (!kid || !secret) {
      return `https://stream.mux.com/${playbackId}.m3u8`;
    }
    const header = b64urlJson({ alg: 'HS256', typ: 'JWT', kid });
    const ttl = opts.ttlSeconds ?? 3600;
    const payload = b64urlJson({
      sub: playbackId,
      aud: 'v',
      exp: Math.floor(Date.now() / 1000) + ttl,
      kid,
    });
    const data = `${header}.${payload}`;
    const sig = createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(data)
      .digest('base64url');
    return `https://stream.mux.com/${playbackId}.m3u8?token=${data}.${sig}`;
  }

  verifyWebhook(rawBody: string, signatureHeader: string | undefined): boolean {
    const secret = process.env.MUX_WEBHOOK_SECRET;
    if (!secret || !signatureHeader) return false;
    // Mux sig header: `t=<unix>,v1=<hex>`
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => {
        const [k, v] = p.split('=');
        return [k!, v ?? ''];
      }),
    );
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) return false;
    const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
    return expected === v1;
  }

  private auth() {
    return (
      'Basic ' +
      Buffer.from(
        `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`,
      ).toString('base64')
    );
  }
}

function b64urlJson(o: object): string {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}
