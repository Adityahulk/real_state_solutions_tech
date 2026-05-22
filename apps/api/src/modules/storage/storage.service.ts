import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly client: S3Client;
  // Separate client for presigned URLs — uses the public-facing endpoint so
  // the browser can reach it. S3_PUBLIC_ENDPOINT defaults to S3_ENDPOINT.
  private readonly presignClient: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? 'rest-dev';

  constructor() {
    const credentials = process.env.S3_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY ?? '',
        }
      : undefined;

    // Internal client — used for server-side put/get/head (localhost is fine).
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'auto',
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials,
    });

    // Presign client — the endpoint embedded in the signed URL must be
    // reachable from the browser, so use S3_PUBLIC_ENDPOINT when set.
    const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT;
    this.presignClient = new S3Client({
      endpoint: publicEndpoint,
      region: process.env.S3_REGION ?? 'auto',
      forcePathStyle: !!publicEndpoint,
      credentials,
    });
  }

  /**
   * Mint a presigned PUT URL the browser can use to upload directly.
   * Returns the URL plus the final storage key the caller will persist.
   */
  async presignUpload(opts: {
    prefix: string;
    filename: string;
    contentType: string;
    ttlSeconds?: number;
  }) {
    const safe = opts.filename.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const key = `${opts.prefix}/${randomUUID()}-${safe}`;
    const rawUrl = await getSignedUrl(
      this.presignClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: opts.contentType,
      }),
      { expiresIn: opts.ttlSeconds ?? 600 },
    );
    // If S3_ENDPOINT is an internal address (e.g. localhost) and
    // S3_PUBLIC_ENDPOINT is set, rewrite the URL so the browser hits
    // the public address instead of the server's loopback.
    const internalEndpoint = (process.env.S3_ENDPOINT ?? '').replace(/\/$/, '');
    const publicEndpoint = (process.env.S3_PUBLIC_ENDPOINT ?? internalEndpoint).replace(/\/$/, '');
    const url = internalEndpoint && publicEndpoint !== internalEndpoint
      ? rawUrl.replace(internalEndpoint, publicEndpoint)
      : rawUrl;
    return { url, key, publicUrl: this.publicUrl(key) };
  }

  publicUrl(key: string) {
    const base = process.env.S3_PUBLIC_BASE_URL;
    if (base) return `${base.replace(/\/$/, '')}/${key}`;
    return `${process.env.S3_ENDPOINT?.replace(/\/$/, '')}/${this.bucket}/${key}`;
  }

  async signedGet(key: string, ttlSeconds = 300) {
    const rawUrl = await getSignedUrl(
      this.presignClient,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
    const internalEndpoint = (process.env.S3_ENDPOINT ?? '').replace(/\/$/, '');
    const publicEndpoint = (process.env.S3_PUBLIC_ENDPOINT ?? internalEndpoint).replace(/\/$/, '');
    return internalEndpoint && publicEndpoint !== internalEndpoint
      ? rawUrl.replace(internalEndpoint, publicEndpoint)
      : rawUrl;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async putObject(key: string, body: Buffer | string, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, publicUrl: this.publicUrl(key) };
  }

  async getObject(key: string): Promise<Buffer> {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of out.Body as AsyncIterable<Buffer>) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
}
