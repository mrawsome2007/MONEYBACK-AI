import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { fileTypeFromBuffer } from "file-type";
import { extractPurchaseDocument, createSupportMessage } from "./ai.js";
import { messageSchema } from "./validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 8080);
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((x) => x.trim());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "moneyback-ai-api",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post("/api/extract", upload.single("document"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Upload one invoice or receipt file." });
    }
    const detected = await fileTypeFromBuffer(req.file.buffer);
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
    if (!detected || !allowed.has(detected.mime)) {
      return res.status(415).json({
        error: "Unsupported file. Upload a valid PDF, PNG, JPG or WEBP document.",
      });
    }
    const data = await extractPurchaseDocument({
      bytes: req.file.buffer,
      mimeType: detected.mime,
    });
    res.json({ ok: true, data, reviewedByUser: false });
  } catch (error) {
    next(error);
  }
});

app.post("/api/generate-message", async (req, res, next) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Please provide valid merchant, product and amount details." });
    }
    const message = await createSupportMessage(parsed.data);
    res.json({ ok: true, message, sent: false });
  } catch (error) {
    next(error);
  }
});

// Serve built Vite frontend from client/dist
const distPath = path.resolve(__dirname, "..", "..", "client", "dist");
const indexHtmlPath = path.join(distPath, "index.html");

if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(distPath));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(indexHtmlPath);
  });
}

app.use((error, _req, res, _next) => {
  console.error("[API]", error.message);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "File is larger than 10 MB." : "Invalid upload.",
    });
  }
  const status = Number(error.status || 500);
  res.status(status).json({
    error:
      status >= 500 && status !== 503
        ? "Server error. Check the backend logs and try again."
        : error.message,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MONEYBACK AI API listening on port ${PORT}`);
});