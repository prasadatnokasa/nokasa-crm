import { useState, useEffect, useCallback } from "react";

/* ─── Design tokens ──────────────────────────────────────────────────── */
const G = {
  green900:"#173404",green800:"#27500A",green700:"#3B6D11",green600:"#639922",
  green100:"#C0DD97",green50:"#EAF3DE",amber600:"#BA7517",amber50:"#FAEEDA",
  blue600:"#185FA5",blue50:"#E6F1FB",teal600:"#0F6E56",teal50:"#E1F5EE",
  red600:"#A32D2D",red50:"#FCEBEB",gray900:"#2C2C2A",gray700:"#5F5E5A",
  gray400:"#888780",gray200:"#B4B2A9",gray100:"#D3D1C7",gray50:"#F1EFE8",
  white:"#FFFFFF",bg:"#F9F8F5",
};

const STATUSES = [
  { key:"new",           label:"New",            color:G.green700, bg:G.green50  },
  { key:"contacted",     label:"Contacted",      color:G.blue600,  bg:G.blue50   },
  { key:"followup",      label:"Follow-up",      color:G.amber600, bg:G.amber50  },
  { key:"interested",    label:"Interested",     color:G.teal600,  bg:G.teal50   },
  { key:"converted",     label:"Converted ✓",   color:G.green800, bg:G.green100 },
  { key:"notinterested", label:"Not Interested", color:G.red600,   bg:G.red50    },
];

const SOURCES = ["Instagram DM","WhatsApp","Website","Referral","Cold DM","Other"];

