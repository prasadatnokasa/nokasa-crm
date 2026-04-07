import { useState, useEffect, useRef } from "react";

/* ─── Design tokens (NoKasa palette) ─────────────────────────────────── */
const G = {
  green900: "#173404",
  green800: "#27500A",
  green700: "#3B6D11",
  green600: "#639922",
  green100: "#C0DD97",
  green50:  "#EAF3DE",
  amber600: "#BA7517",
  amber50:  "#FAEEDA",
  blue600:  "#185FA5",
  blue50:   "#E6F1FB",
  teal600:  "#0F6E56",
  teal50:   "#E1F5EE",
  red600:   "#A32D2D",
  red50:    "#FCEBEB",
  gray900:  "#2C2C2A",
  gray700:  "#5F5E5A",
  gray400:  "#888780",
  gray200:  "#B4B2A9",
  gray100:  "#D3D1C7",
  gray50:   "#F1EFE8",
  white:    "#FFFFFF",
  bg:       "#F9F8F5",
};

const css = {
  card: {
    background: G.white,
    borderRadius: 12,
    border: `0.5px solid ${G.gray100}`,
    padding: "16px 20px",
  },
};

/* ─── Constants ──────────────────────────────────────────────────────── */
const STATUSES = [
  { key: "new",           label: "New",            color: G.green700, bg: G.green50  },
  { key: "contacted",     label: "Contacted",      color: G.blue600,  bg: G.blue50   },
  { key: "followup",      label: "Follow-up",      color: G.amber600, bg: G.amber50  },
  { key: "interested",    label: "Interested",     color: G.teal600,  bg: G.teal50   },
  { key: "converted",     label: "Converted ✓",   color: G.green800, bg: G.green100 },
  { key: "notinterested", label: "Not Interested", color: G.red600,   bg: G.red50    },
];

const SOURCES = ["Instagram DM", "WhatsApp", "Website", "Referral", "Cold DM", "Other"];

const SAMPLE_LEADS = [
  { id: 1, name: "Priya Sharma",    phone: "+91 98456 32100", igHandle: "@priya.cleanshelf", message: "Hi! I saw your reel about clothes collection. I have around 20 items to give away. When can you come to Jayanagar?", source: "Instagram DM", status: "followup",      society: "Jayanagar 4th Block",      date: "2026-04-05", notes: "Has 20+ items, prefers morning slot." },
  { id: 2, name: "Rahul Mehta",     phone: "+91 99001 87654", igHandle: "@rahulmehta.blr",   message: "Interested in selling old clothes. We live in HSR Layout Sector 2.",                                               source: "Instagram DM", status: "new",           society: "HSR Layout Sector 2",       date: "2026-04-06", notes: "" },
  { id: 3, name: "Ananya Krishnan", phone: "+91 80123 45678", igHandle: "@ananyak",           message: "Booked a slot already! Just wanted to confirm Saturday works.",                                                    source: "WhatsApp",     status: "converted",     society: "Koramangala 6th Block",     date: "2026-04-04", notes: "Confirmed for Sat 10AM." },
  { id: 4, name: "Deepak Nair",     phone: "+91 77007 12345", igHandle: "",                   message: "Do you cover Indiranagar? I have a big bag of kids clothes.",                                                      source: "Instagram DM", status: "contacted",     society: "Indiranagar",               date: "2026-04-06", notes: "Replied with coverage map." },
  { id: 5, name: "Sneha Rao",       phone: "+91 81234 56789", igHandle: "@sneharao_blr",      message: "Loved your concept! My whole family wants to clean out the wardrobe. Can you handle bulk?",                       source: "Instagram DM", status: "interested",    society: "Whitefield",                date: "2026-04-07", notes: "Family collection, estimate 50+ items." },
  { id: 6, name: "Arjun Patel",     phone: "+91 96543 21098", igHandle: "@arjunp",            message: "Not really interested right now, maybe later.",                                                                   source: "Instagram DM", status: "notinterested", society: "Electronic City",           date: "2026-04-03", notes: "" },
];

let __nextId = 20;

