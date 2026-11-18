import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown,
  CircleAlert, ClipboardList, Copy, FileImage, FileText, Filter, LayoutDashboard,
  LifeBuoy, Menu, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, UploadCloud,
  Wallet, X, Clock3, ScanText, Send, BadgeCheck
} from "lucide-react";
import { extractDocument, generateMessage, getHealth } from "./api";
import { detectOpportunities } from "./opportunities";

const STORE = "moneyback_ai_records_v1";
const CASE_STORE = "moneyback_ai_cases_v1";
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();
const money = (amount, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency", currency, maximumFractionDigits: 2
}).format(Number(amount || 0));

const sampleRecord = {
  id: uid(), merchant: "SoundSphere Electronics", productName: "Wireless headphones",
  purchaseDate: "2026-10-20", amount: 2499, currency: "INR",
  invoiceNumber: "DEMO-INV-2048", documentType: "Invoice",
  warrantyText: "Warranty terms not visible in this demo invoice",
  notes: "Demo only: one side is not working.", createdAt: new Date().toISOString()
};

function readStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function StatusPill({ children, tone = "neutral" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
function StatCard({ icon: Icon, label, value, note, tone = "blue" }) {
  return <div className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={18} /></div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-note">{note}</div>
  </div>;
}
function Modal({ title, onClose, children, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head"><div><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button></header>
      {children}
    </section>
  </div>;
}

export default function App() {
  const [records, setRecords] = useState(() => readStore(STORE));
  const [cases, setCases] = useState(() => readStore(CASE_STORE));
  const [page, setPage] = useState("Overview");
  const [modal, setModal] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [draft, setDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [health, setHealth] = useState("checking");
  const [mobileOpen, setMobileOpen] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => localStorage.setItem(STORE, JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem(CASE_STORE, JSON.stringify(cases)), [cases]);
  useEffect(() => { getHealth().then(() => setHealth("online")).catch(() => setHealth("offline")); }, []);

  const opportunities = useMemo(() => records.flatMap((r) => detectOpportunities(r, records)), [records]);
  const recordsWithOpportunities = new Set(opportunities.map((item) => item.id.split("-").slice(0, -1).join("-")));
  const potential = records.filter((record) => opportunities.some((item) => item.id.startsWith(record.id + "-"))).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const recovered = cases.filter((c) => c.status === "Recovered").reduce((sum, c) => sum + Number(c.recoveredAmount || 0), 0);
  const activeCases = cases.filter((c) => !["Recovered", "Closed"].includes(c.status)).length;
  const visibleRecords = records.filter((r) => {
    const text = `${r.merchant} ${r.productName} ${r.invoiceNumber}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesFilter = filter === "All" || r.documentType === filter;
    return matchesSearch && matchesFilter;
  });

  function openUpload() {
    setFile(null); setDraft(null); setError(""); setNotice(""); setModal("upload");
  }
  async function runExtraction() {
    if (!file) { setError("Choose an invoice or receipt first."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await extractDocument(file);
      setDraft({ ...result.data, id: uid(), notes: "", createdAt: new Date().toISOString() });
      setNotice(result.demo ? "Demo extraction returned. Review the fields before saving." : "AI extraction complete. Please review every field.");
    } catch (err) {
      setError(`${err.message}. You can still try the demo sample.`);
    } finally { setBusy(false); }
  }
  function useDemo() {
    setDraft({ ...sampleRecord, id: uid(), createdAt: new Date().toISOString() });
    setNotice("Sample data loaded. This is illustrative data, not a real purchase.");
    setError("");
  }
  function saveRecord() {
    if (!draft?.productName?.trim() || !draft?.merchant?.trim()) {
      setError("Product and merchant are required."); return;
    }
    if (Number(draft.amount) < 0 || !Number.isFinite(Number(draft.amount))) {
      setError("Enter a valid non-negative amount."); return;
    }
    const saved = { ...draft, amount: Number(draft.amount || 0) };
    setRecords((prev) => [saved, ...prev]);
    setModal(""); setDraft(null); setFile(null); setPage("Opportunities");
  }
  function removeRecord(id) {
    if (!window.confirm("Delete this purchase record from this browser?")) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }
  async function makeMessage(opportunity) {
    const record = records.find((r) => r.id === opportunity.recordId) || selectedRecord;
    if (!record) return;
    setBusy(true); setError("");
    try {
      const result = await generateMessage({
        merchant: record.merchant, productName: record.productName,
        purchaseDate: record.purchaseDate, amount: record.amount,
        currency: record.currency || "INR", invoiceNumber: record.invoiceNumber,
        issue: record.notes, opportunityType: opportunity.type,
        reason: opportunity.reason, missing: opportunity.missing
      });
      setMessage(result.message);
    } catch {
      setMessage(`Hello ${record.merchant} Support Team,\n\nI am contacting you regarding ${record.productName}, purchased on ${record.purchaseDate || "the date shown on my invoice"} for ${money(record.amount, record.currency || "INR")}. ${record.notes || "I would appreciate your guidance on the available support options."}\n\nCould you please let me know the applicable policy, required evidence and next steps? I can share the invoice and any additional details required.\n\nThank you.`);
    } finally { setBusy(false); setModal("message"); }
  }
  function createCase(opportunity) {
    const record = records.find((r) => r.id === opportunity.recordId);
    if (!record) return;
    const item = {
      id: uid(), opportunityType: opportunity.type, merchant: record.merchant,
      productName: record.productName, potentialAmount: Number(opportunity.potentialAmount || 0),
      recoveredAmount: 0, status: "Draft", followUpDate: "", reference: "",
      createdAt: new Date().toISOString()
    };
    setCases((prev) => [item, ...prev]);
    setPage("My Claims"); setNotice("Case created. Update its status only when the action actually happens.");
  }
  function updateCase(id, patch) {
    setCases((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ records, cases }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "moneyback-ai-export.json"; a.click(); URL.revokeObjectURL(url);
  }
  function nav(name) { setPage(name); setMobileOpen(false); setNotice(""); }

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "My Documents", icon: FileText },
    { name: "Opportunities", icon: Sparkles },
    { name: "My Claims", icon: ClipboardList }
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Wallet size={20}/></div><div><strong>MONEYBACK</strong><span>AI ASSISTANT</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-link ${page === name ? "active" : ""}`} onClick={() => nav(name)}><Icon size={18}/>{name}{name === "Opportunities" && opportunities.length > 0 && <span className="nav-count">{opportunities.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="privacy-card"><ShieldCheck size={18}/><div><b>Your records stay local</b><span>This MVP stores data in this browser.</span></div></div>
        <button className="nav-link" onClick={exportData}><ArrowDownToLine size={18}/>Export my data</button>
        <div className="profile"><div className="avatar">MB</div><div><b>Demo workspace</b><span>Personal account</span></div><ChevronDown size={15}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="mobile-menu icon-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu"><Menu/></button>
        <div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div>
        <div className="top-actions"><span className={`api-status ${health}`}><i/>AI service {health === "online" ? "connected" : health === "offline" ? "offline" : "checking"}</span><button className="icon-btn" aria-label="Notifications"><Bell size={18}/></button><button className="primary-btn small" onClick={openUpload}><Plus size={16}/> Add document</button></div>
      </header>

      <div className="content">
        {notice && <div className="notice"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {page === "Overview" && <>
          <div className="page-heading"><div><div className="eyebrow">YOUR FINANCIAL MEMORY</div><h1>Good day. Let's find what needs attention.</h1><p>Turn purchase records into clear, evidence-led next steps.</p></div><button className="primary-btn" onClick={openUpload}><UploadCloud size={17}/> Scan a document</button></div>
          <div className="stats-grid">
            <StatCard icon={Sparkles} label="Potential opportunities" value={opportunities.length} note="Suggestions to review" tone="purple"/>
            <StatCard icon={Wallet} label="Potential value" value={money(potential)} note="Not confirmed or guaranteed" tone="blue"/>
            <StatCard icon={CheckCircle2} label="Recovered amount" value={money(recovered)} note="User-confirmed only" tone="green"/>
            <StatCard icon={Activity} label="Active cases" value={activeCases} note="Needs follow-up" tone="orange"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel upload-panel">
              <div className="panel-title"><div><h2>Start with a document</h2><p>Upload a receipt or invoice to extract key details.</p></div><div className="round-icon"><ScanText size={20}/></div></div>
              <button className="dropzone" onClick={openUpload}><div className="upload-icon"><UploadCloud size={23}/></div><b>Click to upload an invoice or receipt</b><span>PDF, PNG, JPG or WEBP · Max 10 MB</span><em>AI extraction requires a configured Gemini API key.</em></button>
              <div className="supported"><span><FileText size={15}/> PDF</span><span><FileImage size={15}/> Images</span><span><Sparkles size={15}/> Gemini AI</span></div>
            </section>
            <section className="panel attention-panel">
              <div className="panel-title"><div><h2>What happens next?</h2><p>A transparent process, with you in control.</p></div><LifeBuoy size={20} className="muted-icon"/></div>
              <div className="step-list">
                <div className="step"><span>1</span><div><b>Extract purchase details</b><small>Review AI-extracted facts before saving.</small></div></div>
                <div className="step"><span>2</span><div><b>Review possible opportunities</b><small>See why an item was flagged and what is missing.</small></div></div>
                <div className="step"><span>3</span><div><b>Prepare and track a claim</b><small>You decide whether and when to contact a provider.</small></div></div>
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="section-heading"><div><h2>Recent purchase records</h2><p>Your latest saved invoices and receipts.</p></div><button className="text-btn" onClick={() => nav("My Documents")}>View all <ArrowUpRight size={15}/></button></div>
            <RecordTable records={records.slice(0, 4)} onSelect={(r) => { setSelectedRecord(r); setModal("record"); }} onDelete={removeRecord}/>
          </section>
          <div className="disclaimer"><ShieldCheck size={17}/><span><b>Evidence-first, not promises.</b> Potential amounts are estimates based on your records. Only mark money as recovered after you confirm receipt.</span></div>
        </>}

        {page === "My Documents" && <>
          <div className="page-heading"><div><div className="eyebrow">PURCHASE LIBRARY</div><h1>My documents</h1><p>Keep invoices and purchase details organised in one place.</p></div><button className="primary-btn" onClick={openUpload}><Plus size={17}/> Add document</button></div>
          <div className="toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search merchant, product or invoice..."/></div><div className="filterbox"><Filter size={16}/><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All</option><option>Invoice</option><option>Receipt</option><option>Bill</option><option>Payment confirmation</option></select></div></div>
          <section className="panel"><RecordTable records={visibleRecords} onSelect={(r) => { setSelectedRecord(r); setModal("record"); }} onDelete={removeRecord}/></section>
        </>}

        {page === "Opportunities" && <>
          <div className="page-heading"><div><div className="eyebrow">AI-ASSISTED REVIEW</div><h1>Opportunities to investigate</h1><p>Suggestions based on saved records. Verify eligibility with the provider.</p></div><StatusPill tone="warning">Not verified claims</StatusPill></div>
          {opportunities.length === 0 ? <EmptyState title="No opportunities yet" text="Add a purchase document to see possible warranty, return or payment checks." action={openUpload}/> :
            <div className="opportunity-grid">{opportunities.map((o) => {
              const record = records.find((r) => o.id.startsWith(r.id));
              return <article className="opportunity-card" key={o.id}>
                <div className="opportunity-top"><div className="opportunity-icon"><Sparkles size={18}/></div><StatusPill tone="warning">{o.status}</StatusPill></div>
                <h3>{o.type}</h3><p className="opportunity-product">{record?.productName} · {record?.merchant}</p>
                <p className="opportunity-reason">{o.reason}</p>
                <div className="amount-line"><span>Potential reference value</span><b>{money(o.potentialAmount, record?.currency || "INR")}</b></div>
                <div className="opportunity-actions"><button className="secondary-btn" onClick={() => { setSelectedOpportunity({ ...o, recordId: record?.id }); setModal("opportunity"); }}>View evidence checklist</button><button className="primary-btn small" onClick={() => createCase({ ...o, recordId: record?.id })}>Track case</button></div>
              </article>;
            })}</div>}
          <div className="disclaimer"><CircleAlert size={17}/><span>These are prompts to investigate, not findings of eligibility. Policy terms and payment records must be checked independently.</span></div>
        </>}

        {page === "My Claims" && <>
          <div className="page-heading"><div><div className="eyebrow">FOLLOW-UP WORKSPACE</div><h1>My claims</h1><p>Track what you have prepared, submitted and actually recovered.</p></div><StatusPill>{cases.length} total cases</StatusPill></div>
          {cases.length === 0 ? <EmptyState title="No cases created" text="Open an opportunity and choose Track case to start a follow-up record."/> :
            <div className="panel case-panel"><div className="case-table-wrap"><table className="data-table"><thead><tr><th>Case</th><th>Potential value</th><th>Status</th><th>Follow-up date</th><th>Recovered</th></tr></thead><tbody>{cases.map((c) => <tr key={c.id}><td><b>{c.opportunityType}</b><small>{c.productName} · {c.merchant}</small></td><td>{money(c.potentialAmount)}</td><td><select className="status-select" value={c.status} onChange={(e) => updateCase(c.id, { status: e.target.value })}><option>Draft</option><option>Ready to submit</option><option>Submitted</option><option>Waiting</option><option>Approved</option><option>Rejected</option><option>Recovered</option><option>Closed</option></select></td><td><input aria-label="Follow-up date" type="date" value={c.followUpDate || ""} onChange={(e) => updateCase(c.id, { followUpDate: e.target.value })}/></td><td><input aria-label="Recovered amount" className="recovered-input" type="number" min="0" value={c.recoveredAmount || 0} onChange={(e) => updateCase(c.id, { recoveredAmount: Number(e.target.value) })} disabled={c.status !== "Recovered"}/></td></tr>)}</tbody></table></div><p className="table-note"><CircleAlert size={15}/> Set status to Recovered only after the user confirms the money was received. The recovered amount is user-entered.</p></div>}
        </>}

        <footer className="footer"><span>© 2026 MONEYBACK AI</span><span>Built for responsible consumer recovery · <b>Demo MVP</b></span></footer>
      </div>
    </main>

    {modal === "upload" && <Modal title="Add purchase document" onClose={() => setModal("")} wide>
      <div className="modal-body">
        <div className="upload-modal-zone" onClick={() => fileRef.current?.click()} role="button" tabIndex="0" onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" hidden onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }}/>
          <div className="upload-icon large"><UploadCloud size={27}/></div><b>{file ? file.name : "Choose a file or drop it here"}</b><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, PNG, JPG or WEBP · Up to 10 MB"}</span>
        </div>
        <div className="inline-actions"><button className="primary-btn" disabled={busy || !file} onClick={runExtraction}>{busy ? <RefreshCw className="spin" size={16}/> : <Sparkles size={16}/>} {busy ? "Extracting..." : "Extract with AI"}</button><button className="secondary-btn" onClick={useDemo}>Try demo sample</button></div>
        {error && <div className="error"><CircleAlert size={16}/>{error}</div>}
        {notice && <div className="notice"><CheckCircle2 size={16}/>{notice}</div>}
        {draft && <div className="review-form"><div className="review-title"><div><h3>Review extracted details</h3><p>AI output can be wrong. Correct it before saving.</p></div><StatusPill tone="warning">Review required</StatusPill></div>
          <div className="form-grid">
            <Field label="Merchant" value={draft.merchant} onChange={(v) => setDraft({ ...draft, merchant: v })}/>
            <Field label="Product / service" value={draft.productName} onChange={(v) => setDraft({ ...draft, productName: v })}/>
            <Field label="Purchase date" type="date" value={draft.purchaseDate || ""} onChange={(v) => setDraft({ ...draft, purchaseDate: v })}/>
            <Field label="Amount" type="number" value={draft.amount ?? ""} onChange={(v) => setDraft({ ...draft, amount: v })}/>
            <Field label="Currency" value={draft.currency || "INR"} onChange={(v) => setDraft({ ...draft, currency: v.toUpperCase().slice(0, 3) })}/>
            <Field label="Invoice / order number" value={draft.invoiceNumber || ""} onChange={(v) => setDraft({ ...draft, invoiceNumber: v })}/>
            <Field label="Document type" value={draft.documentType || "Invoice"} onChange={(v) => setDraft({ ...draft, documentType: v })}/>
            <Field label="Warranty details (if visible)" value={draft.warrantyText || ""} onChange={(v) => setDraft({ ...draft, warrantyText: v })}/>
          </div>
          <label className="field full"><span>Issue / notes (optional)</span><textarea rows="3" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Example: One side of the headphones stopped working."/></label>
          <button className="primary-btn full-btn" onClick={saveRecord}><Check size={17}/> Confirm and save record</button>
        </div>}
      </div>
    </Modal>}

    {modal === "record" && selectedRecord && <Modal title="Purchase record" onClose={() => setModal("")}>
      <div className="modal-body">
        <div className="record-detail-icon"><FileText size={24}/></div><h3>{selectedRecord.productName}</h3><p className="muted">{selectedRecord.merchant}</p>
        <div className="detail-list">{[["Purchase date", selectedRecord.purchaseDate || "Not provided"],["Amount", money(selectedRecord.amount, selectedRecord.currency || "INR")],["Invoice number", selectedRecord.invoiceNumber || "Not provided"],["Document type", selectedRecord.documentType || "Not specified"],["Warranty text", selectedRecord.warrantyText || "Not provided"]].map(([k,v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <button className="danger-btn full-btn" onClick={() => { removeRecord(selectedRecord.id); setModal(""); }}><Trash2 size={16}/> Delete record</button>
      </div>
    </Modal>}

    {modal === "opportunity" && selectedOpportunity && <Modal title="Evidence checklist" onClose={() => setModal("")}>
      <div className="modal-body">
        <StatusPill tone="warning">{selectedOpportunity.status}</StatusPill><h3 className="modal-subtitle">{selectedOpportunity.type}</h3><p className="body-copy">{selectedOpportunity.reason}</p>
        <h4>Information to verify</h4><ul className="checklist">{selectedOpportunity.missing.map((m) => <li key={m}><CircleAlert size={16}/>{m}</li>)}</ul>
        <div className="next-step"><b>Suggested next step</b><p>{selectedOpportunity.nextStep}</p></div>
        <div className="inline-actions"><button className="secondary-btn" disabled={busy} onClick={() => makeMessage(selectedOpportunity)}><Sparkles size={16}/> Draft support message</button><button className="primary-btn" onClick={() => { createCase(selectedOpportunity); setModal(""); }}>Track case</button></div>
      </div>
    </Modal>}

    {modal === "message" && <Modal title="AI support message draft" onClose={() => setModal("")} wide>
      <div className="modal-body"><div className="notice"><ShieldCheck size={16}/> Review and edit this draft. It has not been sent.</div><textarea className="message-editor" rows="12" value={message} onChange={(e) => setMessage(e.target.value)}/><button className="primary-btn full-btn" onClick={() => navigator.clipboard.writeText(message).then(() => { setNotice("Message copied. Review it before sending."); setModal(""); }).catch(() => setError("Clipboard access unavailable. Select and copy the message manually."))}><Copy size={16}/> Copy message</button></div>
    </Modal>}
  </div>;
}

function Field({ label, value, onChange, type = "text" }) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}/></label>;
}
function RecordTable({ records, onSelect, onDelete }) {
  if (!records.length) return <div className="empty-inline"><FileText size={22}/><b>No purchase records yet</b><span>Add an invoice or try the sample demo.</span></div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Purchase</th><th>Merchant</th><th>Purchase date</th><th>Amount</th><th>Type</th><th></th></tr></thead><tbody>{records.map((r) => <tr key={r.id} onClick={() => onSelect(r)}><td><div className="purchase-cell"><div className="file-mini"><FileText size={17}/></div><div><b>{r.productName}</b><small>{r.invoiceNumber || "No invoice number"}</small></div></div></td><td>{r.merchant}</td><td>{r.purchaseDate || "—"}</td><td><b>{money(r.amount, r.currency || "INR")}</b></td><td><StatusPill>{r.documentType || "Document"}</StatusPill></td><td><button className="icon-btn" aria-label="Delete record" onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>;
}
function EmptyState({ title, text, action }) {
  return <div className="empty-state"><div className="empty-art"><FileText size={28}/></div><h3>{title}</h3><p>{text}</p>{action && <button className="primary-btn" onClick={action}><Plus size={16}/> Add document</button>}</div>;
}
