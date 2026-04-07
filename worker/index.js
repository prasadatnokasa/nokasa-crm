/**
 * NoKasa CRM – Cloudflare Worker
 *
 * Authentication flow:
 *  1. Every request checks for a valid `crm_session` cookie.
 *  2. If missing / wrong → redirect to /login.
 *  3. POST /auth  → verify password, set cookie, redirect to /.
 *  4. GET  /logout → clear cookie, redirect to /login.
 *  5. Everything else → serve from the static ASSETS binding (the Vite build).
 *
 * Password is stored as a Worker Secret.
 * Set it once with:  wrangler secret put CRM_PASSWORD
 */

const COOKIE_NAME  = "crm_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/* ─── Simple crypto helpers ────────────────────────────────────────── */
async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function makeToken(password, secret) {
  // token = SHA-256(password + "|" + secret)
  return sha256hex(password + "|" + secret);
}

function getCookie(req, name) {
  const header = req.headers.get("Cookie") || "";
  const match  = header.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
  return match ? match.slice(name.length + 1) : null;
}

function loginPage(error = "") {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>NoKasa CRM · Sign in</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,'Segoe UI',sans-serif;background:#F9F8F5;display:flex;align-items:center;justify-content:center;min-height:100vh;color:#2C2C2A}
    .card{background:#fff;border-radius:16px;border:0.5px solid #D3D1C7;padding:36px 32px;width:100%;max-width:380px;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}
    .logo-icon{width:36px;height:36px;border-radius:10px;background:#639922;display:flex;align-items:center;justify-content:center}
    .logo-text{font-weight:500;font-size:17px}
    .logo-sub{font-size:11px;color:#888780}
    label{font-size:11px;font-weight:500;color:#5F5E5A;display:block;margin-bottom:5px}
    input[type=password]{width:100%;padding:10px 12px;border-radius:8px;border:0.5px solid #B4B2A9;font-size:14px;outline:none;font-family:inherit;background:#fff}
    input[type=password]:focus{border-color:#639922;box-shadow:0 0 0 3px #EAF3DE}
    button{width:100%;padding:11px;background:#639922;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;margin-top:16px;font-family:inherit}
    button:hover{background:#3B6D11}
    .error{background:#FCEBEB;color:#A32D2D;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
    .footer{font-size:11px;color:#B4B2A9;text-align:center;margin-top:20px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 5V11L8 14L3 11V5Z" fill="white" opacity="0.9"/></svg>
      </div>
      <div>
        <div class="logo-text">NoKasa CRM</div>
        <div class="logo-sub">Internal tool</div>
      </div>
    </div>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="POST" action="/auth">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter your password" autofocus required/>
      <button type="submit">Sign in →</button>
    </form>
    <div class="footer">NoKasa © 2026</div>
  </div>
</body>
</html>`, {
    status:  error ? 401 : 200,
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}

/* ─── Main handler ──────────────────────────────────────────────────── */
export default {
  async fetch(req, env) {
    const url      = new URL(req.url);
    const password = env.CRM_PASSWORD || "nokasa2026"; // fallback for local dev

    // ── /logout ──────────────────────────────────────────────────────
    if (url.pathname === "/logout") {
      return new Response(null, {
        status:  302,
        headers: {
          Location:    "/login",
          "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
        },
      });
    }

    // ── POST /auth ────────────────────────────────────────────────────
    if (url.pathname === "/auth" && req.method === "POST") {
      const body       = await req.formData();
      const submitted  = body.get("password") || "";
      const validToken = await makeToken(password, password); // token derived from secret

      if (submitted === password) {
        const token = await makeToken(submitted, submitted);
        return new Response(null, {
          status:  302,
          headers: {
            Location:    "/",
            "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      return loginPage("Wrong password. Please try again.");
    }

    // ── GET /login ────────────────────────────────────────────────────
    if (url.pathname === "/login") {
      return loginPage();
    }

    // ── Auth gate for all other routes ────────────────────────────────
    const cookieToken = getCookie(req, COOKIE_NAME);
    const validToken  = await makeToken(password, password);

    if (cookieToken !== validToken) {
      return new Response(null, {
        status:  302,
        headers: { Location: "/login" },
      });
    }

    // ── Serve static assets (the Vite build) ─────────────────────────
    return env.ASSETS.fetch(req);
  },
};