/* ─── WA Message Parser ──────────────────────────────────────────────── */
function parseMessage(raw) {
  if (!raw.trim()) return null;
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let name = "", phone = "", igHandle = "", society = "";

  for (const line of lines) {
    if (!phone) {
      const m = line.match(/(\+?91[\s\-]?)?([6-9]\d{9})/);
      if (m) phone = "+91 " + m[2];
    }
    if (!igHandle) {
      const m = line.match(/@([A-Za-z0-9_.]{2,})/);
      if (m) igHandle = "@" + m[1];
    }
    if (!name) {
      const m = line.match(/(?:(?:hi|hello|hey)[,\s]+)?(?:i['\s]?m\s+|my name is\s+)?([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15})?)/);
      if (m && m[1].length > 2 && !["The","This","My","Hi","Hey","Hello","Its","We","I"].includes(m[1])) name = m[1];
    }
    const locMatch = line.match(/(?:in|at|from|near)\s+([A-Z][a-zA-Z\s]{3,25}(?:Layout|Nagar|Colony|Block|Road|Park|Hills|City|Stage)?)/i);
    if (!society && locMatch) society = locMatch[1].trim();
  }

  return {
    name:    name || "",
    phone:   phone || "",
    igHandle,
    society,
    message: raw.trim().slice(0, 500),
    source:  "Instagram DM",
    status:  "new",
    date:    new Date().toISOString().slice(0, 10),
    notes:   "",
  };
}

/* ─── Sub-components ─────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }) {
  const initials = name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const palette = [G.green50, G.teal50, G.blue50, G.amber50];
  const textPalette = [G.green800, G.teal600, G.blue600, G.amber600];
  const i = (name.charCodeAt(0) || 0) % palette.length;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: palette[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 500, color: textPalette[i], flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Badge({ status }) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0];
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap", display: "inline-block" }}>
      {s.label}
    </span>
  );
}

function SourceDot({ source }) {
  const colors = { "Instagram DM": "#E1306C", "WhatsApp": "#25D366", "Website": G.blue600, "Referral": G.amber600 };
  const c = colors[source] || G.gray400;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: G.gray700 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />{source}</span>;
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  const base = { width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${G.gray200}`, background: G.white, color: G.gray900, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ fontSize: 11, color: G.gray700, display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>}
      {type === "textarea"
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...base, resize: "vertical" }} />
        : type === "select-status"
          ? <select value={value} onChange={e => onChange(e.target.value)} style={base}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
          : type === "select-source"
            ? <select value={value} onChange={e => onChange(e.target.value)} style={base}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
            : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />
      }
    </div>
  );
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ ...css.card, width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: G.gray900 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: G.gray400, lineHeight: 1, padding: 2 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small = false, disabled = false }) {
  const styles = {
    primary:   { background: G.green600, color: G.white, border: `1px solid ${G.green700}` },
    secondary: { background: G.white, color: G.gray900, border: `0.5px solid ${G.gray200}` },
    danger:    { background: G.red50, color: G.red600, border: `0.5px solid ${G.red600}` },
    ghost:     { background: "transparent", color: G.gray700, border: "none" },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{ ...styles[variant], padding: small ? "5px 12px" : "8px 16px", borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit", lineHeight: 1.4 }}>
      {children}
    </button>
  );
}

/* ─── Lead Form (shared by Add + Edit) ─────────────────────────────── */
function LeadForm({ data, onChange }) {
  const f = (k) => (v) => onChange({ ...data, [k]: v });
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <Input label="Name *"            value={data.name}     onChange={f("name")}     placeholder="Priya Sharma" />
        <Input label="Phone"             value={data.phone}    onChange={f("phone")}    placeholder="+91 98456 32100" />
        <Input label="Instagram handle"  value={data.igHandle} onChange={f("igHandle")} placeholder="@handle" />
        <Input label="Society / Area"    value={data.society}  onChange={f("society")}  placeholder="Koramangala 5th Block" />
        <Input label="Source"            value={data.source}   onChange={f("source")}   type="select-source" />
        <Input label="Status"            value={data.status}   onChange={f("status")}   type="select-status" />
      </div>
      <Input label="Message / Query"  value={data.message} onChange={f("message")} type="textarea" placeholder="Paste the original message here…" />
      <Input label="Internal Notes"   value={data.notes}   onChange={f("notes")}   type="textarea" placeholder="Your follow-up notes…" />
    </>
  );
}

/* ─── Parse Modal ────────────────────────────────────────────────────── */
function ParseModal({ onSave, onClose }) {
  const [tab, setTab] = useState("paste");
  const [raw, setRaw] = useState("");
  const [form, setForm] = useState(null);
  const [manualForm, setManualForm] = useState({ name: "", phone: "", igHandle: "", society: "", message: "", source: "Instagram DM", status: "new", date: new Date().toISOString().slice(0, 10), notes: "" });

  const handleParse = () => setForm(parseMessage(raw));
  const tabStyle = (t) => ({ padding: "7px 16px", fontSize: 13, fontWeight: 500, borderRadius: 20, cursor: "pointer", border: "none", background: tab === t ? G.green600 : "transparent", color: tab === t ? G.white : G.gray700 });

  return (
    <Modal title="Add Lead" onClose={onClose} width={560}>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button style={tabStyle("paste")} onClick={() => setTab("paste")}>Paste from WA / Instagram</button>
        <button style={tabStyle("manual")} onClick={() => setTab("manual")}>Add manually</button>
      </div>

      {tab === "paste" && (
        <>
          <label style={{ fontSize: 11, color: G.gray700, fontWeight: 500, display: "block", marginBottom: 4 }}>Paste the raw message</label>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} placeholder={"Paste the WhatsApp or Instagram DM message here.\n\nExample:\nHi! My name is Priya Sharma. I live in Jayanagar 4th Block.\nPhone: 98456 32100\nI have around 15–20 clothes to give away."} rows={7}
            style={{ width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: `0.5px solid ${G.gray200}`, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: form ? 20 : 0 }}>
            <Btn onClick={handleParse} disabled={!raw.trim()}>Extract Details →</Btn>
            <Btn variant="secondary" onClick={() => setRaw("")}>Clear</Btn>
          </div>

          {form && (
            <>
              <div style={{ borderTop: `0.5px solid ${G.gray100}`, margin: "16px 0" }} />
              <p style={{ fontSize: 12, color: G.green700, fontWeight: 500, marginBottom: 12 }}>✓ Extracted — review and save</p>
              <LeadForm data={form} onChange={setForm} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
                <Btn onClick={() => { onSave(form); onClose(); }} disabled={!form.name.trim()}>Save Lead</Btn>
              </div>
            </>
          )}
        </>
      )}

      {tab === "manual" && (
        <>
          <LeadForm data={manualForm} onChange={setManualForm} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={() => { onSave(manualForm); onClose(); }} disabled={!manualForm.name.trim()}>Save Lead</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ─── Detail Drawer ──────────────────────────────────────────────────── */
function DetailDrawer({ lead, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...lead });

  useEffect(() => { setForm({ ...lead }); setEditing(false); }, [lead]);

  const save = () => { onUpdate(form); setEditing(false); };

  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, maxWidth: "100vw", background: G.white, borderLeft: `0.5px solid ${G.gray100}`, zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${G.gray100}`, display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={lead.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: G.gray900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</div>
          <div style={{ fontSize: 12, color: G.gray400 }}>{lead.date}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: G.gray400, flexShrink: 0 }}>✕</button>
      </div>

      <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
        {!editing ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Badge status={lead.status} />
              <SourceDot source={lead.source} />
            </div>
            <Row label="Phone"     value={lead.phone    || "—"} link={lead.phone ? `tel:${lead.phone}` : null} />
            <Row label="Instagram" value={lead.igHandle || "—"} link={lead.igHandle ? `https://instagram.com/${lead.igHandle.replace("@","")}` : null} />
            <Row label="Society"   value={lead.society  || "—"} />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: G.gray700, fontWeight: 500, marginBottom: 6 }}>Original message</div>
              <div style={{ fontSize: 13, color: G.gray900, background: G.gray50, borderRadius: 8, padding: "10px 12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lead.message || "—"}</div>
            </div>
            {lead.notes && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: G.gray700, fontWeight: 500, marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: 13, color: G.gray900, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lead.notes}</div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: G.gray700, fontWeight: 500, marginBottom: 8 }}>Update status</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STATUSES.map(s => (
                  <button key={s.key} onClick={() => onUpdate({ ...lead, status: s.key })}
                    style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, border: `1px solid ${lead.status === s.key ? s.color : G.gray100}`, background: lead.status === s.key ? s.bg : "transparent", color: lead.status === s.key ? s.color : G.gray700, cursor: "pointer", fontWeight: lead.status === s.key ? 500 : 400 }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <LeadForm data={form} onChange={setForm} />
        )}
      </div>

      <div style={{ padding: "12px 20px", borderTop: `0.5px solid ${G.gray100}`, display: "flex", gap: 8 }}>
        {editing
          ? <><Btn onClick={save}>Save</Btn><Btn variant="secondary" onClick={() => { setForm({ ...lead }); setEditing(false); }}>Cancel</Btn></>
          : <><Btn onClick={() => setEditing(true)}>Edit</Btn><Btn variant="danger" onClick={() => { onDelete(lead.id); onClose(); }}>Delete</Btn></>
        }
      </div>
    </div>
  );
}

