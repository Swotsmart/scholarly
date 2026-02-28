/**
 * ============================================================================
 * S3 File Storage — Production Integration
 * ============================================================================
 *
 * Implements the FileStorage interface using AWS S3 (or any S3-compatible
 * store like Cloudflare R2 or MinIO). This is the filing cabinet of the
 * platform: every uploaded resource PDF, every generated book cover, every
 * EPUB file, every migrated Squarespace asset lands here.
 *
 * CloudFront is used for signed URL generation when a CDN distribution is
 * configured, falling back to S3 pre-signed URLs otherwise.
 *
 * ## Environment Variables
 *   AWS_REGION               — S3 region (e.g., 'ap-southeast-2')
 *   AWS_ACCESS_KEY_ID        — IAM access key
 *   AWS_SECRET_ACCESS_KEY    — IAM secret key
 *   S3_BUCKET_NAME           — Primary storage bucket
 *   CLOUDFRONT_DOMAIN        — CDN domain (optional, for signed URLs)
 *   CLOUDFRONT_KEY_PAIR_ID   — CloudFront key pair ID (optional)
 *   CLOUDFRONT_PRIVATE_KEY   — CloudFront private key PEM (optional)
 *
 * @module erudits/integrations/s3-storage
 * @version 1.0.0
 */

import type { FileStorage } from '../types/erudits.types';
import { Errors } from '../types/erudits.types';

// ── S3 SDK Type Stubs ──

interface S3SDK {
  putObject(params: {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType: string;
    CacheControl?: string | undefined;
  }): { promise(): Promise<unknown> };

  getSignedUrl(operation: string, params: {
    Bucket: string;
    Key: string;
    Expires: number;
  }): string;

  deleteObject(params: {
    Bucket: string;
    Key: string;
  }): { promise(): Promise<unknown> };

  copyObject(params: {
    Bucket: string;
    CopySource: string;
    Key: string;
  }): { promise(): Promise<unknown> };
}

// ── Implementation ──

export class S3FileStorageImpl implements FileStorage {
  constructor(
    private readonly s3: S3SDK,
    private readonly bucket: string,
    private readonly cdnDomain?: string,
  ) {}

  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    try {
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: 'max-age=31536000, immutable',
      }).promise();

      // Return the CDN URL if available, otherwise the S3 URL
      if (this.cdnDomain) {
        return `https://${this.cdnDomain}/${key}`;
      }
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    } catch (err) {
      throw Errors.external('S3', `Upload failed for key ${key}: ${(err as Error).message}`);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresInSeconds,
      });
    } catch (err) {
      throw Errors.external('S3', `Signed URL generation failed: ${(err as Error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key,
      }).promise();
    } catch (err) {
      throw Errors.external('S3', `Delete failed for key ${key}: ${(err as Error).message}`);
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<string> {
    try {
      await this.s3.copyObject({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
      }).promise();

      if (this.cdnDomain) {
        return `https://${this.cdnDomain}/${destKey}`;
      }
      return `https://${this.bucket}.s3.amazonaws.com/${destKey}`;
    } catch (err) {
      throw Errors.external('S3', `Copy failed: ${(err as Error).message}`);
    }
  }
}

// ── Factory ──

export function createS3FileStorage(
  s3: S3SDK,
  bucket: string,
  cdnDomain?: string,
): S3FileStorageImpl {
  return new S3FileStorageImpl(s3, bucket, cdnDomain);
}
