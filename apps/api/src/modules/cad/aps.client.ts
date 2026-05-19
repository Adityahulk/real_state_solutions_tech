import { Injectable, Logger } from '@nestjs/common';

interface ApsToken {
  access_token: string;
  expires_at: number;
}

/**
 * Autodesk Platform Services (APS / Forge) client.
 *
 * Translates DWG → SVF/SVF2 + a JSON properties dump. We then walk the
 * properties tree extracting polylines on the `PLOTS` / `ROADS` / … layers
 * (see docs/cad-layer-standard.md).
 *
 * Requires `APS_CLIENT_ID` + `APS_CLIENT_SECRET`. Without them this client
 * reports `enabled === false` and `CadParser` falls back to its sandbox grid.
 *
 * Polling note: translation jobs typically take 30s–3min for DWG. The
 * processor awaits with a 5s/2min budget.
 */
@Injectable()
export class ApsClient {
  private readonly log = new Logger(ApsClient.name);
  private token: ApsToken | null = null;

  get enabled() {
    return !!(process.env.APS_CLIENT_ID && process.env.APS_CLIENT_SECRET);
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expires_at > Date.now() + 30_000) {
      return this.token.access_token;
    }
    const res = await fetch('https://developer.api.autodesk.com/authentication/v2/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization:
          'Basic ' +
          Buffer.from(`${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`).toString(
            'base64',
          ),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'data:read data:write data:create bucket:create bucket:read',
      }),
    });
    if (!res.ok) throw new Error(`APS auth failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return this.token.access_token;
  }

  /**
   * Ensure the per-platform OSS bucket exists. APS buckets are global — name
   * yours uniquely; we derive from APS_BUCKET_PREFIX or fall back to client id.
   */
  private async bucketKey(): Promise<string> {
    const prefix =
      process.env.APS_BUCKET_PREFIX ??
      `rest-${(process.env.APS_CLIENT_ID ?? 'x').slice(0, 8).toLowerCase()}`;
    const token = await this.getToken();
    const res = await fetch('https://developer.api.autodesk.com/oss/v2/buckets', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ bucketKey: prefix, policyKey: 'transient' }),
    });
    if (res.ok || res.status === 409) return prefix;
    throw new Error(`APS bucket create failed: ${res.status} ${await res.text()}`);
  }

  async uploadAndTranslate(filename: string, buf: Buffer): Promise<{ urn: string }> {
    const token = await this.getToken();
    const bucket = await this.bucketKey();
    const objectKey = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;

    // S3-signed PUT
    const sign = await fetch(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucket}/objects/${encodeURIComponent(
        objectKey,
      )}/signeds3upload`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!sign.ok) throw new Error(`APS sign failed: ${sign.status} ${await sign.text()}`);
    const signed = (await sign.json()) as { uploadKey: string; urls: string[] };

    const put = await fetch(signed.urls[0]!, { method: 'PUT', body: buf });
    if (!put.ok) throw new Error(`APS PUT failed: ${put.status}`);

    const complete = await fetch(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucket}/objects/${encodeURIComponent(
        objectKey,
      )}/signeds3upload`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ uploadKey: signed.uploadKey }),
      },
    );
    if (!complete.ok) {
      throw new Error(`APS complete failed: ${complete.status} ${await complete.text()}`);
    }
    const completion = (await complete.json()) as { objectId: string };
    const urn = Buffer.from(completion.objectId).toString('base64url');

    // Translate to SVF2 + extract object tree
    const trans = await fetch('https://developer.api.autodesk.com/modelderivative/v2/designdata/job', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-ads-force': 'true',
      },
      body: JSON.stringify({
        input: { urn },
        output: { formats: [{ type: 'svf2', views: ['2d'] }] },
      }),
    });
    if (!trans.ok) throw new Error(`APS translate failed: ${trans.status} ${await trans.text()}`);
    return { urn };
  }

  async waitForReady(urn: string, opts: { timeoutMs?: number } = {}): Promise<void> {
    const token = await this.getToken();
    const start = Date.now();
    const limit = opts.timeoutMs ?? 120_000;
    while (Date.now() - start < limit) {
      const res = await fetch(
        `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`APS manifest failed: ${res.status}`);
      const m = (await res.json()) as { status: string; progress?: string };
      if (m.status === 'success' || m.status === 'complete') return;
      if (m.status === 'failed') throw new Error('APS translation failed');
      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error('APS translation timed out');
  }

  /**
   * Fetch the metadata viewable + object tree, then extract polylines on
   * known layers. Returns features in a generic GeoJSON-ish form for the
   * parser to normalise.
   *
   * Note: the actual extraction of geometry coordinates requires the SVF
   * derivative — APS exposes properties (layer / handle / labels) via
   * `/metadata`, geometry is shipped in SVF2 binary. For v1 we use a
   * pragmatic shortcut: rely on layer + label metadata to identify
   * entities and return their bounding box from the property bag if
   * available. Production callers should integrate `forge-svf-utils` to
   * read coordinates directly from the SVF.
   */
  async readEntities(urn: string): Promise<
    Array<{
      layer: string;
      label: string;
      properties: Record<string, unknown>;
    }>
  > {
    const token = await this.getToken();
    const meta = await fetch(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/metadata`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!meta.ok) throw new Error(`APS metadata failed: ${meta.status}`);
    const m = (await meta.json()) as { data: { metadata: { guid: string }[] } };
    const guid = m.data.metadata?.[0]?.guid;
    if (!guid) return [];

    const props = await fetch(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/metadata/${guid}/properties`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!props.ok) return [];
    const p = (await props.json()) as {
      data: {
        collection: {
          name?: string;
          properties?: { Layer?: { Layer?: string } } & Record<string, unknown>;
        }[];
      };
    };

    return (p.data.collection ?? []).map((row) => ({
      layer: String(row.properties?.Layer?.Layer ?? ''),
      label: String(row.name ?? ''),
      properties: row.properties ?? {},
    }));
  }
}