function Row({ label, value, link }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `0.5px solid ${G.gray50}`, fontSize: 13 }}>
      <span style={{ color: G.gray400 }}>{label}</span>
      {link ? <a href={link} target="_blank" rel="noreferrer" style={{ color: G.green700, textDecoration: "none", fontWeight: 500 }}>{value}</a>
              : <span style={{ color: G.gray900, fontWeight: 500 }}>{value}</span>}
    </div>
  );
}

/* ─── Stats Bar ──────────────────────────────────────────────────────── */
function StatsBar({ leads }) {
  const converted = leads.filter(l => l.status === "converted").length;
  const instagramLeads = leads.filter(l => l.source === "Instagram DM").length;
  const active = leads.filter(l => !["converted","notinterested"].includes(l.status)).length;

  const stats = [
    { label: "Total leads",       value: leads.length },
    { label: "Active pipeline",   value: active },
    { label: "Instagram leads",   value: instagramLeads },
    { label: "Converted",         value: converted },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: G.white, borderRadius: 10, border: `0.5px solid ${G.gray100}`, padding: "14px 16px" }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: G.green700 }}>{s.value}</div>
          <div style={{ fontSize: 12, color: G.gray400, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const [leads, setLeads] = useState(SAMPLE_LEADS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [sortBy, setSortBy] = useState("date");

  const handleAdd = (data) => {
    setLeads(prev => [{ ...data, id: __nextId++ }, ...prev]);
  };
  const handleUpdate = (updated) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setDetailLead(d => d?.id === updated.id ? updated : d);
  };
  const handleDelete = (id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    setDetailLead(null);
  };

  const filtered = leads
    .filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.phone.includes(q) && !l.igHandle.toLowerCase().includes(q) && !l.society.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => sortBy === "date" ? (b.date > a.date ? 1 : -1) : a.name.localeCompare(b.name));

  const filterBtnStyle = (active) => ({
    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: `0.5px solid ${active ? G.green600 : G.gray200}`,
    background: active ? G.green50 : "transparent", color: active ? G.green700 : G.gray700, cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: G.bg }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: G.white, borderRight: `0.5px solid ${G.gray100}`, display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 20px 20px", borderBottom: `0.5px solid ${G.gray50}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: G.green600, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 5V11L8 14L3 11V5Z" fill="white" opacity="0.9"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14, color: G.gray900 }}>NoKasa CRM</div>
              <div style={{ fontSize: 10, color: G.gray400 }}>Lead Manager</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: "16px 12px", flex: 1 }}>
          <SideItem icon="◈" label="All Leads" count={leads.length} active />
          {STATUSES.map(s => (
            <SideItem key={s.key} icon="·" label={s.label} count={leads.filter(l => l.status === s.key).length}
              onClick={() => setStatusFilter(prev => prev === s.key ? "all" : s.key)}
              active={statusFilter === s.key} color={s.color} />
          ))}
        </nav>

        <div style={{ padding: "12px 16px", borderTop: `0.5px solid ${G.gray50}`, fontSize: 11, color: G.gray400 }}>
          <a href="/logout" style={{ color: G.gray400, textDecoration: "none" }}>← Sign out</a>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ background: G.white, borderBottom: `0.5px solid ${G.gray100}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
            style={{ flex: 1, maxWidth: 320, fontSize: 13, padding: "7px 12px", borderRadius: 8, border: `0.5px solid ${G.gray200}`, outline: "none", background: G.bg, fontFamily: "inherit" }} />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, border: `0.5px solid ${G.gray200}`, background: G.white, color: G.gray700, cursor: "pointer", fontFamily: "inherit" }}>
            <option value="all">All sources</option>
            {SOURCES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, border: `0.5px solid ${G.gray200}`, background: G.white, color: G.gray700, cursor: "pointer", fontFamily: "inherit" }}>
            <option value="date">Sort: Newest</option>
            <option value="name">Sort: Name</option>
          </select>
          <Btn onClick={() => setShowAdd(true)}>+ Add Lead</Btn>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
          <StatsBar leads={leads} />

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            <button style={filterBtnStyle(statusFilter === "all")} onClick={() => setStatusFilter("all")}>All ({leads.length})</button>
            {STATUSES.map(s => (
              <button key={s.key} style={filterBtnStyle(statusFilter === s.key)} onClick={() => setStatusFilter(prev => prev === s.key ? "all" : s.key)}>
                {s.label} ({leads.filter(l => l.status === s.key).length})
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: G.white, borderRadius: 12, border: `0.5px solid ${G.gray100}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${G.gray100}` }}>
                  {["Lead", "Contact", "Society / Area", "Source", "Status", "Date", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, color: G.gray400, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: G.gray400, fontSize: 13 }}>No leads match your filters.</td></tr>
                )}
                {filtered.map(lead => (
                  <tr key={lead.id} onClick={() => setDetailLead(lead)}
                    style={{ borderBottom: `0.5px solid ${G.gray50}`, cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = G.bg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={lead.name} size={30} />
                        <div>
                          <div style={{ fontWeight: 500, color: G.gray900, whiteSpace: "nowrap" }}>{lead.name}</div>
                          {lead.igHandle && <div style={{ fontSize: 11, color: "#E1306C" }}>{lead.igHandle}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: G.gray700, whiteSpace: "nowrap" }}>{lead.phone || "—"}</td>
                    <td style={{ padding: "10px 14px", color: G.gray700, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.society || "—"}</td>
                    <td style={{ padding: "10px 14px" }}><SourceDot source={lead.source} /></td>
                    <td style={{ padding: "10px 14px" }}><Badge status={lead.status} /></td>
                    <td style={{ padding: "10px 14px", color: G.gray400, fontSize: 12, whiteSpace: "nowrap" }}>{lead.date}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <select value={lead.status}
                        onChange={e => { e.stopPropagation(); handleUpdate({ ...lead, status: e.target.value }); }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `0.5px solid ${G.gray200}`, background: G.white, color: G.gray700, cursor: "pointer", fontFamily: "inherit" }}>
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: G.gray400 }}>
            Showing {filtered.length} of {leads.length} leads
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && <ParseModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {detailLead && (
        <DetailDrawer lead={detailLead} onClose={() => setDetailLead(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}
    </div>
  );
}

function SideItem({ icon, label, count, active, onClick, color }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 7, cursor: onClick ? "pointer" : "default", background: active && onClick ? G.green50 : "transparent", marginBottom: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: active && onClick ? G.green700 : G.gray700, fontWeight: active && onClick ? 500 : 400 }}>
        <span style={{ fontSize: 10, color: color || G.gray400 }}>{icon}</span>
        {label}
      </div>
      <span style={{ fontSize: 11, color: G.gray400, background: G.gray50, padding: "1px 6px", borderRadius: 10 }}>{count}</span>
    </div>
  );
}
