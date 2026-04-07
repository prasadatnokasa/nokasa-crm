/**
 * NoKasa CRM – Cloudflare Worker
 *
 * Handles:
 *  - Password auth (session cookie)
 *  - REST API backed by D1 (SQLite):
 *      GET    /api/leads     → list all (supports ?status=&source=&q=)
 *      POST   /api/leads     → create lead
 *      PATCH  /api/leads/:id → update fields
 *      DELETE /api/leads/:id → delete lead
 *  - Static asset serving (Vite build via ASSETS binding)
 *
 * Secrets:  wrangler secret put CRM_PASSWORD
 * D1 binding: DB  (configured in wrangler.jsonc)
 */

const COOKIE_NAME    = "crm_session";
const COOKIE_MAX_AGE = 60 * 60 * 8;

async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function makeToken(password) {
  return sha256hex(password + "|nokasa-crm-salt");
}
function getCookie(req, name) {
  const header = req.headers.get("Cookie") || "";
  const match  = header.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
  return match ? match.slice(name.length + 1) : null;
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function apiErr(msg, status = 400) {
  return json({ error: msg }, status);
}
async function isAuthenticated(req, password) {
  return getCookie(req, COOKIE_NAME) === await makeToken(password);
}

function loginPage(error = "") {
  return new Response(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>NoKasa CRM · Sign in</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',sans-serif;background:#F9F8F5;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#fff;border-radius:16px;border:0.5px solid #D3D1C7;padding:36px 32px;width:100%;max-width:380px;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}
.logo-icon{width:36px;height:36px;border-radius:10px;background:#639922;display:flex;align-items:center;justify-content:center}
.logo-text{font-weight:500;font-size:17px;color:#2C2C2A}.logo-sub{font-size:11px;color:#888780}
label{font-size:11px;font-weight:500;color:#5F5E5A;display:block;margin-bottom:5px}
input[type=password]{width:100%;padding:10px 12px;border-radius:8px;border:0.5px solid #B4B2A9;font-size:14px;outline:none;font-family:inherit;color:#2C2C2A}
input[type=password]:focus{border-color:#639922;box-shadow:0 0 0 3px #EAF3DE}
button{width:100%;padding:11px;background:#639922;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;margin-top:16px;font-family:inherit}
button:hover{background:#3B6D11}
.error{background:#FCEBEB;color:#A32D2D;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.footer{font-size:11px;color:#B4B2A9;text-align:center;margin-top:20px}
</style></head><body>
<div class="card">
  <div class="logo">
    <div class="logo-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 5V11L8 14L3 11V5Z" fill="white" opacity="0.9"/></svg></div>
    <div><div class="logo-text">NoKasa CRM</div><div class="logo-sub">Internal tool</div></div>
  </div>
  ${error ? `<div class="error">${error}</div>` : ""}
  <form method="POST" action="/auth">
    <label for="p">Password</label>
    <input type="password" id="p" name="password" placeholder="Enter your password" autofocus required/>
    <button type="submit">Sign in →</button>
  </form>
  <div class="footer">NoKasa © 2026</div>
</div>
</body></html>`, {
    status: error ? 401 : 200,
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}

function rowToLead(row) {
  return {
    id:        row.id,
    name:      row.name       || "",
    phone:     row.phone      || "",
    igHandle:  row.ig_handle  || "",
    society:   row.society    || "",
    source:    row.source     || "Instagram DM",
    status:    row.status     || "new",
    message:   row.message    || "",
    notes:     row.notes      || "",
    date:      row.date       || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

async function handleApiLeads(req, db, url) {
  if (req.method === "GET") {
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const q      = url.searchParams.get("q");
    let query = "SELECT * FROM leads WHERE 1=1";
    const args = [];
    if (status && status !== "all") { query += " AND status = ?"; args.push(status); }
    if (source && source !== "all") { query += " AND source = ?"; args.push(source); }
    if (q) {
      query += " AND (name LIKE ? OR phone LIKE ? OR ig_handle LIKE ? OR society LIKE ?)";
      const like = `%${q}%`;
      args.push(like, like, like, like);
    }
    query += " ORDER BY date DESC, id DESC";
    const { results } = await db.prepare(query).bind(...args).all();
    return json(results.map(rowToLead));
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !body.name?.trim()) return apiErr("name is required");
    const today = new Date().toISOString().slice(0, 10);
    const result = await db.prepare(
      `INSERT INTO leads (name, phone, ig_handle, society, source, status, message, notes, date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      body.name.trim(), body.phone || "", body.igHandle || "",
      body.society || "", body.source || "Instagram DM",
      body.status  || "new", body.message || "",
      body.notes   || "", body.date || today
    ).run();
    const newLead = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(result.meta.last_row_id).first();
    return json(rowToLead(newLead), 201);
  }

  return apiErr("Method not allowed", 405);
}

async function handleApiLead(req, db, id) {
  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body) return apiErr("Invalid JSON");
    const colMap = { igHandle: "ig_handle" };
    const allowed = ["name","phone","ig_handle","society","source","status","message","notes","date"];
    const fields = [], args = [];
    for (const [k, v] of Object.entries(body)) {
      const col = colMap[k] || k;
      if (allowed.includes(col)) { fields.push(`${col} = ?`); args.push(v); }
    }
    if (!fields.length) return apiErr("No valid fields");
    fields.push("updated_at = datetime('now')");
    args.push(id);
    await db.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`).bind(...args).run();
    const updated = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
    if (!updated) return apiErr("Lead not found", 404);
    return json(rowToLead(updated));
  }

  if (req.method === "DELETE") {
    const existing = await db.prepare("SELECT id FROM leads WHERE id = ?").bind(id).first();
    if (!existing) return apiErr("Lead not found", 404);
    await db.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
    return json({ deleted: true });
  }

  return apiErr("Method not allowed", 405);
}

export default {
  async fetch(req, env) {
    const url      = new URL(req.url);
    const password = env.CRM_PASSWORD || "nokasa2026";
    const db       = env.DB;

    if (url.pathname === "/logout") {
      return new Response(null, { status: 302, headers: { Location: "/login", "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` } });
    }

    if (url.pathname === "/auth" && req.method === "POST") {
      const body = await req.formData();
      const submitted = body.get("password") || "";
      if (submitted === password) {
        const token = await makeToken(password);
        return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax` } });
      }
      return loginPage("Wrong password. Please try again.");
    }

    if (url.pathname === "/login") return loginPage();

    const authed = await isAuthenticated(req, password);
    if (!authed) {
      if (url.pathname.startsWith("/api/")) return apiErr("Unauthorized", 401);
      return new Response(null, { status: 302, headers: { Location: "/login" } });
    }

    if (url.pathname === "/api/leads") return handleApiLeads(req, db, url);
    const leadMatch = url.pathname.match(/^\/api\/leads\/(\d+)$/);
    if (leadMatch) return handleApiLead(req, db, parseInt(leadMatch[1]));

    return env.ASSETS.fetch(req);
  },
};
