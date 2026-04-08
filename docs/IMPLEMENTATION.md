Technical Implementation Specification

Rotaract Club at the United Nations – Website & Member Portal

1) Purpose

This document translates the PRD and roadmap into a build-ready technical specification. It is intended to guide implementation decisions, reduce ambiguity, and give engineering or Copilot enough structure to generate clean, scalable code.

This spec focuses on:
	•	system architecture
	•	route structure
	•	data models
	•	roles and permissions
	•	page-by-page requirements
	•	admin logic
	•	payment and event flows
	•	recommended implementation order

⸻

2) Recommended Stack

Frontend
	•	Next.js
	•	TypeScript
	•	Tailwind CSS
	•	Component library: shadcn/ui or equivalent clean reusable system

Backend / Data
	•	Firebase Auth for authentication
	•	Firestore for application data
	•	Firebase Storage for images and documents

Payments
	•	Stripe preferred for dues payment if the club wants integrated card payments
	•	Fallback option: external payment link if Stripe is not yet connected

Hosting / Infra
	•	Vercel for frontend hosting
	•	Firebase for backend services

Email / Notifications
	•	Initial MVP: optional manual or lightweight transactional email layer
	•	Later: automated reminders for dues, onboarding, and event RSVP confirmations

Why this stack works
	•	Fast to build
	•	Good for role-based portals
	•	Easy to deploy and maintain
	•	Matches a modern club website/member portal without overengineering

⸻

3) High-Level System Architecture

The platform should be treated as one app with two experiences:

A. Public Website

Accessible to everyone.

B. Member Portal

Protected area available only to authenticated users with appropriate roles.

C. Admin Layer

Protected routes available only to authorized leadership/admin users.

Suggested architecture layers
	1.	Public content layer
	2.	Auth layer
	3.	Portal application layer
	4.	Role-based admin layer
	5.	Shared data/service layer

Shared application concerns
	•	authentication state
	•	role-based route protection
	•	reusable layout shell
	•	event data
	•	dues data
	•	user/member profile data
	•	announcements and resources

⸻

4) Route Structure

Below is a recommended route structure for the website.

Public routes
	•	/
	•	/about
	•	/leadership
	•	/events
	•	/events/[slug]
	•	/join
	•	/partners
	•	/contact
	•	/login

Member portal routes
	•	/portal
	•	/portal/profile
	•	/portal/directory
	•	/portal/events
	•	/portal/events/[id]
	•	/portal/dues
	•	/portal/announcements
	•	/portal/documents
	•	/portal/settings

Admin routes
	•	/admin
	•	/admin/members
	•	/admin/members/[id]
	•	/admin/events
	•	/admin/events/[id]
	•	/admin/dues
	•	/admin/announcements
	•	/admin/documents
	•	/admin/reports
	•	/admin/roles

Notes
	•	Public and portal layouts should be separate
	•	Admin layout should be distinct and clearly secured
	•	Protected routes should redirect unauthenticated users to /login
	•	Unauthorized users should receive a graceful access denied state

⸻

5) Roles and Permissions Model

Keep permissions simple in v1.

Suggested roles
	•	visitor
	•	prospective_member
	•	member
	•	committee_lead
	•	board
	•	treasurer
	•	secretary
	•	admin
	•	super_admin

MVP simplification

For MVP, you can collapse these into:
	•	member
	•	board
	•	treasurer
	•	admin

Role permission overview

Member
Can:
	•	access portal
	•	view own profile
	•	edit own profile
	•	view member directory
	•	view announcements
	•	view documents allowed to members
	•	RSVP to events
	•	view own dues status

Cannot:
	•	manage users
	•	edit events globally
	•	manage dues records for others
	•	access admin pages

Board
Can:
	•	do everything a member can do
	•	create and edit announcements
	•	create and edit events
	•	view participation data depending on permissions

Treasurer
Can:
	•	do everything a member can do
	•	view all dues records
	•	update dues statuses
	•	export dues data

Admin
Can:
	•	manage members
	•	assign roles
	•	manage events
	•	manage announcements
	•	manage documents
	•	view reports
	•	access all admin pages

Super Admin
Reserved for full system-level access, if needed.

Permission design rule

Use a combination of:
	•	route-level protection
	•	component-level conditional rendering
	•	backend/firestore security rules

Do not rely only on frontend hiding.

⸻

6) Data Model / Collections

This is a suggested Firestore structure for MVP.

6.1 Users / Members

Collection: users

Each authenticated person should have one main user document.

