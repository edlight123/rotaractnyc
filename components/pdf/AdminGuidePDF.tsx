import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

/* ─── Brand colours ─── */
const C = {
  cranberry: '#9b1b30',
  cranberryLight: '#f9e4e8',
  gold: '#ebc85b',
  goldLight: '#fdf8e8',
  dark: '#111827',
  gray700: '#374151',
  gray500: '#6b7280',
  gray400: '#9ca3af',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  gray50: '#f9fafb',
  white: '#ffffff',
  amber: '#92400e',
  amberBg: '#fef3c7',
  green: '#065f46',
  greenBg: '#d1fae5',
  red: '#991b1b',
};

/* ─── Styles ─── */
const s = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    paddingBottom: 6,
  },
  headerText: { fontSize: 7, color: C.gray400 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.gray400 },

  /* Cover */
  coverPage: {
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    backgroundColor: C.cranberry,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBadge: {
    backgroundColor: C.gold,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  coverBadgeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.dark,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  coverTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 36,
    color: C.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 13,
    color: '#f9c4cc',
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 1.6,
  },
  coverDate: { fontSize: 9, color: '#e8a0ab', marginTop: 40 },
  coverUrl: { fontSize: 9, color: C.gold, marginTop: 6 },

  /* Section */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionNumber: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.white,
    backgroundColor: C.cranberry,
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    paddingTop: 5,
    marginRight: 8,
  },
  sectionHeaderTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: C.cranberry,
  },

  /* Typography */
  h3: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.dark, marginBottom: 4, marginTop: 10 },
  body: { fontSize: 10, color: C.gray700, lineHeight: 1.6 },
  bold: { fontFamily: 'Helvetica-Bold' },

  /* Lists */
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  listBullet: { width: 14, fontSize: 10, color: C.cranberry },
  listNumber: { width: 14, fontSize: 10, color: C.cranberry, fontFamily: 'Helvetica-Bold' },
  listText: { flex: 1, fontSize: 10, color: C.gray700, lineHeight: 1.5 },

  /* Card */
  card: {
    backgroundColor: C.gray50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: 10,
    marginBottom: 6,
  },
  cardTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.dark, marginBottom: 3 },
  cardBody: { fontSize: 9, color: C.gray500, lineHeight: 1.5 },

  /* Table */
  table: { borderWidth: 1, borderColor: C.gray200, borderRadius: 4, marginBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.gray200 },
  tableRowLast: { flexDirection: 'row' },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: C.gray100,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  tableCellHeader: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.gray700, padding: 6 },
  tableCell: { fontSize: 9, color: C.gray700, padding: 6 },

  /* Tip */
  tip: {
    flexDirection: 'row',
    backgroundColor: C.goldLight,
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  tipIcon: { fontSize: 10, width: 18 },
  tipText: { flex: 1, fontSize: 9, color: C.amber, lineHeight: 1.5 },

  /* TOC */
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  tocLabel: { fontSize: 11, color: C.dark },
});

/* ─── Helpers ─── */
function Header({ title }: { title: string }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.headerText}>Rotaract NYC</Text>
      <Text style={s.headerText}>{title}</Text>
    </View>
  );
}
function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Admin Guide — Confidential</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}
function SectionHead({ num, title }: { num: number; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionNumber}>{num}</Text>
      <Text style={s.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.listItem}>
      <Text style={s.listBullet}>•</Text>
      <Text style={s.listText}>{children}</Text>
    </View>
  );
}
function Num({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={s.listItem}>
      <Text style={s.listNumber}>{n}.</Text>
      <Text style={s.listText}>{children}</Text>
    </View>
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.tip}>
      <Text style={s.tipIcon}>💡</Text>
      <Text style={s.tipText}>{children}</Text>
    </View>
  );
}

