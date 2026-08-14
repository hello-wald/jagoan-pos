import { z } from "zod";

export const createProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3, "SKU minimal 3 karakter")
    .max(50, "SKU maksimal 50 karakter")
    .regex(/^[A-Za-z0-9_-]+$/, "SKU hanya boleh berisi huruf, angka, strip (-), dan underscore (_)"),
  name: z
    .string()
    .trim()
    .min(2, "Nama produk minimal 2 karakter")
    .max(150, "Nama produk maksimal 150 karakter"),
  price: z
    .number({ message: "Harga harus berupa angka" })
    .int("Harga harus bilangan bulat")
    .min(100, "Harga produk minimal Rp 100"),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama produk minimal 2 karakter")
    .max(150, "Nama produk maksimal 150 karakter"),
  price: z
    .number({ message: "Harga harus berupa angka" })
    .int("Harga harus bilangan bulat")
    .min(100, "Harga produk minimal Rp 100"),
  isActive: z.boolean(),
});