Example fields
	•	id
	•	firstName
	•	lastName
	•	email
	•	photoUrl
	•	bio
	•	phone
	•	role
	•	committee
	•	membershipStatus (active, pending, inactive, alumni)
	•	memberSince
	•	membershipYear
	•	jobTitle
	•	organization
	•	location
	•	linkedinUrl
	•	visibilitySettings
	•	createdAt
	•	updatedAt

Notes
	•	The role field controls portal/admin access
	•	visibilitySettings can define which profile fields appear in the directory

⸻

6.2 Dues Records

Collection: dues

A dues document can be created per member per membership cycle.

Example fields
	•	id
	•	userId
	•	membershipYear
	•	amountDue
	•	amountPaid
	•	currency
	•	status (unpaid, pending, paid, waived, partial)
	•	paymentMethod
	•	stripeSessionId
	•	paidAt
	•	dueDate
	•	notes
	•	createdAt
	•	updatedAt

Notes
	•	Keep one dues record per cycle per member
	•	Allow manual updates by treasurer/admin

⸻

6.3 Events

Collection: events

Example fields
	•	id
	•	title
	•	slug
	•	description
	•	shortDescription
	•	location
	•	startAt
	•	endAt
	•	visibility (public, members_only, board_only)
	•	status (draft, published, archived)
	•	coverImageUrl
	•	capacity
	•	requiresRsvp
	•	createdBy
	•	createdAt
	•	updatedAt

Notes
	•	Public website reads published public events
	•	Portal reads events based on role and visibility

⸻

6.4 RSVPs

Collection: rsvps

Example fields
	•	id
	•	eventId
	•	userId
	•	status (going, maybe, cancelled, attended)
	•	checkedIn
	•	checkedInAt
	•	createdAt
	•	updatedAt

Notes
	•	Can be queried by event or by user
	•	Supports both RSVP and attendance in one structure for MVP

⸻

6.5 Announcements

Collection: announcements

Example fields
	•	id
	•	title
	•	body
	•	audience (all_members, board_only, treasurer_only, public)
	•	pinned
	•	published
	•	authorId
	•	createdAt
	•	updatedAt

Notes
	•	Dashboard should pull recent published announcements
	•	Portal should filter by audience and role

⸻

6.6 Documents / Resources

Collection: documents

Example fields
	•	id
	•	title
	•	description
	•	category
	•	fileUrl
	•	storagePath
	•	visibility (member, board, admin)
	•	uploadedBy
	•	createdAt
	•	updatedAt

Notes
	•	Files live in Firebase Storage
	•	Firestore stores metadata and visibility

⸻

6.7 Applications / Interest Forms

Collection: applications

Optional for MVP if applications are handled on-site.

Example fields
	•	id
	•	firstName
	•	lastName
	•	email
	•	phone
	•	motivation
	•	status (submitted, reviewing, accepted, rejected)
	•	submittedAt
	•	reviewedAt
	•	reviewedBy

⸻

6.8 Audit / Activity Logs

Optional but useful later.

Collection: activity_logs

Example fields
	•	id
	•	actorId
	•	action
	•	entityType
	•	entityId
	•	metadata
	•	createdAt

This can be added later if admin accountability becomes important.

⸻

7) Layout and Navigation Structure

7.1 Public Website Layout

Components
	•	top navbar
	•	hero section on homepage
	•	section blocks for impact/events/leadership
	•	footer

Navigation items
	•	About
	•	Leadership
	•	Events
	•	Join
	•	Partners
	•	Contact
	•	Member Login

Design guidance
	•	premium but simple
	•	modern spacing
	•	clean typography
	•	no clutter
	•	clear calls to action

⸻

7.2 Portal Layout

Structure
	•	sidebar or top/side hybrid navigation
	•	main dashboard content area
	•	profile/menu dropdown
	•	notification/announcement highlight area

Portal navigation
	•	Dashboard
	•	Profile
	•	Directory
	•	Events
	•	Dues
	•	Announcements
	•	Documents
	•	Settings

Portal design principles
	•	action-oriented dashboard
	•	fast scanning
	•	limited clutter
	•	important statuses visible immediately

⸻

7.3 Admin Layout

Admin navigation
	•	Overview
	•	Members
	•	Events
	•	Dues
	•	Announcements
	•	Documents
	•	Reports
	•	Roles

Design principles
	•	more functional than decorative
	•	table/list heavy where needed
	•	clear filters and actions
	•	permissions-aware UI

⸻

8) Page-by-Page Requirements

8.1 Homepage /

Purpose

Introduce the club and drive action.