/* ─── Permissions Data ─── */
const perms = [
  ['View portal & RSVP',           '✅', '✅', '✅', '✅'],
  ['Create/edit events',            '❌', '✅', '❌', '✅'],
  ['Manage members',                '❌', '✅', '❌', '✅'],
  ['Manage dues & payments',        '❌', '❌', '✅', '✅'],
  ['Review service hours',          '❌', '✅', '✅', '✅'],
  ['Create forms & surveys',        '❌', '✅', '✅', '✅'],
  ['Write articles',                '❌', '✅', '✅', '✅'],
  ['Send broadcasts',               '❌', '✅', '✅', '✅'],
  ['View analytics',                '❌', '✅', '✅', '✅'],
  ['Export reports',                 '❌', '✅', '✅', '✅'],
  ['Manage finance module',         '❌', '❌', '✅', '✅'],
  ['Manage board page',             '❌', '✅', '❌', '✅'],
  ['Manage media/gallery',          '❌', '✅', '❌', '✅'],
  ['Site settings',                 '❌', '✅', '❌', '✅'],
  ['Google Workspace',              '❌', '✅', '❌', '✅'],
  ['Approve budgets/expenses',      '❌', '❌', '❌', '✅'],
];

/* ─── TOC labels ─── */
const tocLabels = [
  'Admin Roles & Permissions',
  'Member Management',
  'Event Management',
  'Dues & Payment Management',
  'Service Hours Review',
  'Forms & Surveys',
  'Articles & Content',
  'Document Management',
  'Committee Management',
  'Email Broadcasts',
  'Analytics & Reports',
  'Site Settings',
  'Troubleshooting & Best Practices',
];

/* ─── Document ─── */

