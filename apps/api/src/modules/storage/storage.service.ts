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
  private readonly bucket = process.env.S3_BUCKET ?? 'rest-dev';

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'auto',
      forcePathStyle: !!process.env.S3_ENDPOINT, // MinIO needs path style
      credentials: process.env.S3_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY ?? '',
          }
        : undefined,
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
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: opts.contentType,
      }),
      { expiresIn: opts.ttlSeconds ?? 600 },
    );
    return { url, key, publicUrl: this.publicUrl(key) };
  }

  publicUrl(key: string) {
    const base = process.env.S3_PUBLIC_BASE_URL;
    if (base) return `${base.replace(/\/$/, '')}/${key}`;
    return `${process.env.S3_ENDPOINT?.replace(/\/$/, '')}/${this.bucket}/${key}`;
  }

  async signedGet(key: string, ttlSeconds = 300) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
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