/* ─── API layer ──────────────────────────────────────────────────────── */
const api = {
  async getLeads(params = {}) {
    const qs = new URLSearchParams();
    if (params.status && params.status !== "all") qs.set("status", params.status);
    if (params.source && params.source !== "all") qs.set("source", params.source);
    if (params.q) qs.set("q", params.q);
    const res = await fetch(`/api/leads?${qs}`);
    if (!res.ok) throw new Error("Failed to load leads");
    return res.json();
  },
  async createLead(data) {
    const res = await fetch("/api/leads", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to create lead");
    return res.json();
  },
  async updateLead(id, data) {
    const res = await fetch(`/api/leads/${id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to update lead");
    return res.json();
  },
  async deleteLead(id) {
    const res = await fetch(`/api/leads/${id}`, { method:"DELETE" });
    if (!res.ok) throw new Error("Failed to delete lead");
    return res.json();
  },
};

/* ─── WA / Instagram message parser ─────────────────────────────────── */
function parseMessage(raw) {
  if (!raw.trim()) return null;
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let name = "", phone = "", igHandle = "", society = "";
  for (const line of lines) {
    if (!phone) { const m = line.match(/(\+?91[\s-]?)?([6-9]\d{9})/); if (m) phone = "+91 " + m[2]; }
    if (!igHandle) { const m = line.match(/@([A-Za-z0-9_.]{2,})/); if (m) igHandle = "@" + m[1]; }
    if (!name) { const m = line.match(/(?:(?:hi|hello)[,\s]+)?(?:i['\s]?m\s+|my name is\s+)?([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15})?)/); if (m && !["The","This","My","Hi","Hello","We"].includes(m[1])) name = m[1]; }
    const lm = line.match(/(?:in|at|from|near)\s+([A-Z][a-zA-Z\s]{3,25}(?:Layout|Nagar|Colony|Block|Road|Park|City)?)/i);
    if (!society && lm) society = lm[1].trim();
  }
  return { name: name || "", phone: phone || "", igHandle, society, message: raw.trim().slice(0, 500), source:"Instagram DM", status:"new", date:new Date().toISOString().slice(0,10), notes:"" };
}

/* ─── Small UI components ────────────────────────────────────────────── */
function Avatar({ name, size = 34 }) {
  const ini = name.split(" ").filter(Boolean).map(w => w[0]).slice(0,2).join("").toUpperCase() || "?";
  const pb = [G.green50,G.teal50,G.blue50,G.amber50];
  const pt = [G.green800,G.teal600,G.blue600,G.amber600];
  const i  = (name.charCodeAt(0)||0) % 4;
  return <div style={{width:size,height:size,borderRadius:"50%",background:pb[i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:500,color:pt[i],flexShrink:0}}>{ini}</div>;
}

function Badge({ status }) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0];
  return <span style={{fontSize:11,fontWeight:500,padding:"3px 9px",borderRadius:20,background:s.bg,color:s.color,whiteSpace:"nowrap"}}>{s.label}</span>;
}

function SrcDot({ source }) {
  const c = {"Instagram DM":"#E1306C","WhatsApp":"#25D366","Website":G.blue600,"Referral":G.amber600}[source] || G.gray400;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:G.gray700}}><span style={{width:7,height:7,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>{source}</span>;
}

function Inp({ label, value, onChange, type="text", placeholder="", rows=3 }) {
  const base = {width:"100%",fontSize:13,padding:"8px 10px",borderRadius:8,border:`0.5px solid ${G.gray200}`,background:G.white,color:G.gray900,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  return (
    <div style={{marginBottom:12}}>
      {label && <label style={{fontSize:11,color:G.gray700,display:"block",marginBottom:4,fontWeight:500}}>{label}</label>}
      {type==="textarea" ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base,resize:"vertical"}}/>
       : type==="sel-status" ? <select value={value} onChange={e=>onChange(e.target.value)} style={base}>{STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select>
       : type==="sel-source" ? <select value={value} onChange={e=>onChange(e.target.value)} style={base}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select>
       : <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
    </div>
  );
}

function LeadForm({ data, onChange }) {
  const f = k => v => onChange({...data,[k]:v});
  return (
    <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
        <Inp label="Name *"           value={data.name}     onChange={f("name")}     placeholder="Priya Sharma"/>
        <Inp label="Phone"            value={data.phone}    onChange={f("phone")}    placeholder="+91 98456 32100"/>
        <Inp label="Instagram handle" value={data.igHandle} onChange={f("igHandle")} placeholder="@handle"/>
        <Inp label="Society / Area"   value={data.society}  onChange={f("society")}  placeholder="Koramangala 5th Block"/>
        <Inp label="Source"           value={data.source}   onChange={f("source")}   type="sel-source"/>
        <Inp label="Status"           value={data.status}   onChange={f("status")}   type="sel-status"/>
      </div>
      <Inp label="Message / Query" value={data.message} onChange={f("message")} type="textarea" placeholder="Original message…" rows={3}/>
      <Inp label="Internal Notes"  value={data.notes}   onChange={f("notes")}   type="textarea" placeholder="Your follow-up notes…" rows={2}/>
    </>
  );
}

function Btn({ children, onClick, variant="primary", disabled=false, small=false }) {
  const vs = {
    primary:   {background:G.green600,color:G.white,border:`1px solid ${G.green700}`},
    secondary: {background:G.white,color:G.gray900,border:`0.5px solid ${G.gray200}`},
    danger:    {background:G.red50,color:G.red600,border:`0.5px solid ${G.red600}`},
  };
  return <button disabled={disabled} onClick={onClick} style={{...vs[variant],padding:small?"5px 12px":"8px 16px",borderRadius:8,fontSize:small?12:13,fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,fontFamily:"inherit"}}>{children}</button>;
}

function Spinner() {
  return <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${G.green100}`,borderTopColor:G.green600,animation:"spin 0.7s linear infinite",display:"inline-block"}}/>;
}

/* ─── Add Lead Modal ─────────────────────────────────────────────────── */
function AddModal({ onSave, onClose }) {
  const [tab, setTab]       = useState("paste");
  const [raw, setRaw]       = useState("");
  const [form, setForm]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState({name:"",phone:"",igHandle:"",society:"",message:"",source:"Instagram DM",status:"new",date:new Date().toISOString().slice(0,10),notes:""});

  const tabSt = t => ({padding:"6px 16px",fontSize:13,fontWeight:500,borderRadius:20,cursor:"pointer",border:"none",background:tab===t?G.green600:"transparent",color:tab===t?G.white:G.gray700});

  const save = async (data) => {
    setSaving(true);
    try { await onSave(data); onClose(); } finally { setSaving(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16}}>
      <div style={{background:G.white,borderRadius:14,border:`0.5px solid ${G.gray100}`,padding:"22px 24px",width:540,maxWidth:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:500,fontSize:15,color:G.gray900}}>Add Lead</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:G.gray400}}>✕</button>
        </div>
        <div style={{display:"flex",gap:5,marginBottom:18}}>
          <button style={tabSt("paste")} onClick={()=>setTab("paste")}>Paste from WA / Instagram</button>
          <button style={tabSt("manual")} onClick={()=>setTab("manual")}>Add manually</button>
        </div>

        {tab==="paste" && <>
          <label style={{fontSize:11,color:G.gray700,fontWeight:500,display:"block",marginBottom:4}}>Paste the raw message</label>
          <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={"Paste the WhatsApp or Instagram DM message here.\n\nExample:\nHi! My name is Priya Sharma. I live in Jayanagar 4th Block.\nPhone: 98456 32100\nI have around 15–20 clothes to give away."} rows={7}
            style={{width:"100%",fontSize:13,padding:"8px 10px",borderRadius:8,border:`0.5px solid ${G.gray200}`,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",marginBottom:12}}/>
          <div style={{display:"flex",gap:8,marginBottom:form?18:0}}>
            <Btn onClick={()=>setForm(parseMessage(raw))} disabled={!raw.trim()}>Extract Details →</Btn>
            <Btn variant="secondary" onClick={()=>{setRaw("");setForm(null);}}>Clear</Btn>
          </div>
          {form && <>
            <div style={{borderTop:`0.5px solid ${G.gray100}`,margin:"16px 0 14px"}}/>
            <p style={{fontSize:12,color:G.green700,fontWeight:500,marginBottom:12}}>✓ Extracted — review and save</p>
            <LeadForm data={form} onChange={setForm}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
              <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
              <Btn onClick={()=>save(form)} disabled={!form.name.trim()||saving}>{saving?<Spinner/>:"Save Lead"}</Btn>
            </div>
          </>}
        </>}

        {tab==="manual" && <>
          <LeadForm data={manual} onChange={setManual}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={()=>save(manual)} disabled={!manual.name.trim()||saving}>{saving?<Spinner/>:"Save Lead"}</Btn>
          </div>
        </>}
      </div>
    </div>
  );
}

/* ─── Detail Drawer ──────────────────────────────────────────────────── */
function DetailDrawer({ lead, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({...lead});
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(()=>{ setForm({...lead}); setEditing(false); }, [lead.id]);

  const save = async () => {
    setSaving(true);
    try { await onUpdate(form); setEditing(false); } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete lead for ${lead.name}?`)) return;
    setDeleting(true);
    try { await onDelete(lead.id); onClose(); } finally { setDeleting(false); }
  };

  return (
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:440,maxWidth:"100vw",background:G.white,borderLeft:`0.5px solid ${G.gray100}`,zIndex:50,display:"flex",flexDirection:"column",boxShadow:"-4px 0 28px rgba(0,0,0,0.09)"}}>
      <div style={{padding:"16px 20px",borderBottom:`0.5px solid ${G.gray100}`,display:"flex",alignItems:"center",gap:12}}>
        <Avatar name={lead.name} size={42}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:500,fontSize:15,color:G.gray900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.name}</div>
          <div style={{fontSize:12,color:G.gray400}}>Added {lead.date}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:G.gray400,flexShrink:0}}>✕</button>
      </div>

      <div style={{padding:"16px 20px",flex:1,overflowY:"auto"}}>
        {!editing ? <>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <Badge status={lead.status}/><SrcDot source={lead.source}/>
          </div>
          {[["Phone",lead.phone,lead.phone?`tel:${lead.phone}`:null],["Instagram",lead.igHandle,lead.igHandle?`https://instagram.com/${lead.igHandle.replace("@","")}`:null],["Society",lead.society,null]].map(([l,v,href])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`0.5px solid ${G.gray50}`,fontSize:13}}>
              <span style={{color:G.gray400}}>{l}</span>
              {href ? <a href={href} target="_blank" rel="noreferrer" style={{color:G.green700,textDecoration:"none",fontWeight:500}}>{v||"—"}</a>
                    : <span style={{color:G.gray900,fontWeight:500}}>{v||"—"}</span>}
            </div>
          ))}
          {lead.message && <div style={{marginTop:16}}>
            <div style={{fontSize:11,color:G.gray700,fontWeight:500,marginBottom:6}}>Original message</div>
            <div style={{fontSize:13,color:G.gray900,background:G.gray50,borderRadius:8,padding:"10px 12px",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{lead.message}</div>
          </div>}
          {lead.notes && <div style={{marginTop:14}}>
            <div style={{fontSize:11,color:G.gray700,fontWeight:500,marginBottom:6}}>Notes</div>
            <div style={{fontSize:13,color:G.gray900,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{lead.notes}</div>
          </div>}
          <div style={{marginTop:20}}>
            <div style={{fontSize:11,color:G.gray700,fontWeight:500,marginBottom:8}}>Update status</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {STATUSES.map(s=>(
                <button key={s.key} onClick={()=>onUpdate({...lead,status:s.key})}
                  style={{fontSize:12,padding:"4px 11px",borderRadius:20,border:`1px solid ${lead.status===s.key?s.color:G.gray100}`,background:lead.status===s.key?s.bg:"transparent",color:lead.status===s.key?s.color:G.gray700,cursor:"pointer",fontWeight:lead.status===s.key?500:400}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </> : <LeadForm data={form} onChange={setForm}/>}
      </div>

      <div style={{padding:"12px 20px",borderTop:`0.5px solid ${G.gray100}`,display:"flex",gap:8}}>
        {editing
          ? <><Btn onClick={save} disabled={saving}>{saving?<Spinner/>:"Save"}</Btn><Btn variant="secondary" onClick={()=>{setForm({...lead});setEditing(false);}}>Cancel</Btn></>
          : <><Btn onClick={()=>setEditing(true)}>Edit</Btn><Btn variant="danger" onClick={del} disabled={deleting}>{deleting?<Spinner/>:"Delete"}</Btn></>}
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [statusFilter, setStFilt]   = useState("all");
  const [sourceFilter, setSrcFilt]  = useState("all");
  const [search, setSearch]         = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortBy, setSortBy]         = useState("date");
  const [showAdd, setShowAdd]       = useState(false);
  const [detail, setDetail]         = useState(null);
  const [sideCol, setSideCol]       = useState(false);

  // Debounce search
  useEffect(()=>{
    const t = setTimeout(()=>setDebouncedQ(search), 350);
    return ()=>clearTimeout(t);
  }, [search]);

  // Fetch leads whenever filters change
  const loadLeads = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.getLeads({ status: statusFilter, source: sourceFilter, q: debouncedQ });
      const sorted = sortBy === "name" ? [...data].sort((a,b)=>a.name.localeCompare(b.name)) : data;
      setLeads(sorted);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [statusFilter, sourceFilter, debouncedQ, sortBy]);

  useEffect(()=>{ loadLeads(); }, [loadLeads]);

  const handleAdd = async (data) => {
    const created = await api.createLead(data);
    setLeads(prev => [created, ...prev]);
  };

  const handleUpdate = async (updated) => {
    const saved = await api.updateLead(updated.id, updated);
    setLeads(prev => prev.map(l => l.id===saved.id ? saved : l));
    setDetail(d => d?.id===saved.id ? saved : d);
  };

  const handleDelete = async (id) => {
    await api.deleteLead(id);
    setLeads(prev => prev.filter(l => l.id!==id));
    setDetail(null);
  };

  const converted = leads.filter(l=>l.status==="converted").length;
  const active     = leads.filter(l=>!["converted","notinterested"].includes(l.status)).length;
  const igCount    = leads.filter(l=>l.source==="Instagram DM").length;

  const pillSt = a => ({padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:500,border:`0.5px solid ${a?G.green600:G.gray200}`,background:a?G.green50:"transparent",color:a?G.green700:G.gray700,cursor:"pointer"});

  return (
    <div style={{display:"flex",height:"100vh",background:G.bg,fontFamily:"-apple-system,'Segoe UI',sans-serif",overflow:"hidden"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      {!sideCol && (
        <div style={{width:220,flexShrink:0,background:G.white,borderRight:`0.5px solid ${G.gray100}`,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 18px 14px",borderBottom:`0.5px solid ${G.gray50}`}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:8,background:G.green600,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 5V11L8 14L3 11V5Z" fill="white" opacity="0.9"/></svg>
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:14,color:G.gray900}}>NoKasa CRM</div>
                <div style={{fontSize:10,color:G.gray400}}>Lead Manager</div>
              </div>
            </div>
          </div>

          <nav style={{padding:"12px 8px",flex:1,overflowY:"auto"}}>
            <div style={{fontSize:9,fontWeight:500,color:G.gray400,padding:"3px 9px 6px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Pipeline</div>
            {[{key:"all",label:"All Leads"},...STATUSES].map(s=>{
              const count = s.key==="all" ? leads.length : leads.filter(l=>l.status===s.key).length;
              const isActive = statusFilter===s.key;
              return (
                <div key={s.key} onClick={()=>setStFilt(s.key)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 9px",borderRadius:7,cursor:"pointer",background:isActive?G.green50:"transparent",marginBottom:1}}>
                  <span style={{fontSize:12,color:isActive?G.green700:G.gray700,fontWeight:isActive?500:400}}>{s.label||"All Leads"}</span>
                  <span style={{fontSize:10,color:G.gray400,background:G.gray50,padding:"1px 5px",borderRadius:8}}>{count}</span>
                </div>
              );
            })}
          </nav>

          <div style={{padding:"12px 14px",borderTop:`0.5px solid ${G.gray50}`,display:"flex",flexDirection:"column",gap:6}}>
            <button onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"9px",background:G.green600,color:G.white,border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>+ Add Lead</button>
            <a href="/logout" style={{textAlign:"center",fontSize:11,color:G.gray400,textDecoration:"none"}}>← Sign out</a>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        {/* Top bar */}
        <div style={{background:G.white,borderBottom:`0.5px solid ${G.gray100}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setSideCol(p=>!p)} style={{background:"none",border:`0.5px solid ${G.gray200}`,borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12,color:G.gray700,flexShrink:0}}>{sideCol?"☰":"←"}</button>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, Instagram, area…"
            style={{flex:1,maxWidth:340,fontSize:13,padding:"7px 12px",borderRadius:8,border:`0.5px solid ${G.gray200}`,outline:"none",background:G.bg,fontFamily:"inherit"}}/>
          <select value={sourceFilter} onChange={e=>setSrcFilt(e.target.value)} style={{fontSize:12,padding:"7px 10px",borderRadius:7,border:`0.5px solid ${G.gray200}`,background:G.white,color:G.gray700,fontFamily:"inherit"}}>
            <option value="all">All sources</option>
            {SOURCES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{fontSize:12,padding:"7px 10px",borderRadius:7,border:`0.5px solid ${G.gray200}`,background:G.white,color:G.gray700,fontFamily:"inherit"}}>
            <option value="date">Newest first</option>
            <option value="name">Name A–Z</option>
          </select>
          {sideCol && <button onClick={()=>setShowAdd(true)} style={{padding:"7px 14px",background:G.green600,color:G.white,border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Add Lead</button>}
        </div>

        {/* Body */}
        <div style={{padding:"20px 24px",flex:1,overflowY:"auto"}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
            {[["Total leads",leads.length],["Active pipeline",active],["Instagram leads",igCount],["Converted",converted]].map(([l,v])=>(
              <div key={l} style={{background:G.white,borderRadius:10,border:`0.5px solid ${G.gray100}`,padding:"14px 16px"}}>
                <div style={{fontSize:24,fontWeight:500,color:G.green700}}>{loading?"…":v}</div>
                <div style={{fontSize:11,color:G.gray400,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Status pills */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            <button style={pillSt(statusFilter==="all")} onClick={()=>setStFilt("all")}>All ({leads.length})</button>
            {STATUSES.map(s=><button key={s.key} style={pillSt(statusFilter===s.key)} onClick={()=>setStFilt(p=>p===s.key?"all":s.key)}>{s.label} ({leads.filter(l=>l.status===s.key).length})</button>)}
          </div>

          {/* Error state */}
          {error && <div style={{background:G.red50,color:G.red600,borderRadius:8,padding:"12px 16px",marginBottom:14,fontSize:13}}>{error} — <button onClick={loadLeads} style={{background:"none",border:"none",color:G.red600,cursor:"pointer",textDecoration:"underline",fontSize:13,fontFamily:"inherit"}}>retry</button></div>}

          {/* Table */}
          <div style={{background:G.white,borderRadius:12,border:`0.5px solid ${G.gray100}`,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:`0.5px solid ${G.gray100}`}}>
                  {["Lead","Contact","Society / Area","Source","Status","Date",""].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:500,color:G.gray400,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{padding:"40px",textAlign:"center"}}><Spinner/></td></tr>}
                {!loading && leads.length===0 && <tr><td colSpan={7} style={{padding:"40px",textAlign:"center",color:G.gray400,fontSize:13}}>No leads found. Add one to get started.</td></tr>}
                {!loading && leads.map(lead=>(
                  <tr key={lead.id} onClick={()=>setDetail(d=>d?.id===lead.id?null:lead)}
                    style={{borderBottom:`0.5px solid ${G.gray50}`,cursor:"pointer",transition:"background 0.1s",background:detail?.id===lead.id?G.green50:"transparent"}}
                    onMouseEnter={e=>{if(detail?.id!==lead.id)e.currentTarget.style.background=G.bg;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=detail?.id===lead.id?G.green50:"transparent";}}>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <Avatar name={lead.name} size={30}/>
                        <div>
                          <div style={{fontWeight:500,color:G.gray900,whiteSpace:"nowrap"}}>{lead.name}</div>
                          {lead.igHandle && <div style={{fontSize:11,color:"#E1306C"}}>{lead.igHandle}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"10px 14px",color:G.gray700,whiteSpace:"nowrap"}}>{lead.phone||"—"}</td>
                    <td style={{padding:"10px 14px",color:G.gray700,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.society||"—"}</td>
                    <td style={{padding:"10px 14px"}}><SrcDot source={lead.source}/></td>
                    <td style={{padding:"10px 14px"}}><Badge status={lead.status}/></td>
                    <td style={{padding:"10px 14px",color:G.gray400,fontSize:12,whiteSpace:"nowrap"}}>{lead.date}</td>
                    <td style={{padding:"10px 14px"}}>
                      <select value={lead.status}
                        onChange={e=>{e.stopPropagation();handleUpdate({...lead,status:e.target.value});}}
                        onClick={e=>e.stopPropagation()}
                        style={{fontSize:11,padding:"4px 6px",borderRadius:6,border:`0.5px solid ${G.gray200}`,background:G.white,color:G.gray700,fontFamily:"inherit"}}>
                        {STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:10,fontSize:12,color:G.gray400}}>{loading?"Loading…":`${leads.length} leads · click any row to view details`}</div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && <AddModal onSave={handleAdd} onClose={()=>setShowAdd(false)}/>}
      {detail && <DetailDrawer lead={detail} onClose={()=>setDetail(null)} onUpdate={handleUpdate} onDelete={handleDelete}/>}
    </div>
  );
}
