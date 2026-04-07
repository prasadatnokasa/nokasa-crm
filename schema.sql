-- NoKasa CRM – D1 Schema
-- Run automatically on first deploy via: wrangler d1 execute nokasa-crm-db --file=schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  phone       TEXT    DEFAULT '',
  ig_handle   TEXT    DEFAULT '',
  society     TEXT    DEFAULT '',
  source      TEXT    DEFAULT 'Instagram DM',
  status      TEXT    DEFAULT 'new',
  message     TEXT    DEFAULT '',
  notes       TEXT    DEFAULT '',
  date        TEXT    NOT NULL,
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now'))
);

-- Seed with sample leads so the CRM isn't empty on first open
INSERT OR IGNORE INTO leads (id, name, phone, ig_handle, society, source, status, message, notes, date) VALUES
(1, 'Priya Sharma',    '+91 98456 32100', '@priya.cleanshelf', 'Jayanagar 4th Block',   'Instagram DM', 'followup',      'Hi! I saw your reel about clothes collection. I have around 20 items to give away. When can you come to Jayanagar?', 'Has 20+ items, prefers morning slot.', '2026-04-05'),
(2, 'Rahul Mehta',     '+91 99001 87654', '@rahulmehta.blr',   'HSR Layout Sector 2',   'Instagram DM', 'new',           'Interested in selling old clothes. We live in HSR Layout Sector 2.', '', '2026-04-06'),
(3, 'Ananya Krishnan', '+91 80123 45678', '@ananyak',           'Koramangala 6th Block', 'WhatsApp',     'converted',     'Booked a slot already! Just wanted to confirm Saturday works.', 'Confirmed for Sat 10AM.', '2026-04-04'),
(4, 'Deepak Nair',     '+91 77007 12345', '',                   'Indiranagar',           'Instagram DM', 'contacted',     'Do you cover Indiranagar? I have a big bag of kids clothes.', 'Replied with coverage map.', '2026-04-06'),
(5, 'Sneha Rao',       '+91 81234 56789', '@sneharao_blr',      'Whitefield',            'Instagram DM', 'interested',    'Loved your concept! My whole family wants to clean out the wardrobe. Can you handle bulk?', 'Family collection ~50 items.', '2026-04-07'),
(6, 'Arjun Patel',     '+91 96543 21098', '@arjunp',            'Electronic City',       'Instagram DM', 'notinterested', 'Not really interested right now, maybe later.', '', '2026-04-03');
