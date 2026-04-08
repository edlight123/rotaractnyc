# 🛡️ Rotaract NYC — Admin Guide

This guide covers **everything board members, the president, and the treasurer** need to know about managing the Rotaract NYC web portal. It covers every admin feature, step-by-step instructions, and best practices.

---

## Table of Contents

1. [Admin Roles & Permissions](#1-admin-roles--permissions)
2. [Member Management](#2-member-management)
3. [Event Management](#3-event-management)
4. [Dues & Payment Management](#4-dues--payment-management)
5. [Service Hours Review](#5-service-hours-review)
6. [Forms & Surveys](#6-forms--surveys)
7. [Articles & Content](#7-articles--content)
8. [Document Management](#8-document-management)
9. [Committee Management](#9-committee-management)
10. [Board Manager](#10-board-manager)
11. [Media Manager](#11-media-manager)
12. [Finance Module](#12-finance-module)
13. [Email Broadcasts](#13-email-broadcasts)
14. [Automated Reminders](#14-automated-reminders)
15. [Analytics Dashboard](#15-analytics-dashboard)
16. [Reports & Data Export](#16-reports--data-export)
17. [Testimonials](#17-testimonials)
18. [Site Settings](#18-site-settings)
19. [Google Workspace Integration](#19-google-workspace-integration)
20. [Interactive Admin Tour](#20-interactive-admin-tour)
21. [Troubleshooting & Best Practices](#21-troubleshooting--best-practices)

---

## 1. Admin Roles & Permissions

The portal uses **role-based access control**. Here's who can do what:

| Feature | Member | Board | Treasurer | President |
|---------|--------|-------|-----------|-----------|
| View portal & RSVP | ✅ | ✅ | ✅ | ✅ |
| Create/edit events | ❌ | ✅ | ❌ | ✅ |
| Manage members (approve/edit) | ❌ | ✅ | ❌ | ✅ |
| Manage dues & payments | ❌ | ❌ | ✅ | ✅ |
| Review service hours | ❌ | ✅ | ✅ | ✅ |
| Create forms & surveys | ❌ | ✅ | ✅ | ✅ |
| Write articles | ❌ | ✅ | ✅ | ✅ |
| Send broadcasts | ❌ | ✅ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ | ✅ |
| Export reports | ❌ | ✅ | ✅ | ✅ |
| Manage finance module | ❌ | ❌ | ✅ | ✅ |
| Manage board page | ❌ | ✅ | ❌ | ✅ |
| Manage media/gallery | ❌ | ✅ | ❌ | ✅ |
| Site settings | ❌ | ✅ | ❌ | ✅ |
| Google Workspace | ❌ | ✅ | ❌ | ✅ |
| Approve budgets/expenses | ❌ | ❌ | ❌ | ✅ |

### Changing a Member's Role

1. Go to **Portal → Directory**
2. Find the member and click their profile
3. Use the role dropdown to change their role
4. Changes take effect immediately

> ⚠️ **Be careful:** Granting `board` or `president` gives significant admin access.

---

## 2. Member Management

**Path:** Portal → Directory

### Approving New Members

When someone signs up for the first time:
1. They'll appear in the directory with a **"Pending"** status badge
2. Click on their profile
3. Review their information
4. Click **"Approve"** to activate their account
5. They'll immediately gain full portal access

<!-- Screenshot: Member profile with Approve button -->
```
┌─────────────────────────────────┐
│  👤 Jane Smith                  │
│  jane@email.com                 │
│  Status: ⏳ Pending             │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ Approve  │  │  Reject  │    │
│  └──────────┘  └──────────┘    │
└─────────────────────────────────┘
```

### Inviting Members

Instead of waiting for someone to sign up, you can **pre-invite** them:
1. Go to **Portal → Directory**
2. Click **"Add Member"** or **"Import"**
3. Enter their **email address** and name
4. When they sign in with that Google account, their profile is auto-approved

### Editing Member Profiles

Admins can edit any member's profile:
- **Role** — member, board, treasurer, president
- **Status** — active, inactive, pending, alumni
- **Committee** — assign to a committee
- **Board Title** — if they hold a board position
- **Member Type** — professional or student (affects dues amount)

### Member Statuses

| Status | Effect |
|--------|--------|
| **Pending** | Cannot access the portal (sees waiting screen) |
| **Active** | Full portal access |
| **Inactive** | Account deactivated |
| **Alumni** | Appears in alumni directory with graduation year |

---

## 3. Event Management

**Path:** Portal → Events

### Creating an Event

1. Click the **"Create Event"** button (board/president only)
2. Fill in the event details:

| Field | Description |
|-------|-------------|
| **Title** | Event name |
| **Date & Time** | Start date/time and optional end date/time |
| **Location** | Venue name |
| **Address** | Full address (enables map display) |
| **Description** | Full event description (supports rich text) |
| **Type** | Free, Paid, Service, or Hybrid |
| **Cover Image** | Upload a banner image |
| **Tags** | Searchable tags |
| **Capacity** | Max attendees (leave blank for unlimited) |
| **Public** | Whether it shows on the public website |
| **Status** | Draft, Published, or Cancelled |

3. Click **"Create"**

### Paid Event Setup

For paid events, you'll also configure:
- **Member Price** — discounted price for members (in cents, e.g., 2500 = $25.00)
- **Guest Price** — price for non-members
- **Ticket Tiers** — optional multiple tier options (e.g., Early Bird, VIP)

Payments are processed via **Stripe**. The ticket revenue appears in your Stripe dashboard.

### Managing RSVPs

On any event's detail page, you can see:
- **Going** count with member names
- **Maybe** count with member names
- **Not Going** count

### Event Check-In

At the event:
1. Open the event detail page on your phone
2. A **QR code** is generated for the event
3. Scan attendees' QR codes (from their event page) to check them in
4. Check-in status is recorded with a timestamp

### Editing & Cancelling Events

- Click **"Edit"** on any event you created to modify details
- Set status to **"Cancelled"** to cancel (attendees are notified)
- Click **"Delete"** to permanently remove the event

### Recurring Events

Events support **recurrence** settings for repeating events (weekly, monthly, etc.).

---

## 4. Dues & Payment Management

**Path:** Portal → Dues & Billing → **Manage** tab (treasurer/president only)

### Dues Cycles

A dues cycle represents one billing period (typically the Rotary year: July 1 – June 30).

#### Creating a Cycle

1. Go to the **Manage** tab
2. Click **"New Cycle"**
3. Enter:
   - **Cycle name** (e.g., "2025–2026")
   - **Start & end dates**
   - **Professional amount** (e.g., $85.00)
   - **Student amount** (e.g., $65.00)
   - **Grace period** (days after start date before reminders begin)
4. Click **Create**

When a cycle is created, dues records are generated for all active members.

### Viewing All Member Dues

The Manage tab shows a **table of all members** with their payment status for the current cycle:

```
┌──────────────────────────────────────────────────────┐
│  Member          │ Status    │ Amount  │ Paid At     │
├──────────────────┼───────────┼─────────┼─────────────┤
│  John Doe        │ ✅ PAID   │ $85.00  │ Jul 15      │
│  Jane Smith      │ 🔴 UNPAID │ $85.00  │ —           │
│  Alex Chen       │ 🟡 OFFLINE│ $65.00  │ Jul 20      │
│  Sam Wilson      │ ⚪ WAIVED │ $0.00   │ —           │
└──────────────────────────────────────────────────────┘
```

### Approving Offline Payments

When a member pays via Zelle, Venmo, CashApp, or cash:
1. They submit proof of payment through the portal
2. You'll see a **"Pending Offline"** status with their uploaded receipt
3. Click **"Approve"** to confirm the payment
4. Their status changes to **Paid (Offline)**

### Waiving Dues

To waive dues for a member (e.g., financial hardship):
1. Find the member in the Manage table
2. Click **"Waive"**
3. Their status changes to **Waived**

### Collection Statistics

The Manage tab shows real-time stats:
- **Total collected** / **Total expected**
- **Collection rate** (percentage)
- **Paid / Unpaid / Waived** breakdown

---

## 5. Service Hours Review

**Path:** Portal → Service Hours → **Review** tab (board/treasurer/president)

### Approval Workflow

1. Members submit service hours after volunteering
2. Pending hours appear in your **Review** tab
3. For each submission, you can see:
   - Member name
   - Event title
   - Hours claimed
   - Description of work
4. Click **"Approve"** ✅ or **"Reject"** ❌
5. The member sees the status update on their hours page

### Best Practices
- Review hours **within a week** of the event
- Cross-reference with event attendance/check-in records
- Reach out to the member if hours seem unusual
- Rejected hours should include a brief reason

---

## 6. Forms & Surveys

**Path:** Portal → Forms & Surveys

Create custom forms for any data collection need — event feedback, volunteer sign-ups, member surveys, interest forms, and more. **No Google Forms needed.**

### Creating a Form

1. Click **"New Form"**
2. Enter a **title** and optional **description**
3. Click **"Create & Add Fields"**
4. You'll be taken to the **Form Builder**

<!-- Screenshot: Form builder interface -->
```
┌────────────────────────────────────────────────┐
│  📝 Post-Gala Feedback Survey    [Draft]       │
│  🔗 rotaractnyc.org/f/post-gala-feedback       │
│                                                │
│  ┌─ Fields (3) ─┬─ Responses (0) ─┬─ Preview ─┐│
│  │              │                  │           ││
│  │  ✏️ Name *                                  ││
│  │  ⭐ Rating *                                ││
│  │  📝 Comments                                ││
│  │                                             ││
│  │  [+ Add Field]                              ││
│  │                                             ││
│  │         [⚙️ Settings]  [🚀 Publish]  [Save] ││
│  └─────────────────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

### Adding Fields

Click **"+ Add Field"** to choose from **12 field types**:

| Type | Icon | Description |
|------|------|-------------|
| **Short Text** | ✏️ | Single-line text input |
| **Long Text** | 📝 | Multi-line textarea |
| **Email** | 📧 | Email address input with validation |
| **Phone** | 📱 | Phone number input |
| **Number** | 🔢 | Numeric input with optional min/max |
| **Dropdown** | 📋 | Select one option from a list |
| **Multi-select** | ☑️ | Select multiple options |
| **Single Choice** | 🔘 | Radio buttons (pick one) |
| **Checkboxes** | ✅ | Checkbox group (pick many) |
| **Date** | 📅 | Date picker |
| **Star Rating** | ⭐ | 1–5 star rating |
| **Scale** | 📊 | Numeric scale (e.g., 1–10) |

### Configuring Each Field

For each field, you can set:
- **Label** — the question text (e.g., "How would you rate this event?")
- **Field Type** — change the type at any time
- **Placeholder** — hint text inside the input
- **Helper Text** — additional instructions below the field
- **Required** — whether the field must be filled
- **Options** — for dropdown/radio/checkbox fields, add/remove/reorder choices
- **Min/Max** — for number, rating, and scale fields

### Reordering & Deleting Fields

- Use the **↑ / ↓ arrows** to move fields up or down
- Click the **✕** button to delete a field
- Drag the **⠿** handle to reorder (desktop)

### Form Settings

Click **"⚙️ Settings"** to configure:

| Setting | Description |
|---------|-------------|
| **Require login to submit** | Respondents must sign in with Google. Their name/email is auto-filled. Best for internal club surveys. |
| **Allow anonymous responses** | Name/email fields are optional. Good for honest feedback. *(Hidden when login is required)* |
| **Limit one response per person** | Prevents duplicate submissions. Based on email (public) or member account (login-required). |
| **Show progress bar** | Shows respondents how many fields they've completed. |
| **Confirmation message** | Custom thank-you message shown after submission. |
| **Redirect URL** | Optionally redirect to another page after submission. |
| **Auto-close date** | Automatically close the form on a specific date/time. |

### Publishing & Sharing

1. When ready, click **"🚀 Publish"** to make the form live
2. The shareable link appears below the title: `rotaractnyc.org/f/your-form-slug`
3. Click the **link icon** to copy it to your clipboard
4. Share via email, WhatsApp, Slack, or any channel

### Viewing Responses

1. Switch to the **"Responses"** tab in the form builder
2. Responses are shown in a **table** with:
   - Submission date
   - Respondent name & email
   - All field answers
3. Click **"Export CSV"** to download all responses as a spreadsheet
4. Click the **🗑️** icon to delete individual responses

<!-- Screenshot: Responses table view -->
```
┌──────────────────────────────────────────────────────────┐
│  12 responses                           [📥 Export CSV]  │
├───────────┬────────────┬──────────┬─────────┬───────────┤
│  When     │ Respondent │ Rating   │ Comment │           │
├───────────┼────────────┼──────────┼─────────┼───────────┤
│  Jan 15   │ Jane Smith │ ⭐⭐⭐⭐⭐ │ Great!  │    🗑️     │
│  Jan 15   │ John Doe   │ ⭐⭐⭐⭐   │ Good    │    🗑️     │
│  Jan 14   │ Alex Chen  │ ⭐⭐⭐     │ OK      │    🗑️     │
└───────────┴────────────┴──────────┴─────────┴───────────┘
```

### Form Lifecycle

| Status | Meaning |
|--------|---------|
| **Draft** 🟡 | Only visible to admins. Not yet shareable. |
| **Active** 🟢 | Live and accepting responses. Shareable link works. |
| **Closed** ⚪ | No longer accepting responses. Existing responses preserved. |

### Closing & Reopening

- Click **"⏸ Close"** to stop accepting responses
- Click **"🚀 Publish"** to reopen a closed form

### Deleting a Form

1. Go to the forms list page
2. Click the **🗑️** icon on the form card
3. Confirm deletion — **this permanently deletes the form AND all responses**

---

## 7. Articles & Content

**Path:** Portal → Articles

### Creating an Article

1. Click **"New Article"** (or go to `/portal/articles/new`)
2. Fill in:
   - **Title** — article headline
   - **Category** — Service, Leadership, International, or Fellowship
   - **Cover Image** — upload a banner image
   - **Excerpt** — short summary for listings
   - **Content** — full article body (rich text editor)
   - **Tags** — searchable keywords
3. Save as **Draft** or **Publish** immediately

### Managing Articles

- **Edit** any article from its detail page
- **Delete** articles you no longer need
- Toggle between **Published** and **Draft** tabs
- View stats: **view count** and **like count**

### SEO & Public Visibility

Published articles appear on the **public website** at `/news/[slug]`. They include:
- OpenGraph meta tags for social sharing
- Structured data for search engines
- View counter that increments with each unique visit

---

## 8. Document Management

**Path:** Portal → Documents

### Uploading Documents

1. Click **"Upload"** or drag-and-drop files
2. Select a **category** (Minutes, Policies, Bylaws, etc.)
3. Optionally assign to a **custom folder**
4. The document is uploaded and available to all members

### Organizing Documents

- **Categories** — 9 built-in categories for common document types
- **Custom Folders** — create additional folders with custom names, colors, and icons
- **Pinning** — pin important documents to the top of the list
- **Search** — search by document name

### Managing Custom Folders

1. Click **"New Folder"**
2. Enter a folder name
3. Choose a color (7 options) and icon
4. Assign documents to the folder

---

## 9. Committee Management

**Path:** Portal → Committees

### Creating a Committee

1. Click **"Create Committee"** (board/president only)
2. Fill in:
   - **Name** — e.g., "Community Service"
   - **Slug** — URL-friendly name (auto-generated)
   - **Chair** — select a member
   - **Co-Chair** — optional
   - **Capacity** — max members
   - **Meeting Cadence** — e.g., "1st & 3rd Wednesday at 7pm"
   - **Color** — visual theme (7 options)
   - **Icon** — representative emoji/icon
3. Click **Create**

### Managing Committees

- **Edit** committee details anytime
- **View members** — see who's joined
- **Manage waitlist** — if capacity is reached, new joiners are waitlisted
- **Term history** — track past committee chairs and terms

---

## 10. Board Manager

**Path:** Portal → Board Manager (board/president only)

Manage the **Leadership page** on the public website.

### Adding a Board Member Entry

1. Click **"Add Board Member"**
2. Fill in:
   - **Name** — display name
   - **Board Title** — select from standard Rotaract titles (President, VP, Secretary, Treasurer, Sergeant-at-Arms, Director, etc.)
   - **Bio** — short biography
   - **Photo** — upload a headshot
   - **LinkedIn** — link to their LinkedIn profile
   - **Link to Portal Profile** — optionally link to their portal member profile
3. Click **Save**

### Reordering

Drag and drop to arrange the order board members appear on the public page (typically President first, then VP, Secretary, etc.).

### Removing a Board Member

Click **"Remove"** to take someone off the leadership page (this doesn't affect their portal account).

---

## 11. Media Manager

**Path:** Portal → Media Manager (board/president only)

### Three Sections

#### 1. Hero Slideshow
Manage the **background images** on the public homepage hero section:
- **Upload** new slideshow images
- **Reorder** images by drag-and-drop
- **Delete** old images

#### 2. Public Gallery
Manage **photos** displayed in the public gallery:
- Upload individual photos
- Set photos as **featured** (highlighted in gallery)
- Add **captions** and **tags**
- Photos tagged via Google Cloud Vision automatically

#### 3. Photo Albums
Organize photos into **albums**:
- **Create** albums with a title, date, description, and cover photo
- **Add photos** to albums
- Set albums as **public** (visible on public website) or **private** (portal only)
- View **photo count** and **like** statistics

### Importing from Google Photos

**Path:** Portal → Media Manager → Import

1. Click **"Import from Google Photos"**
2. Paste a **Google Photos shared album URL**
3. The system imports all photos from the album
4. Photos are auto-organized into a new portal album

---

## 12. Finance Module

**Path:** `/finance` (treasurer/president only)

The Finance module is a **standalone section** (separate from the portal sidebar) for comprehensive financial management.

### Finance Dashboard

Overview showing:
- **YTD Collected** — total income this year
- **YTD Spent** — total expenses this year
- **Balance** — net position
- **Pending Actions** — budgets awaiting approval, pending payments, pending expenses

### Activities & Budgets

**Path:** `/finance/activities`

Track financial planning per club activity:

1. Click **"New Activity"**
2. Enter activity name and description
3. Link to a portal event (optional)
4. Add **budget line items**:
   - Item name, estimated cost, category
   - e.g., "Venue rental — $500", "Catering — $300"
5. **Submit for approval** → goes to the president

#### Activity Detail Page
- View budget vs. actual spending
- Track individual expenses against the budget
- See approval status (Draft → Submitted → Approved/Rejected)

### Expenses

**Path:** `/finance/expenses`

Track and manage club expenses:

1. Click **"New Expense"**
2. Fill in:
   - **Amount** — expense total
   - **Vendor** — who you paid
   - **Category** — supplies, venue, food, etc.
   - **Payment Method** — card, cash, etc.
   - **Receipt** — upload a photo/PDF of the receipt
   - **Activity** — link to a club activity (optional)
3. Submit for review

### Approvals (President Only)

**Path:** `/finance/approvals`

The president reviews and approves:
- **Budget requests** from the treasurer
- **Offline payment** confirmations
- **Expense claims** from board members

Each item shows full details and receipt images. Click **"Approve"** or **"Reject"** with an optional note.

### Financial Reports

**Path:** `/finance/reports`

Export financial data for reporting to Rotary International or for club records.

---

## 13. Email Broadcasts

**Path:** Portal → Admin → Broadcasts

Send **bulk email** to club members.

### Composing a Broadcast

1. Click **"New Broadcast"**
2. Select your **audience**:
   - **All Members** — every active member
   - **Unpaid Members** — only those with unpaid dues
   - **Board Only** — board, treasurer, president
   - **Specific Committee** — members of a chosen committee
3. Enter the **subject** and **message body**
4. Click **"Send"**

### Broadcast History

View a log of all sent broadcasts with:
- Subject, audience, date sent
- Recipient count

> ⚠️ **Best Practice:** Use broadcasts sparingly for important announcements. For routine updates, use the community feed on the dashboard.

---

## 14. Automated Reminders

**Path:** Portal → Admin → Reminders

Trigger **automated email sequences**:

| Reminder Type | What It Does |
|--------------|--------------|
| **Dues Reminders** | Sends email to all members with unpaid dues |
| **Event Reminders** | Sends reminder 3 days before upcoming events to RSVPd members |
| **Welcome Sequence** | Sends onboarding emails to newly approved members |

### How to Trigger

1. Go to the Reminders page
2. Click the **"Send"** button next to the reminder type
3. Confirm the action
4. View the **activity log** to see when reminders were last sent

### Automation

Reminders can also run automatically via **cron jobs** (configured in the deployment). The admin page shows the last run time.

---

## 15. Analytics Dashboard

**Path:** Portal → Admin → Analytics

Real-time club analytics across four areas:

### Member Analytics
- **Total members** (with growth trend)
- **Active vs. inactive** breakdown
- **New member growth** over time

### Dues Analytics
- **Collection rate** (% of expected dues collected)
- **Total revenue** from dues
- **Paid / Unpaid / Waived** breakdown

### Event Analytics
- **Total events** hosted
- **Average attendance** per event
- **Check-in rate** (RSVPs who actually showed up)
- **Event type distribution**

### Service Analytics
- **Total service hours** logged club-wide
- **Average hours per member**
- **Top contributors** leaderboard

### Engagement Metrics
- **Profile completion rate** — average across all members
- **Onboarding completion rate** — percentage who finished the wizard
- **Post/comment activity** — community feed engagement

---

## 16. Reports & Data Export

**Path:** Portal → Admin → Reports

Export club data to **CSV** or **Google Sheets**:

| Report | Data Included |
|--------|--------------|
| **Members** | Name, email, role, status, committee, phone, occupation, joined date |
| **Dues** | Member, cycle, status, amount, payment method, date paid |
| **RSVPs** | Event, member, RSVP status, response date |
| **Attendance** | Event, member, check-in status, check-in time |
| **Service Hours** | Member, event, hours, status, reviewer |

### Exporting

1. Select the **report type**
2. Click **"Export CSV"** for a downloadable spreadsheet
3. Or click **"Export to Google Sheets"** to push data to a connected Google Sheet

---

## 17. Testimonials

**Path:** Portal → Admin → Testimonials

Manage **member quotes** displayed on the public homepage.

### Adding a Testimonial

1. Click **"Add Testimonial"**
2. Enter:
   - **Quote** — the member's testimonial text
   - **Name** — member name
   - **Title** — their role or description (e.g., "Board Member, 2024–2025")
   - **Photo** — upload or link their photo
3. Toggle **Active/Inactive** to show or hide it
4. Click **Save**

### Reordering

Drag to rearrange the order testimonials appear on the homepage.

---

## 18. Site Settings

**Path:** Portal → Admin → Site Settings (board/president only)

### Impact Statistics

Manage the **4 stat cards** displayed on the public homepage and about page:

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   150+   │  │  2,500+  │  │   50+    │  │   25+    │
│ Members  │  │ Service  │  │  Events  │  │  Years   │
│          │  │  Hours   │  │ Per Year │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

For each stat card, edit:
- **Value** — the number displayed (e.g., "150+")
- **Label** — what the number represents (e.g., "Active Members")

These numbers are fetched dynamically and can be updated anytime.

---

## 19. Google Workspace Integration

**Path:** Portal → Admin → Google Workspace (board/president only)

> 📖 For detailed setup instructions, see [docs/GOOGLE_WORKSPACE.md](GOOGLE_WORKSPACE.md)

### Overview

Connect three Google services to the portal:

| Service | What It Does |
|---------|-------------|
| **Google Calendar** | Sync all portal events to a shared Google Calendar |
| **Google Sheets** | Export member, dues, event, and attendance data to Sheets |
| **Google Drive** | Browse and manage files in a shared Drive folder |

### Quick Setup

1. Set the `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable
2. Share your Google Calendar, Drive folder, or Sheet with the service account email
3. Enter the resource IDs on the admin page
4. Click **"Save Configuration"**

### Admin Page Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | Connection status, resource IDs, quick actions |
| **Calendar** | Sync events to Google Calendar |
| **Sheets** | Export data to Google Sheets |
| **Drive** | Browse shared Drive files |
| **Setup Guide** | Step-by-step setup instructions |

---

## 20. Interactive Admin Tour

Once a board member completes the **member tutorial**, an **admin-specific guided tour** automatically launches on the dashboard. This tour walks through all the admin-only features.

### How It Works

1. After the member tour is completed, the **admin tour welcome modal** appears on the dashboard
2. A **spotlight overlay** highlights each admin feature in the sidebar and portal
3. A **tooltip** explains what each admin tool does — with **Next**, **Back**, and **Skip** buttons
4. **Progress dots** show your position in the tour

### What the Admin Tour Covers (10 steps)

| Step | Section | What You'll Learn |
|------|---------|-------------------|
| 1 | Admin Welcome | Overview of your admin capabilities |
| 2 | Directory Management | Approving members and managing roles |
| 3 | Event Management | Creating and managing club events |
| 4 | Service Hours Review | Reviewing and approving member hours |
| 5 | Articles & Content | Writing and publishing club news |
| 6 | Email Broadcasts | Sending announcements to all members |
| 7 | Automated Reminders | Setting up scheduled reminder emails |
| 8 | Forms & Surveys | Creating forms for feedback and sign-ups |
| 9 | Analytics Dashboard | Viewing club engagement metrics |
| 10 | Site Settings | Configuring portal and public site settings |

### Who Sees the Admin Tour

The admin tour is only available to members with **board**, **treasurer**, or **president** roles. Regular members will not see the admin tour.

### Restarting the Tour

To retake the admin tour at any time:
1. Go to **Portal → Settings**
2. Scroll to the **"Portal Tour"** section
3. Click **"Restart Admin Tour"**

> 💡 **Tip:** New board members should complete both tours during their first week to get up to speed quickly.

---

## 21. Troubleshooting & Best Practices

### Common Issues

**Q: A member says they can't sign in.**
A: Check:
1. Are they using the correct Google account?
2. Is their status set to "active"? (check Directory)
3. Is the session cookie expired? (they should try clearing cookies and signing in again)

**Q: A member's dues show as "unpaid" but they paid.**
A: If they paid offline (Zelle/Venmo/etc.), check the Dues management tab for pending offline payments to approve. If they paid via Stripe, check the Stripe dashboard for the transaction.

**Q: Events aren't showing on the public website.**
A: Make sure the event has:
- Status = **"Published"** (not Draft or Cancelled)
- **"Public"** toggle enabled
- A future date (past events don't show in the public listing)

**Q: A form isn't accepting responses.**
A: Check:
- Status is **"Active"** (not Draft or Closed)
- The auto-close date hasn't passed
- If "Limit one response" is on, they may have already submitted

**Q: Google Calendar sync isn't working.**
A: Verify:
1. Service account key is set in environment variables
2. Calendar is shared with the service account email
3. Calendar ID is correctly entered on the admin page
4. Events have status = "Published"

### Best Practices

#### Member Management
- ✅ Approve new members within **24–48 hours**
- ✅ Run a **directory audit** at the start of each Rotary year
- ✅ Set departing members to **alumni** status rather than deleting
- ✅ Assign **committees** during onboarding

#### Events
- ✅ Create events **at least 2 weeks** in advance
- ✅ Always include the **full address** for map display
- ✅ Use **cover images** for better engagement
- ✅ Mark events as **Public** to boost attendance from potential members

#### Dues
- ✅ Create the new cycle **before July 1** each year
- ✅ Send dues reminders **monthly** until collection rate reaches 90%+
- ✅ Process offline payment approvals within **48 hours**
- ✅ Use the **waive** option for approved financial hardship cases

#### Forms & Surveys
- ✅ Use **"Require Login"** for internal club surveys (ensures accountability)
- ✅ Use **"Allow Anonymous"** for honest event feedback
- ✅ Enable **"Limit One Response"** for sign-ups and votes
- ✅ Export responses to CSV for **board meeting reports**
- ✅ Close forms after the collection period ends

#### Content
- ✅ Publish at least **1 article per month** to keep the news section fresh
- ✅ Update the **leadership page** immediately after board elections
- ✅ Rotate **testimonials** — feature different members periodically
- ✅ Keep the **document repository** organized by category

#### Communication
- ✅ Use **broadcasts** for important announcements (dues deadlines, major events)
- ✅ Use the **community feed** for routine updates and engagement
- ✅ Set up **automated reminders** and let them run on schedule
- ✅ Check **analytics** monthly to track engagement trends

#### Security
- ✅ Limit **president** and **board** roles to actual board members
- ✅ Review the **member directory** periodically for unauthorized accounts
- ✅ Never share the Google service account key or Stripe keys
- ✅ Rotate passwords and review API keys annually

---

## Quick Reference: Admin URLs

| Page | URL |
|------|-----|
| Dashboard | `/portal` |
| Directory | `/portal/directory` |
| Events | `/portal/events` |
| Dues Management | `/portal/dues` |
| Service Hours | `/portal/service-hours` |
| Forms & Surveys | `/portal/forms` |
| Articles | `/portal/articles` |
| Documents | `/portal/documents` |
| Committees | `/portal/committees` |
| Board Manager | `/portal/admin/board` |
| Media Manager | `/portal/media` |
| Finance | `/finance` |
| Broadcasts | `/portal/admin/broadcasts` |
| Reminders | `/portal/admin/reminders` |
| Analytics | `/portal/admin/analytics` |
| Reports | `/portal/admin/reports` |
| Testimonials | `/portal/admin/testimonials` |
| Site Settings | `/portal/admin/settings` |
| Google Workspace | `/portal/admin/google-workspace` |

---

## Need Developer Help?

For technical issues beyond the scope of this guide:
- Check [docs/PRD.md](PRD.md) for feature specifications
- Check [docs/SECURITY.md](SECURITY.md) for security details
- Check [docs/GOOGLE_WORKSPACE.md](GOOGLE_WORKSPACE.md) for Google integration setup
- Check [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) for deployment procedures
- Review the [README.md](../README.md) for development setup