Sections
	•	hero with mission/value proposition
	•	CTA buttons
	•	brief club overview
	•	upcoming events preview
	•	leadership/community highlight
	•	impact section
	•	sponsor/partner callout
	•	footer

Data dependencies
	•	optional featured events
	•	optional homepage content blocks from static config or CMS-lite collection

⸻

8.2 About /about

Content
	•	mission
	•	vision
	•	values
	•	club story
	•	why join

⸻

8.3 Leadership /leadership

Content
	•	leadership grid
	•	role titles
	•	short bios
	•	optional LinkedIn links

Data source
	•	can be static first, then move to Firestore or config

⸻

8.4 Events /events

Public behavior
	•	show published public events only
	•	allow cards/list with date and location

Event detail /events/[slug]
	•	title
	•	description
	•	time/date
	•	location
	•	CTA for RSVP or inquiry if public

⸻

8.5 Join /join

Content
	•	membership benefits
	•	who should apply
	•	expectations
	•	dues information
	•	application or interest form CTA

⸻

8.6 Contact /contact

Features
	•	contact form
	•	email/social details
	•	optional partnership-specific section

⸻

8.7 Login /portal/login

Features
	•	Google OAuth sign-in via Firebase Auth (popup with redirect fallback)
	•	Automatic invite migration — if email matches a pre-added member, auto-activates on sign-in
	•	New users created with `role: 'member'`, `status: 'pending'` (blocked until board approval)
	•	`ADMIN_ALLOWLIST` emails auto-promoted to `president` with `status: 'active'`
	•	Session cookie creation via `POST /api/portal/auth/session` (14-day `HttpOnly` cookie)
	•	Redirect logic after auth (returns to original page or portal dashboard)
	•	Loading states, popup-blocked fallback, and error code handling

⸻

8.8 Portal Dashboard /portal

Purpose

Central action hub for members.

Modules
	•	welcome header
	•	membership status card
	•	dues summary card
	•	upcoming events card
	•	recent announcements
	•	quick links
	•	optional profile completion reminder

Data needed
	•	current user
	•	dues record for current cycle
	•	next few visible events
	•	recent announcements

⸻

8.9 Profile /portal/profile

Features
	•	view/edit profile
	•	image upload
	•	bio, organization, title, committee, links
	•	privacy settings for directory fields

⸻

8.10 Directory /portal/directory

Features
	•	searchable member list
	•	filters by role or committee if available
	•	card/list presentation
	•	click into member detail drawer/page if desired

Data rules
	•	only active or approved members shown
	•	respect profile visibility settings where relevant

⸻

8.11 Portal Events /portal/events

Features
	•	list all visible events for user role
	•	filter upcoming/past
	•	RSVP buttons

Event detail /portal/events/[id]
	•	full event detail
	•	RSVP status
	•	attendance confirmation if relevant

⸻

8.12 Dues /portal/dues

Features
	•	current dues amount
	•	paid/unpaid status
	•	due date
	•	pay button
	•	payment history if available
	•	contact treasurer guidance if needed

Logic
	•	if member is already paid, show confirmation state
	•	if pending, show pending state
	•	if unpaid, show action path

⸻

8.13 Announcements /portal/announcements

Features
	•	list of visible announcements
	•	pinned announcements on top
	•	publish date and author if desired

⸻

8.14 Documents /portal/documents

Features
	•	grouped categories
	•	search or filter
	•	open/download file
	•	role-based visibility filtering

⸻

8.15 Settings /portal/settings

Features
	•	account settings
	•	notification preferences
	•	email preference toggles later if added

⸻

8.16 Admin Dashboard /admin

Purpose

Quick operational overview.

Suggested widgets
	•	total active members
	•	unpaid dues count
	•	upcoming events count
	•	recent RSVPs
	•	latest announcements/doc uploads

⸻

8.17 Admin Members /admin/members

Features
	•	members table
	•	search/filter
	•	role editing
	•	membership status update
	•	open member detail
	•	activate/deactivate member

⸻

8.18 Admin Dues /admin/dues

Features
	•	dues table
	•	filter by status/year
	•	mark paid/pending/waived
	•	export CSV
	•	view member payment history

⸻

8.19 Admin Events /admin/events

Features
	•	create/edit event
	•	publish/unpublish
	•	set public/member visibility
	•	view RSVPs
	•	mark attendance

⸻

8.20 Admin Announcements /admin/announcements

Features
	•	create/edit/delete announcements
	•	set pinned and audience flags
	•	publish/unpublish

⸻

8.21 Admin Documents /admin/documents

