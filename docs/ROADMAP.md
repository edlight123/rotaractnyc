Product Roadmap

Rotaract Club at the United Nations – Website & Member Portal

1) Roadmap Overview

This roadmap translates the PRD into a practical build sequence. The goal is to launch a polished, high-utility platform without overbuilding too early.

The roadmap is designed around three principles:
	1.	Launch what people will actually use first
	2.	Build the operational foundation before advanced features
	3.	Keep the first version clean, stable, and easy to manage

⸻

2) Product Strategy

The platform has two products inside one ecosystem:

A. Public Website

Used by prospective members, partners, sponsors, and the broader public.

B. Member Portal

Used by current members and board leadership to manage club activity.

Because the public website is more straightforward and creates immediate brand value, it should be completed first. The member portal should follow in structured layers, beginning with core account and membership functions before adding deeper admin or engagement features.

⸻

3) Recommended Rollout Sequence

Phase 0 – Product Foundation

Objective

Finalize the structure, stack, and core logic before building deeper features.

Deliverables
	•	Final sitemap
	•	Final route structure
	•	Final roles and permissions model
	•	Final database entities
	•	Design direction for public site and portal
	•	Content inventory for public pages
	•	Definition of MVP scope

Key decisions to finalize
	•	Authentication method
	•	Payment method for dues
	•	Member role hierarchy
	•	Public vs member-only content logic
	•	Admin ownership and permissions
	•	Whether applications are hosted on-site or externally at first

Output from this phase

A clear implementation spec that engineering can follow without guessing.

Why this phase matters

Without this, the build can quickly become inconsistent, especially once payments, events, and role-based access are added.

⸻

Phase 1 – Public Website Launch

Objective

Launch a premium public-facing website that establishes credibility and supports growth.

Priority level

Highest

Core pages
	•	Homepage
	•	About
	•	Leadership
	•	Events
	•	Join
	•	Contact
	•	Partners/Sponsors
	•	Member Login entry point

Features included
	•	Clean responsive navigation
	•	Strong homepage hero and calls to action
	•	Club overview and mission content
	•	Leadership profiles
	•	Public events listing
	•	Join page with membership information
	•	Contact form or inquiry flow
	•	Footer with social/contact links

Success criteria
	•	Site feels polished and credible
	•	Users can easily understand what the club is and how to engage
	•	Leadership can share the site publicly with confidence

Why this phase comes first

Even before the full portal is complete, the club benefits immediately from a stronger public presence.

⸻

Phase 2 – Authentication and Core Member Portal Shell

Objective

Create the foundation of the private member experience.

Priority level

Highest

Features included
	•	Secure login
	•	Password reset
	•	Basic account creation / invite flow
	•	Protected portal routes
	•	Initial member dashboard shell
	•	Role-aware navigation
	•	Basic member profile page
	•	Settings/account page

Dashboard MVP components
	•	Welcome section
	•	Membership status summary
	•	Dues status placeholder
	•	Upcoming events preview
	•	Announcements preview
	•	Quick links to documents, directory, and profile

Success criteria
	•	Members can securely access the portal
	•	Portal navigation is clear and stable
	•	The app has the base structure to support later modules

Why this phase matters

This is the foundation layer. Everything else in the portal depends on auth, member identity, and permissions working properly.

⸻

Phase 3 – Member Directory and Profiles

Objective

Make the portal useful as a member network and internal community hub.

Priority level

High

Features included
	•	Searchable member directory
	•	Expanded member profiles
	•	Profile editing
	•	Optional privacy controls
	•	Role/committee/year fields
	•	Directory cards or profile listing view

Success criteria
	•	Members can discover and connect with one another
	•	Leadership has an updated member base
	•	Profile completion encourages engagement and legitimacy

Why this phase comes early

A member directory gives immediate value and helps the portal feel alive, not empty.

⸻

Phase 4 – Dues Management

Objective

Solve one of the club’s most important operational pain points.

Priority level

Highest

Features included
	•	Dues status view for each member
	•	Current membership period logic
	•	Payment button or integrated checkout
	•	Payment confirmation state
	•	Treasurer/admin dues dashboard
	•	Filter by paid/unpaid/pending
	•	Manual override capability if needed
	•	Payment history view

Admin functionality
	•	Mark payment status manually if required
	•	View all dues records
	•	Export dues list
	•	Send reminder support later or manually for MVP

Success criteria
	•	Members clearly see what they owe and whether they are current
	•	Treasurer can quickly understand club dues status
	•	Manual tracking burden drops significantly

Why this phase is critical

This is one of the strongest reasons for members and leadership to actually use the platform regularly.

⸻

Phase 5 – Events, RSVP, and Attendance

Objective

Turn the portal into the operational center for club participation.

Priority level

High

Features included
	•	Event listings inside the portal
	•	Event detail pages
	•	RSVP flow
	•	Public/private visibility settings
	•	Admin event creation and editing
	•	RSVP management dashboard
	•	Attendance tracking
	•	Event history by member

Success criteria
	•	Members can reliably RSVP and view event information
	•	Leadership can track participation more efficiently
	•	The website and portal become the central source of truth for events

Why this phase follows dues

Once members can log in and manage their membership status, events become the next most natural repeated behavior.

⸻

Phase 6 – Announcements and Document Library

Objective

Centralize club communication and resources.

Priority level

High

Features included
	•	Announcement feed on dashboard
	•	Pinned announcements
	•	Admin posting interface
	•	Document/resource library
	•	Categorized folders or collections
	•	Role-restricted documents where needed
	•	Search or filtering if manageable

