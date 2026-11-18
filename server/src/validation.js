import { z } from "zod";

export const messageSchema = z.object({
  merchant: z.string().trim().min(1).max(160),
  productName: z.string().trim().min(1).max(160),
  purchaseDate: z.string().max(30).optional().default(""),
  amount: z.coerce.number().min(0).max(100000000),
  currency: z.string().trim().length(3).optional().default("INR"),
  invoiceNumber: z.string().max(100).optional().default(""),
  issue: z.string().max(1000).optional().default(""),
  opportunityType: z.string().max(120).optional().default("Support enquiry"),
  reason: z.string().max(1500).optional().default(""),
  missing: z.array(z.string().max(200)).max(20).optional().default([])
});

export function safeText(value, max = 500) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}
