# MONEYBACK AI

**Don't lose money just because you forgot.**

MONEYBACK AI is an evidence-led consumer assistant that helps people organise purchase records, identify possible warranty/refund/billing actions, prepare support messages and track follow-ups.

> Important: The app identifies possible next steps. It does not guarantee a refund, replacement, warranty repair or charge reversal. The merchant, bank, platform and applicable policy determine the outcome.

## Features

- Upload invoice/receipt images and PDFs.
- Gemini-powered extraction of merchant, product, date, amount and visible warranty details.
- Editable extraction review before saving.
- Rule-based opportunity suggestions for warranty enquiries, return/refund follow-up and possible duplicate-payment checks.
- Evidence checklist and clear `Needs verification` labels.
- AI-generated editable claim/support message drafts.
- Recovery case tracker with statuses and follow-up dates.
- Dashboard separates potential, approved and user-confirmed recovered amounts.
- Browser local storage for this hackathon MVP.
- Responsive layout and keyboard-friendly controls.

## Tech stack

- React + Vite
- Node.js + Express
- Google Gemini API (`@google/genai`)
- Browser localStorage for the demo's user records

## Requirements

- Node.js 20 or newer
- npm
- A Gemini API key from Google AI Studio (optional for manual/demo mode; required for AI extraction and message generation)

## Run locally

1. Download/clone this repository.
2. Install root dependencies:

   ```bash
   npm install
   ```

3. Install frontend and backend dependencies:

   ```bash
   npm --prefix client install
   npm --prefix server install
   ```

4. Create `server/.env` by copying `.env.example` and add your key:

   ```env
   GEMINI_API_KEY=your_real_key
   GEMINI_MODEL=gemini-3.8-flash
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   ```

5. Start both apps:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:5173`.

Frontend: `http://localhost:5173`  
Backend health check: `http://localhost:5000/api/health`

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

## GitHub submission

Do **not** commit API keys, `.env` files, private invoices, receipts or personal documents.

```bash
git init
git add .
git commit -m "Build MONEYBACK AI hackathon MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/moneyback-ai.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

## AI and privacy notes

- The Gemini key is read only by the backend. Never put it in a `VITE_` variable or frontend source.
- Uploaded files are processed in memory and are not written to a permanent server upload folder by this MVP.
- The browser stores demo records in localStorage. This is convenient for a hackathon demo, but it is not a secure multi-user production database.
- Do not upload real bank statements or sensitive identity documents to a public demo.
- Extraction is AI-assisted and may be wrong. Review every field before saving.
- Warranty/policy entitlement is not verified by the app. The opportunity engine deliberately labels results as possible or unverified unless a human supplies evidence.
- Duplicate-looking records are not proof of duplicate debits or fraud. Verify against the bank/provider statement.
- Message drafts are not submitted automatically.

## Demo flow

1. Click **Add document** and upload a sample invoice or receipt.
2. Click **Extract with AI**. If no API key is configured, use **Try demo sample**.
3. Review and edit the extracted fields, then save.
4. Open an opportunity and review its reason and evidence checklist.
5. Generate a support message, edit it and copy it.
6. Create a case and update its status.
7. Record a recovered amount only after the user confirms the money was actually received.

## Current MVP limitations

- No sign-in or cloud sync.
- Records are stored in the current browser profile only.
- No direct bank, merchant, Gmail or payment-provider integrations.
- No automatic claim submission or cancellation.
- Policy lookup is not automated; policy-dependent opportunities remain marked for verification.
- For production, add authentication, user-scoped database/storage rules, secure document retention/deletion, rate limiting, malware scanning and official-source policy verification.
