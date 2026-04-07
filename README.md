# NoKasa CRM — Cloudflare Workers Deployment

## What this is
A private, password-protected CRM for managing Instagram and WhatsApp leads.
Hosted on Cloudflare Workers — no server to manage, always on, global CDN.

---

## One-time setup

### 1. Prerequisites (if not already installed)
```bash
# Install Node.js from https://nodejs.org (LTS version)
# Then install wrangler globally:
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
# This opens a browser window — log in with your Cloudflare account.
# Sign up free at https://dash.cloudflare.com if you don't have one.
```

### 3. Install project dependencies
```bash
cd nokasa-crm
npm install
```

### 4. Set your CRM password (secret — not stored in code)
```bash
wrangler secret put CRM_PASSWORD
# It will prompt: "Enter a secret value:"
# Type your chosen password (e.g.  nokasa@blr2026) and press Enter.
# This is stored encrypted in Cloudflare — never in your code.
```

---

## Deploy

```bash
npm run deploy
```

That's it. Wrangler will:
1. Run `npm run build` (compiles the React app)
2. Upload everything to Cloudflare Workers

Your CRM will be live at:
`https://nokasa-crm.<your-cf-subdomain>.workers.dev`

---

## Updating the CRM

After any code changes:
```bash
npm run deploy
```

---

## Changing the password

```bash
wrangler secret put CRM_PASSWORD
# Enter the new password when prompted
# No redeploy needed — secrets update instantly
```

---

## Local development (no password required)

```bash
npm run dev
# Opens at http://localhost:5173
# The worker auth is bypassed locally — you see the CRM directly.
```

---

## Custom domain (optional)

In Cloudflare Dashboard → Workers & Pages → nokasa-crm → Settings → Domains & Routes
→ Add a custom domain like `crm.nokasa.co`

---

## Notes

- Session lasts **8 hours** — you'll be asked to log in again after that.
- Password is hashed (SHA-256) before being stored in the cookie — secure.
- All lead data is stored in your browser's local state (resets on refresh).
  If you want persistent data across devices, ask to add Cloudflare D1 (free database).
