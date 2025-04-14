import { z } from 'zod';

// --- Admin Config ---

const adminSchema = z.object({
  ens: z.string().optional(),
  address: z.string().optional(),
}).refine(data => data.ens || data.address, {
  message: "Either ENS name or Address must be provided for an admin",
});

const adminConfigSchema = z.object({
  admins: z.array(adminSchema).min(1, "At least one admin must be configured"),
});

// --- Shop Config ---

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  emoji: z.string(),
  inStock: z.union([z.boolean(), z.literal('infinite')]),
});

const shopSchema = z.object({
  name: z.string(),
  telegramHandle: z.string(),
});

const shopConfigSchema = z.object({
  shops: z.array(shopSchema).min(1, "At least one shop must be configured"),
  products: z.array(productSchema),
});

// --- Environment Variable Parsing ---

function parseEnvVar(key: string): unknown {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON in environment variable ${key}: ${error}`);
  }
}

// --- Exported Config ---

export const adminConfig = adminConfigSchema.parse(parseEnvVar('VITE_ADMIN_CONFIG'));
export const shopConfig = shopConfigSchema.parse(parseEnvVar('VITE_SHOP_CONFIG'));

// --- Type Exports ---
export type AdminConfig = z.infer<typeof adminConfigSchema>;
export type ShopConfig = z.infer<typeof shopConfigSchema>;
export type Product = z.infer<typeof productSchema>;
export type Shop = z.infer<typeof shopSchema>;
export type Admin = z.infer<typeof adminSchema>; 