Example documents
	•	Club bylaws
	•	Onboarding guides
	•	Meeting notes
	•	Committee materials
	•	Brand assets
	•	Forms and templates

Success criteria
	•	Members no longer need to ask repeatedly where resources are
	•	Leadership can distribute updates and materials from one place
	•	The portal becomes a true internal home base

⸻

Phase 7 – Admin Console and Operational Tools

Objective

Give leadership the controls needed to run the platform smoothly.

Priority level

High

Features included
	•	Member management dashboard
	•	Role assignment tools
	•	Event management tools
	•	Dues oversight tools
	•	Content management for announcements and documents
	•	Basic reporting and exports

Reports to include first
	•	Member list export
	•	Dues export
	•	RSVP export
	•	Attendance export

Success criteria
	•	Board leadership can manage operations without engineering help
	•	Yearly board turnover becomes easier to handle
	•	Administrative work is more centralized and transparent

⸻

Phase 8 – Onboarding and Automation Layer

Objective

Reduce manual work and improve consistency.

Priority level

Medium

Features included
	•	New member invite flow
	•	Welcome email flow
	•	Profile completion prompts
	•	Dues reminders
	•	Event reminder emails
	•	Light automation for recurring admin tasks

Success criteria
	•	New members onboard more smoothly
	•	Fewer manual reminders are needed from leadership
	•	More members complete setup and engage earlier

⸻

Phase 9 – Advanced Community and Analytics Features

Objective

Increase long-term engagement and improve club insight.

Priority level

Medium to low

Possible features
	•	Committee-specific views
	•	Member engagement analytics
	•	Volunteer/activity tracking
	•	Member recognition or achievement badges
	•	Alumni directory
	•	Sponsor/partner CRM-lite workflows
	•	Photo galleries by event
	•	More advanced reporting dashboards

Success criteria
	•	Leadership can better understand participation trends
	•	Portal feels more valuable long term
	•	The club can showcase stronger institutional continuity

⸻

4) MVP Definition

If you want the tightest practical MVP, it should include only the following:

Public website MVP
	•	Homepage
	•	About
	•	Leadership
	•	Events
	•	Join
	•	Contact
	•	Member Login

Portal MVP
	•	Authentication
	•	Dashboard
	•	Profile page
	•	Member directory
	•	Dues status/payment flow
	•	Event RSVP
	•	Announcements
	•	Document library

Admin MVP
	•	Member management
	•	Dues overview
	•	Event management
	•	Announcement posting
	•	Document upload

This is enough to make the platform real, useful, and differentiated without becoming too large.

⸻

5) Recommended Development Order

If building in engineering tickets, the order should be:
	1.	Design system / layout shell
	2.	Public website pages
	3.	Authentication and protected routing
	4.	User roles and permissions
	5.	Member dashboard
	6.	Profiles and directory
	7.	Dues system
	8.	Events and RSVP
	9.	Announcements
	10.	Document library
	11.	Admin console
	12.	Automation/polish

This order reduces rework and ensures the core architecture is ready before feature complexity increases.

⸻

6) Suggested Timeline Structure

This can be run as a 3-stage rollout.

Stage 1 – Brand + Foundation

Includes:
	•	Product foundation
	•	Public website
	•	Auth shell
	•	Dashboard shell

Goal

Get the platform live and credible with a working member entry point.

Stage 2 – Core Utility

Includes:
	•	Profiles
	•	Directory
	•	Dues
	•	Events + RSVP

Goal

Make the portal operationally valuable.

Stage 3 – Operational Maturity

Includes:
	•	Announcements
	•	Documents
	•	Admin tools
	•	Automation and reporting

Goal

Make the portal sustainable and leadership-friendly.

⸻

7) What Not to Build Too Early

To avoid wasting time or creating bloat, do not prioritize these in the first release:
	•	Full internal messaging/chat
	•	Mobile app
	•	Complex committee workflow tools
	•	Heavy analytics dashboards
	•	Overbuilt settings pages
	•	Social-media-like engagement features
	•	Highly custom CRM logic

These can be added later if real usage proves the need.

⸻

8) Key Risks by Phase

Risk 1: The portal looks good but is not useful

Mitigation: prioritize dues, events, directory, and announcements

Risk 2: Permissions become messy

Mitigation: define roles early and keep them simple

Risk 3: Leadership cannot maintain the system easily

Mitigation: build a simple admin interface and minimize manual complexity

Risk 4: Members do not return after first login

Mitigation: make dashboard immediately useful and action-oriented

Risk 5: The MVP becomes too large

Mitigation: cut low-value features and protect the core launch scope

⸻

9) Recommended Immediate Next Step After This Roadmap

After the roadmap, the next document should be a technical implementation spec.

That spec should define:
	•	stack
	•	route structure
	•	schema/data models
	•	role permissions
	•	component list
	•	page-by-page requirements
	•	admin logic
	•	payment flow assumptions

That is the document Copilot will benefit from most when actually generating code.

⸻

10) Final Recommendation

Do not try to build everything at once.

The smartest path is:
	1.	Launch a premium public site
	2.	Build a strong member portal foundation
	3.	Add the features members and leadership will use repeatedly
	4.	Only then expand into automation and advanced community tools

The portal will succeed if it becomes the club’s default place for membership status, events, updates, and internal resources — not just a website people visit once.

⸻

11) One-Line Build Priority

Build the public site for credibility, then build the portal around repeat-use operational features: dues, events, directory, updates, and simple admin control.