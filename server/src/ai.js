import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const extractionSchema = z.object({
  documentType: z.enum(["Invoice", "Receipt", "Bill", "Payment confirmation", "Other"]).default("Other"),
  merchant: z.string().default(""),
  productName: z.string().default(""),
  purchaseDate: z.string().default(""),
  amount: z.number().nonnegative().default(0),
  currency: z.string().length(3).default("INR"),
  invoiceNumber: z.string().default(""),
  warrantyText: z.string().default(""),
  confidenceNotes: z.string().default("")
});

function client() {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI did not return valid structured data.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function extractPurchaseDocument({ bytes, mimeType }) {
  const ai = client();
  if (!ai) {
    const error = new Error("Gemini API key is not configured. Add GEMINI_API_KEY to server/.env or use the demo sample.");
    error.status = 503;
    throw error;
  }

  const prompt = `You are a careful invoice and receipt data extraction assistant.
Read the supplied document and return ONLY valid JSON with these keys:
documentType, merchant, productName, purchaseDate, amount, currency, invoiceNumber, warrantyText, confidenceNotes.
Rules:
- Extract only facts visibly present in the document.
- Never guess missing merchant, product, date, amount, invoice number or warranty terms.
- Use purchaseDate in YYYY-MM-DD when unambiguous; otherwise empty string.
- amount must be a JSON number, not a string. Use 0 if absent.
- currency must be a three-letter currency code if visible, otherwise INR.
- warrantyText must quote or summarise only warranty wording actually visible; otherwise empty string.
- For multiple products, summarise the main purchase in productName and explain ambiguity in confidenceNotes.
- Do not decide whether the user is eligible for a refund or warranty claim.
- Do not include markdown fences or explanatory text outside JSON.`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: bytes.toString("base64") } }
      ]
    }],
    config: { temperature: 0.1, responseMimeType: "application/json" }
  });

  const parsed = extractionSchema.safeParse(extractJson(response.text || ""));
  if (!parsed.success) throw new Error("AI extraction returned fields in an unexpected format.");
  return parsed.data;
}

export async function createSupportMessage(input) {
  const ai = client();
  if (!ai) {
    return `Hello ${input.merchant} Support Team,\n\nI am contacting you about ${input.productName}, purchased on ${input.purchaseDate || "the date shown on my invoice"} for ${input.currency} ${input.amount}. ${input.issue || "I would appreciate your guidance regarding the available support options."}\n\nCould you please explain the applicable policy, the evidence required and the next steps? I can provide the invoice and any additional information needed.\n\nThank you.`;
  }

  const prompt = `Write a concise, polite customer-support enquiry draft. Use ONLY the supplied facts. Do not invent order IDs, dates, warranty terms, policy clauses, legal rights, product faults or promises. Ask the provider to clarify eligibility and required evidence. This is a draft only and must not claim it was submitted or approved.

Known facts:
${JSON.stringify(input, null, 2)}

Return only the message body.`;
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents: prompt,
    config: { temperature: 0.3 }
  });
  return (response.text || "").trim();
}
