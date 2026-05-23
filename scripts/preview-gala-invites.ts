/**
 * Renders the gala invite templates to /tmp HTML files for visual QA.
 *
 * Usage:
 *   npx tsx scripts/preview-gala-invites.ts
 *
 * Then open the printed file paths in a browser (or VS Code's Simple Browser).
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  galaInvitePastAttendeeEmail,
  galaInviteMemberEmail,
} from '../lib/email/templates';

const OUT_DIR = '/tmp/gala-preview';
fs.mkdirSync(OUT_DIR, { recursive: true });

const POSTER_SRC = path.resolve(__dirname, '../public/rotaract-gala-2026-poster.jpg');
if (fs.existsSync(POSTER_SRC)) {
  fs.copyFileSync(POSTER_SRC, path.join(OUT_DIR, 'rotaract-gala-2026-poster.jpg'));
}

// Inline a logo placeholder so the header doesn't show a broken image
const LOGO_OUT = path.join(OUT_DIR, 'rotaract-logo-white.png');
if (!fs.existsSync(LOGO_OUT)) {
  // 1x1 transparent png so the header just shows the gold motto strip cleanly
  fs.writeFileSync(
    LOGO_OUT,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    ),
  );
}

const params = {
  firstName: 'Christina',
  ticketUrl: 'https://rotaractnyc.org/events/fundraiser-gala-30th-year-celebration',
  donateUrl: 'https://rotaractnyc.org/donate',
  eventDate: 'Saturday, June 6, 2026',
  eventTime: '7:00 PM – 11:00 PM',
  eventVenue: 'Rooftop venue, Manhattan — full address on the event page',
  // Local poster path so it renders in the preview without internet
  posterUrl: 'rotaract-gala-2026-poster.jpg',
};

const past = galaInvitePastAttendeeEmail(params);
// Member version
const member = galaInviteMemberEmail({ ...params, firstName: 'Maryann' });
// Alumni variant
const alumni = galaInviteMemberEmail({
  ...params,
  firstName: 'Evan',
  alumni: true,
});

// Patch absolute SITE.url logo references so they render locally.
function localize(html: string): string {
  return html
    .replace(/https:\/\/rotaractnyc\.org\/rotaract-logo-white\.png/g, 'rotaract-logo-white.png');
}

const writeOne = (slug: string, label: string, t: { subject: string; html: string; text: string }) => {
  const wrap = `<!doctype html><html><head><meta charset="utf-8"><title>${label}</title>
    <style>body{margin:0;background:#e7e9ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .meta{max-width:680px;margin:24px auto;padding:16px 20px;background:#fff;border-radius:10px;border:1px solid #d4d8e0;}
    .meta h2{margin:0 0 6px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;}
    .meta p{margin:0 0 6px;font-size:15px;color:#111;}
    .meta .subj{font-weight:700;}
    pre{white-space:pre-wrap;font-size:12px;color:#374151;background:#f4f5f7;padding:12px;border-radius:6px;}
    </style></head><body>
    <div class="meta">
      <h2>${label}</h2>
      <p class="subj">Subject: ${t.subject.replace(/</g, '&lt;')}</p>
      <details><summary style="cursor:pointer;color:#9B1B30;font-size:13px;font-weight:600;">View plain-text version</summary><pre>${t.text.replace(/</g, '&lt;')}</pre></details>
    </div>
    ${localize(t.html)}
  </body></html>`;
  const out = path.join(OUT_DIR, `${slug}.html`);
  fs.writeFileSync(out, wrap);
  console.log(`✅ ${label}\n   → ${out}`);
};

writeOne('1-past-attendees', '1 / 3  ·  Past attendees (2023 + 2025)', past);
writeOne('2-members', '2 / 3  ·  Current members', member);
writeOne('3-alumni', '3 / 3  ·  Alumni (member template, alumni: true)', alumni);

// Index page so all three are linked together
const index = `<!doctype html><html><head><meta charset="utf-8"><title>Gala 2026 invite previews</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;padding:40px;max-width:720px;margin:0 auto;color:#111;}
h1{color:#9B1B30;margin:0 0 24px;}a{display:block;padding:18px 22px;margin:10px 0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;color:#111;text-decoration:none;font-weight:600;}
a:hover{border-color:#9B1B30;color:#9B1B30;}small{color:#6b7280;font-weight:400;display:block;margin-top:4px;}</style></head><body>
<h1>Rotaract NYC Gala 2026 — Email previews</h1>
<a href="1-past-attendees.html">1 · Past attendees (2023 + 2025)<small>"Welcome back" framing — 62 recipients</small></a>
<a href="2-members.html">2 · Current members<small>"Your night" framing — 7 recipients</small></a>
<a href="3-alumni.html">3 · Alumni (same template, alumni:true)<small>"It's been a minute" framing — 37 recipients</small></a>
</body></html>`;
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), index);

console.log(`\n📂 Open: ${path.join(OUT_DIR, 'index.html')}`);