Features
	•	upload files
	•	categorize resources
	•	set visibility level
	•	delete/archive entries

⸻

8.22 Admin Reports /admin/reports

MVP reports
	•	member export
	•	dues export
	•	RSVP export
	•	attendance export

⸻

9) Auth and Access Control Requirements

Authentication
	•	Google OAuth sign-in via Firebase Auth (popup with redirect fallback) — no email/password
	•	Server-side session cookie (14-day `HttpOnly`, `Secure`, `SameSite=Lax`) created via `POST /api/portal/auth/session`
	•	Open registration: anyone with a Google account can sign in, but new users get `status: 'pending'` and are blocked until board approval
	•	Invite migration: board pre-adds a member's email → auto-activated on first Google sign-in
	•	`ADMIN_ALLOWLIST` env var: comma-separated emails auto-promoted to `role: 'president'` on first login

Authorization

Four enforcement layers:
	1.	**Edge middleware** — cookie existence + JWT structure + expiry check on all `/portal/*` routes
	2.	**API routes** — Firebase Admin `verifySessionCookie(cookie, true)` + Firestore role check
	3.	**Client-side** — `PortalShell` gates UI by `status` (pending → blocked) and `role` (admin features hidden)
	4.	**Firestore security rules** — `isMember()`, `isBoard()`, `isTreasurer()`, `isPresident()` helpers

Role hierarchy: `member → board → treasurer → president`

Access examples
	•	unauthenticated users cannot access /portal (redirected to /portal/login by middleware)
	•	pending users see "Account Pending Approval" screen — cannot access any portal content
	•	members cannot access admin features (UI-gated + API-enforced)
	•	treasurer can access dues/finance pages but not event or member management
	•	only president can delete members or dues records

⸻

10) Payment Flow Specification

Recommended dues payment flow
	1.	Member opens /portal/dues
	2.	System checks current unpaid dues record
	3.	Member clicks Pay Dues
	4.	Redirect to Stripe Checkout or payment link
	5.	On success, return to success page or dashboard
	6.	Webhook or manual update marks dues as paid
	7.	Treasurer/admin can verify in admin dues dashboard

Stripe-related data handling
	•	store stripeSessionId or payment reference
	•	update status to paid only after verified success
	•	if no webhook at first, allow manual confirmation for MVP

Fallback option

If integrated payments are not ready:
	•	show external payment instructions
	•	allow admin manual marking
	•	still keep dues dashboard active

⸻

11) Event + RSVP Flow Specification

Member RSVP flow
	1.	Member opens event detail page
	2.	Clicks RSVP
	3.	RSVP record is created or updated
	4.	UI reflects current status
	5.	Event attendee count updates for admins

Attendance flow

For MVP, simplest flow:
	•	admin manually marks attendance on event admin page
	•	checkedIn and checkedInAt updated on RSVP record

Later options
	•	QR attendance
	•	self-check-in
	•	attendance kiosk mode

⸻

12) Announcement Flow Specification
	1.	Admin or board creates announcement
	2.	Sets audience and published state
	3.	Optionally pins announcement
	4.	Announcement appears on relevant dashboards/pages

Filtering logic
	•	public audience can appear publicly if desired
	•	all_members visible to all portal members
	•	narrower audiences visible only to matching roles

⸻

13) Document Library Flow Specification
	1.	Admin uploads file to Firebase Storage
	2.	Metadata record created in documents
	3.	Visibility level assigned
	4.	Members see only documents allowed for their role

Categories examples
	•	Governance
	•	Onboarding
	•	Meeting Notes
	•	Branding
	•	Committee Resources
	•	Finance Forms

⸻

14) Firestore Security Rules Guidance

At minimum, rules should enforce:
	•	users can read/update their own profile
	•	members can read only allowed directory fields or approved user docs depending on implementation
	•	only admin-level roles can manage events globally
	•	only treasurer/admin can update dues records
	•	document reads depend on visibility
	•	announcements reads depend on audience and role

Important note

If storing sensitive member data in user documents, separate public directory-safe fields from private admin-only fields if needed.

⸻

15) Component List

Shared components
	•	Navbar
	•	Footer
	•	Section wrapper
	•	Page header
	•	Card
	•	Badge
	•	Button
	•	Empty state
	•	Loading state
	•	Access denied state

Portal components
	•	Dashboard stat card
	•	Announcement list
	•	Event card
	•	Dues status card
	•	Profile form
	•	Directory member card
	•	Document list/table

