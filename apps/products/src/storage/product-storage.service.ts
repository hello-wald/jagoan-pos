import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProductsEnv } from "../config/env.schema";

@Injectable()
export class ProductStorageService {
  private readonly logger = new Logger(ProductStorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService<ProductsEnv, true>) {
    this.client = createClient(
      config.getOrThrow("SUPABASE_PRODUCTS_URL", { infer: true }),
      config.getOrThrow("SUPABASE_PRODUCTS_SERVICE_ROLE_KEY", { infer: true }),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    this.bucket = config.getOrThrow("PRODUCTS_STORAGE_BUCKET", { infer: true });
  }

  async createSignedUploadUrl(path: string): Promise<{ signedUrl: string; token: string }> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUploadUrl(path);
    if (error || !data) throw this.storageError("create an upload URL", error);
    return { signedUrl: data.signedUrl, token: data.token };
  }

  async getObject(path: string): Promise<{ size: number; contentType: string }> {
    const { data, error } = await this.client.storage.from(this.bucket).download(path);
    if (error || !data) throw this.storageError("read the uploaded image", error);
    return { size: data.size, contentType: data.type };
  }

  async createSignedReadUrl(path: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data) throw this.storageError("create an image URL", error);
    return data.signedUrl;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) throw this.storageError("delete the image", error);
  }

  private storageError(action: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error ?? "unknown error");
    this.logger.error(`Unable to ${action}: ${message}`);
    return new Error(`Storage operation failed while attempting to ${action}`);
  }
}