export default function AdminGuidePDF() {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document
      title="Rotaract NYC — Admin Guide"
      author="Rotaract NYC"
      subject="Complete admin guide for board members"
    >
      {/* ── Cover ── */}
      <Page size="LETTER" style={s.coverPage}>
        <View style={s.coverBadge}>
          <Text style={s.coverBadgeText}>Rotaract NYC</Text>
        </View>
        <Text style={s.coverTitle}>Admin Guide</Text>
        <Text style={s.coverSubtitle}>
          Everything board members, the president, and the treasurer need to know about managing the Rotaract NYC web portal.
        </Text>
        <Text style={s.coverDate}>{today}</Text>
        <Text style={s.coverUrl}>Confidential — Board Members Only</Text>
      </Page>

      {/* ── TOC ── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Table of Contents" />
        <Footer />
        <Text style={[s.sectionHeaderTitle, { marginBottom: 16 }]}>Table of Contents</Text>
        {tocLabels.map((label, i) => (
          <View key={i} style={s.tocItem}>
            <Text style={s.tocLabel}>{i + 1}. {label}</Text>
          </View>
        ))}
      </Page>

      {/* ── 1. Roles & Permissions ── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Roles & Permissions" />
        <Footer />
        <SectionHead num={1} title="Admin Roles & Permissions" />
        <Text style={[s.body, { marginBottom: 8 }]}>
          The portal uses role-based access control. Here&apos;s who can do what:
        </Text>
        <View style={s.table}>
          <View style={s.tableRowHeader}>
            <Text style={[s.tableCellHeader, { width: '32%' }]}>Feature</Text>
            <Text style={[s.tableCellHeader, { width: '17%', textAlign: 'center' }]}>Member</Text>
            <Text style={[s.tableCellHeader, { width: '17%', textAlign: 'center' }]}>Board</Text>
            <Text style={[s.tableCellHeader, { width: '17%', textAlign: 'center' }]}>Treasurer</Text>
            <Text style={[s.tableCellHeader, { width: '17%', textAlign: 'center' }]}>President</Text>
          </View>
          {perms.map(([feature, m, b, t, p], i) => (
            <View key={i} style={i < perms.length - 1 ? s.tableRow : s.tableRowLast}>
              <Text style={[s.tableCell, { width: '32%' }]}>{feature}</Text>
              <Text style={[s.tableCell, { width: '17%', textAlign: 'center' }]}>{m}</Text>
              <Text style={[s.tableCell, { width: '17%', textAlign: 'center' }]}>{b}</Text>
              <Text style={[s.tableCell, { width: '17%', textAlign: 'center' }]}>{t}</Text>
              <Text style={[s.tableCell, { width: '17%', textAlign: 'center' }]}>{p}</Text>
            </View>
          ))}
        </View>
        <Tip>Be careful when granting board or president roles — they provide significant admin access.</Tip>
      </Page>

      {/* ── 2. Member Management ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Member Management" />
        <Footer />
        <SectionHead num={2} title="Member Management" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Directory</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Approving New Members</Text>
          <Num n={1}>New sign-ups appear with a &quot;Pending&quot; status badge</Num>
          <Num n={2}>Click on their profile to review their information</Num>
          <Num n={3}>Click &quot;Approve&quot; to activate their account</Num>
          <Num n={4}>They immediately gain full portal access</Num>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Inviting Members</Text>
          <Num n={1}>Go to Portal → Directory</Num>
          <Num n={2}>Click &quot;Add Member&quot; or &quot;Import&quot;</Num>
          <Num n={3}>Enter their email address and name</Num>
          <Text style={[s.cardBody, { marginTop: 2 }]}>
            When they sign in with that Google account, their profile is auto-approved.
          </Text>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Editable Fields</Text>
          <Text style={s.cardBody}>
            Admins can change: Role (member/board/treasurer/president), Status (active/inactive/pending/alumni), Committee, Board Title, and Member Type (professional/student — affects dues amount).
          </Text>
        </View>
      </Page>

      {/* ── 3. Event Management ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Event Management" />
        <Footer />
        <SectionHead num={3} title="Event Management" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Events</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Creating an Event</Text>
          <Text style={s.cardBody}>Click &quot;Create Event&quot; and fill in:</Text>
          <View style={[s.table, { marginTop: 4 }]}>
            <View style={s.tableRowHeader}>
              <Text style={[s.tableCellHeader, { width: '30%' }]}>Field</Text>
              <Text style={[s.tableCellHeader, { width: '70%' }]}>Description</Text>
            </View>
            {[
              ['Title, Date/Time', 'Event name and schedule (start + optional end)'],
              ['Location & Address', 'Venue name + full address (enables map display)'],
              ['Description', 'Full event description (rich text supported)'],
              ['Type', 'Free, Paid, Service, or Hybrid'],
              ['Cover Image', 'Upload a banner image'],
              ['Capacity', 'Max attendees (leave blank for unlimited)'],
              ['Status', 'Draft, Published, or Cancelled'],
            ].map(([field, desc], i, arr) => (
              <View key={i} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { width: '30%' }, s.bold]}>{field}</Text>
                <Text style={[s.tableCell, { width: '70%' }]}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Paid Event Setup</Text>
          <Bullet>Set Member Price and Guest Price (in cents, e.g. 2500 = $25.00)</Bullet>
          <Bullet>Optional Ticket Tiers (Early Bird, VIP, etc.)</Bullet>
          <Bullet>Payments processed via Stripe — revenue appears in your Stripe dashboard</Bullet>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Event Check-In</Text>
          <Num n={1}>Open the event detail page on your phone</Num>
          <Num n={2}>A QR code is generated for the event</Num>
          <Num n={3}>Scan attendees&apos; QR codes to check them in</Num>
          <Num n={4}>Check-in status is recorded with a timestamp</Num>
        </View>
      </Page>

      {/* ── 4. Dues & Payment ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Dues & Payment" />
        <Footer />
        <SectionHead num={4} title="Dues & Payment Management" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Dues & Billing → Manage tab (treasurer/president only)</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Creating a Dues Cycle</Text>
          <Num n={1}>Go to the Manage tab, click &quot;New Cycle&quot;</Num>
          <Num n={2}>Enter cycle name (e.g. &quot;2025–2026&quot;), start/end dates</Num>
          <Num n={3}>Set Professional ($90.00) and Student ($70.00) amounts</Num>
          <Num n={4}>Set grace period (days after start before reminders begin)</Num>
          <Num n={5}>Click Create — dues records generated for all active members</Num>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Approving Offline Payments</Text>
          <Text style={s.cardBody}>
            Members can pay via Zelle, Venmo, CashApp, or cash and upload proof. You&apos;ll see a &quot;Pending Offline&quot; status with their uploaded receipt. Click &quot;Approve&quot; to confirm — status changes to &quot;Paid (Offline).&quot;
          </Text>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Waiving Dues</Text>
          <Text style={s.cardBody}>
            Find the member in the Manage table → click &quot;Waive&quot; for financial hardship or other reasons.
          </Text>
        </View>

        <Tip>The Manage tab shows real-time collection stats: total collected, collection rate, and paid/unpaid/waived breakdown.</Tip>
      </Page>

      {/* ── 5. Service Hours Review ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Service Hours Review" />
        <Footer />
        <SectionHead num={5} title="Service Hours Review" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Service Hours → Review tab</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Approval Workflow</Text>
          <Num n={1}>Members submit service hours after volunteering</Num>
          <Num n={2}>Pending hours appear in your Review tab</Num>
          <Num n={3}>Review: member name, event title, hours claimed, description</Num>
          <Num n={4}>Click ✅ Approve or ❌ Reject</Num>
          <Num n={5}>The member sees the status update on their hours page</Num>
        </View>

        <Tip>Review hours within a week of each event. Cross-reference with event attendance/check-in records. Rejected hours should include a brief reason.</Tip>
      </Page>

      {/* ── 6. Forms & Surveys ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Forms & Surveys" />
        <Footer />
        <SectionHead num={6} title="Forms & Surveys" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Forms & Surveys</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Creating a Form</Text>
          <Num n={1}>Click &quot;New Form&quot;</Num>
          <Num n={2}>Enter a title and optional description</Num>
          <Num n={3}>Click &quot;Create & Add Fields&quot;</Num>
          <Num n={4}>Use the Form Builder to add fields from 12 types</Num>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>12 Field Types</Text>
          <Text style={s.cardBody}>
            Short Text, Long Text, Number, Email, Phone, Dropdown, Multiple Choice, Checkboxes, Date, Rating (⭐), Linear Scale, Yes/No
          </Text>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Settings & Publishing</Text>
          <Bullet>Require Login — only signed-in members can submit; auto-fills name/email</Bullet>
          <Bullet>Accept Responses — toggle to open/close the form</Bullet>
          <Bullet>Max Responses — auto-close after a limit</Bullet>
          <Bullet>Set status to &quot;Published&quot; to make the form live</Bullet>
          <Bullet>Share the URL: rotaractnyc.org/f/your-slug</Bullet>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Viewing Responses</Text>
          <Text style={s.cardBody}>
            Switch to the Responses tab to see all submissions in a sortable table. Export to CSV if needed.
          </Text>
        </View>
      </Page>

      {/* ── 7. Articles & 8. Documents ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Articles & Documents" />
        <Footer />
        <SectionHead num={7} title="Articles & Content" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Articles</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Writing an Article</Text>
          <Num n={1}>Click &quot;New Article&quot;</Num>
          <Num n={2}>Add a title, cover image, and category (Service, Leadership, International, Fellowship)</Num>
          <Num n={3}>Write content using the rich text editor</Num>
          <Num n={4}>Save as Draft or click Publish to make it live on the public site</Num>
        </View>
        <Tip>Published articles appear on the public /news page and in the community feed.</Tip>

        <SectionHead num={8} title="Document Management" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Documents</Text>
        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Uploading Documents</Text>
          <Num n={1}>Click &quot;Upload&quot; and select a file (PDF, DOC, XLS, etc.)</Num>
          <Num n={2}>Choose a category: Meeting Minutes, Bylaws, Handbooks, Reports, or a custom folder</Num>
          <Num n={3}>Toggle &quot;Pin&quot; to keep important documents at the top</Num>
        </View>
      </Page>

      {/* ── 9. Committees & 10. Broadcasts ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Committees & Broadcasts" />
        <Footer />
        <SectionHead num={9} title="Committee Management" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Committees</Text>
        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Creating a Committee</Text>
          <Num n={1}>Click &quot;New Committee&quot;</Num>
          <Num n={2}>Enter name, description, chair name, and meeting schedule</Num>
          <Num n={3}>Set max capacity (optional) and upload a cover image</Num>
        </View>
        <Tip>When a committee is full, new members are placed on a waitlist automatically.</Tip>

        <SectionHead num={10} title="Email Broadcasts" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Admin → Broadcasts</Text>
        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Sending a Broadcast</Text>
          <Num n={1}>Click &quot;New Broadcast&quot;</Num>
          <Num n={2}>Select audience: All Members, Active Only, or Specific Committee</Num>
          <Num n={3}>Enter subject and compose the email body</Num>
          <Num n={4}>Preview, then click &quot;Send&quot;</Num>
        </View>
        <Tip>Broadcasts are sent via the configured email provider. Always preview before sending!</Tip>
      </Page>

      {/* ── 11. Analytics & Reports ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Analytics & Reports" />
        <Footer />
        <SectionHead num={11} title="Analytics & Reports" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Admin → Analytics / Reports</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Analytics Dashboard</Text>
          <Bullet>Member Growth — sign-ups over time</Bullet>
          <Bullet>Event Attendance — RSVPs vs check-ins</Bullet>
          <Bullet>Dues Collection — paid/unpaid/waived breakdown</Bullet>
          <Bullet>Service Hours — total hours and leaderboard</Bullet>
          <Bullet>Engagement Score — composite member activity</Bullet>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Reports & Export</Text>
          <Text style={s.cardBody}>
            The Reports page lets you generate and download CSV exports: membership roster, event attendance, dues status, service hours, and more.
          </Text>
        </View>
      </Page>

      {/* ── 12. Site Settings & 13. Troubleshooting ── */}
      <Page size="LETTER" style={s.page} wrap>
        <Header title="Settings & Troubleshooting" />
        <Footer />
        <SectionHead num={12} title="Site Settings" />
        <Text style={[s.body, { marginBottom: 4 }]}>Path: Portal → Admin → Site Settings</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>What You Can Configure</Text>
          <Bullet>Club Info — name, tagline, description, address, phone, email</Bullet>
          <Bullet>Social Links — Instagram, LinkedIn, Facebook, etc.</Bullet>
          <Bullet>Homepage Content — hero slides, impact statistics, partner logos</Bullet>
          <Bullet>SEO — meta titles, descriptions, OG images</Bullet>
        </View>

        <SectionHead num={13} title="Troubleshooting & Best Practices" />

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Common Issues</Text>
          <View style={[s.table, { marginTop: 4 }]}>
            <View style={s.tableRowHeader}>
              <Text style={[s.tableCellHeader, { width: '35%' }]}>Problem</Text>
              <Text style={[s.tableCellHeader, { width: '65%' }]}>Solution</Text>
            </View>
            {[
              ['Member can\'t sign in', 'Ensure they\'re using the correct Google account and status isn\'t "Inactive."'],
              ['Events not on public site', 'Check Public toggle and Status (must be "Published").'],
              ['Dues amounts wrong', 'Edit the dues cycle and update professional/student amounts.'],
              ['Form link broken', 'Check the slug and ensure form is Published with responses enabled.'],
              ['Images not uploading', 'Max file size is 5 MB. Try a smaller file or different format.'],
            ].map(([problem, solution], i, arr) => (
              <View key={i} style={i < arr.length - 1 ? s.tableRow : s.tableRowLast}>
                <Text style={[s.tableCell, { width: '35%' }, s.bold]}>{problem}</Text>
                <Text style={[s.tableCell, { width: '65%' }]}>{solution}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.cardTitle}>Best Practices</Text>
          <Bullet>Review pending members and service hours at least weekly</Bullet>
          <Bullet>Keep events published promptly — don&apos;t leave them in draft</Bullet>
          <Bullet>Use broadcasts sparingly — only for important club-wide updates</Bullet>
          <Bullet>Archive old forms after closing them</Bullet>
          <Bullet>Back up reports by exporting CSV files monthly</Bullet>
          <Bullet>Update site settings when board members change</Bullet>
        </View>

        {/* Final note */}
        <View style={{ marginTop: 16, padding: 14, backgroundColor: C.cranberryLight, borderRadius: 8, alignItems: 'center' }}>
          <Text style={[s.bold, { fontSize: 12, color: C.cranberry, marginBottom: 4 }]}>
            Questions?
          </Text>
          <Text style={{ fontSize: 10, color: C.gray700, textAlign: 'center' }}>
            Reach the site developer or review the technical documentation in the GitHub repository.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