Admin components
	•	Data table
	•	Filter toolbar
	•	Status badge
	•	Role selector
	•	Publish toggle
	•	Upload modal
	•	CSV export action

⸻

16) State / Data Fetching Guidance

If using Next.js with Firebase:
	•	public pages can be static or server-rendered where useful
	•	portal/admin pages will mostly rely on authenticated client-side fetching or secured server actions
	•	abstract Firestore calls into service files
	•	avoid scattering Firebase logic directly inside page components

Suggested structure
	•	/lib/firebase
	•	/lib/auth
	•	/lib/services/users
	•	/lib/services/events
	•	/lib/services/dues
	•	/lib/services/announcements
	•	/lib/services/documents
	•	/lib/permissions

This makes Copilot output cleaner and more maintainable.

⸻

17) Recommended Folder Structure

Example Next.js app structure:
	•	app/
	•	(public)/
	•	page.tsx
	•	about/page.tsx
	•	leadership/page.tsx
	•	events/page.tsx
	•	events/[slug]/page.tsx
	•	join/page.tsx
	•	partners/page.tsx
	•	contact/page.tsx
	•	login/page.tsx
	•	(portal)/
	•	portal/page.tsx
	•	portal/profile/page.tsx
	•	portal/directory/page.tsx
	•	portal/events/page.tsx
	•	portal/events/[id]/page.tsx
	•	portal/dues/page.tsx
	•	portal/announcements/page.tsx
	•	portal/documents/page.tsx
	•	portal/settings/page.tsx
	•	(admin)/
	•	admin/page.tsx
	•	admin/members/page.tsx
	•	admin/events/page.tsx
	•	admin/dues/page.tsx
	•	admin/announcements/page.tsx
	•	admin/documents/page.tsx
	•	admin/reports/page.tsx
	•	components/
	•	lib/
	•	types/
	•	hooks/
	•	constants/

⸻

18) Implementation Phases for Engineering

Phase A
	•	layout shell
	•	design system primitives
	•	public site pages

Phase B
	•	auth setup
	•	user model creation
	•	protected portal shell
	•	dashboard shell

Phase C
	•	profile management
	•	directory
	•	role helpers

Phase D
	•	dues data model and payment flow
	•	treasurer/admin dues tools

Phase E
	•	events and RSVP
	•	attendance tracking

Phase F
	•	announcements
	•	documents
	•	admin tools
	•	reports

Phase G
	•	polish
	•	onboarding improvements
	•	reminder automations

⸻

19) Acceptance Criteria Examples

Member dashboard
	•	Logged-in member can view dashboard without errors
	•	Dashboard shows current dues status
	•	Dashboard shows at least the next upcoming visible events
	•	Dashboard shows recent visible announcements

Directory
	•	Member can search for another member by name
	•	Only authorized users can access directory
	•	Directory excludes inactive members unless admin chooses otherwise

Dues
	•	Member can see current dues record
	•	Treasurer can update dues status
	•	Admin can export dues list

Events
	•	Admin can create an event
	•	Member can RSVP to visible event
	•	RSVP status persists and updates correctly

Documents
	•	Admin can upload document metadata and file
	•	Members only see documents permitted for their role

⸻

20) What Copilot Should Not Guess

When prompting Copilot, do not leave these ambiguous:
	•	exact route structure
	•	exact roles
	•	Firestore collection names
	•	dues statuses
	•	event visibility rules
	•	which fields belong in user profiles
	•	whether members can self-register or require invitation
	•	which admin pages exist in MVP

These should be explicitly stated in prompts or implementation tasks.

⸻

21) Recommended Immediate Build Decisions

To keep the project moving, lock these decisions first:
	1.	Use Next.js + TypeScript + Tailwind
	2.	Use Firebase Auth + Firestore + Storage
	3.	Use Stripe for dues if possible
	4.	Keep MVP roles to member / board / treasurer / admin
	5.	Launch with public site + dashboard + directory + dues + events + announcements + documents + admin basics
	6.	Use simple role-based permissions before adding finer committee logic

⸻

22) Final Engineering Summary

The website should be built as a modern Next.js application with a premium public-facing layer and a protected member portal supported by Firebase. The MVP should prioritize the features that create repeated value for both members and leadership: authentication, profiles, directory, dues, events, announcements, documents, and simple admin controls. Permissions should remain simple, the data model should be clean, and advanced automation should wait until the operational core is stable.

⸻

23) One-Line Build Brief

Build a premium public site plus a secure Firebase-backed member portal where Rotaract leadership can manage members, dues, events, announcements, and resources, and where members can log in to handle the things they actually need regularly.