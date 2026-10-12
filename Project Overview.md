LocalStay Management — Implementation Plan
Marketplace-Style Digital Booking Platform for Small Hotels & Inns in Malaybalay City
Stack: Django + Django REST Framework (backend) · React + TanStack Router + Zustand + Tailwind/Shadcn (frontend) · PostgreSQL · Docker

1. Project Scope Recap
Problem: Small hotels/inns manage walk-in check-ins, direct bookings, and guest requests manually on paper — causing registration delays, double-bookings during peak events, and poor guest communication. Guests also have no single place to discover and compare lodging options in Malaybalay.

Solution: A marketplace-style platform where inns and hotels publish their available rooms on a public landing page. Guests browse freely, but must create an account to reserve. Each booking request goes to the inn's staff for approval before it's confirmed. Walk-in guests are handled separately with a direct manual check-in — they never touch the marketplace flow.

Core roles (multi-role, multi-tenant system):

Guest — browses the marketplace without an account, signs in only to book, tracks their reservations, checks in via QR
Inn Staff / Front Desk — reviews and approves/rejects incoming booking requests for their inn, manages walk-ins, handles check-in/out
Inn Admin/Owner — manages their inn's public listing, room types, rates, and staff accounts
System Admin (platform) — onboards new inns onto the marketplace, monitors system health
2. System Architecture
┌──────────────────────┐        REST API (JSON)         ┌───────────────────────┐
│    React Frontend     │ ◄─────────────────────────────► │  Django + DRF Backend  │
│  Public marketplace +  │        JWT Auth (SimpleJWT)      │  (listings, booking    │
│  guest/staff dashboards│                                  │  requests, approvals)  │
└──────────┬─────────────┘                                  └───────────┬────────────┘
           │ QR scan (check-in)                                          │
           ▼                                                             ▼
   Guest mobile browser                                        PostgreSQL (inns, rooms,
   (no app install needed)                                     bookings, approvals)
                                                                          │
                                                                 Celery + Redis
                                                        (approval-pending reminders to
                                                         staff, auto-expire holds,
                                                         guest confirmation emails)
Backend: Django + DRF exposes a versioned REST API. The marketplace listing pages are read-only/public; booking creation and everything staff-facing requires auth and role checks.
Frontend: One React SPA — a public marketplace section (no auth) plus role-gated guest/staff/admin dashboards behind TanStack Router route guards. The "Reserve" action is the point where an unauthenticated guest gets redirected into sign-in/register, with their selected room and dates preserved so they land back on the booking form after auth.
Database: PostgreSQL. Each inn is its own tenant record; rooms, room types, and bookings all foreign-key to a specific Hotel, so staff and public listings are naturally scoped.
QR Codes: Generated only once a booking is approved (not at request time) — encodes a signed token verified on scan.
Background jobs: Celery + Redis handle: releasing an expired pending hold if staff don't act in time, nudging staff about unreviewed requests, and sending guest confirmation/rejection emails.
3. Data Model (Core Entities)
Model	Key Fields	Notes
Hotel	name, slug, address, contact, logo, description, is_active	Public marketplace listing page lives at /inns/{slug}/
User	role (guest/staff/admin/superadmin), hotel (FK, null for guest)	Custom Django user model; guests have no hotel
RoomType	hotel (FK), name, base_rate, capacity, amenities, photos	What shows up as a "listing" on the marketplace
Room	room_type (FK), room_number, status (available/occupied/maintenance)	Physical room instance
Booking	guest (FK), room (FK), check_in, check_out, status, source (marketplace/walk-in), qr_token, hold_expires_at	status: pending_approval → confirmed → checked_in → checked_out → rejected/cancelled/no_show
Payment	booking (FK), amount, method, status	Optional for MVP — can start as "pay at hotel"
GuestRequest	booking (FK), request_type, message, status	Housekeeping, extra towels, late checkout, etc.
Two rules that carry the whole "no double-booking" promise now:

Soft hold on request. The moment a guest submits a pending_approval booking, it still counts as an active hold against that room/date range (hold_expires_at set ~30–60 min out) — otherwise a second guest could request the same dates while the first is awaiting staff review.
Same guarantee as before at confirmation time. A DB-level exclusion constraint on (room, date range) plus a select_for_update() transaction when staff approve a request, so two overlapping approvals can never both succeed even under concurrent staff action.
A scheduled Celery task sweeps expired, unapproved holds every few minutes so abandoned requests don't permanently block a room.

4. Phased Build Plan
Phase 1 — Foundations (Week 1–2)
Django project scaffold, custom User model with roles, DRF + SimpleJWT auth
PostgreSQL setup (Docker Compose for local dev)
React app scaffold (Vite + TanStack Router + Tailwind/Shadcn)
Core models: Hotel (with slug), RoomType, Room
Phase 2 — Public Marketplace (Week 3)
Public, unauthenticated marketplace landing page: browse/search inns and room types by date, guest count, price
Individual inn listing page (/inns/{slug}/) showing rooms, photos, amenities, rates
"Reserve" button triggers the auth gate — unauthenticated guest is routed to sign-in/register, selected room + dates persisted (e.g. in the Zustand store or query params) so they land back on the booking form after login
Phase 3 — Booking Requests & Staff Approval (Week 4–5)
Guest submits a booking request → creates Booking with status=pending_approval and a hold_expires_at
Availability search excludes rooms with an active hold or confirmed overlapping booking
Staff-facing "Pending requests" dashboard, scoped to their own inn, with approve/reject actions
On approval: generate signed QR token, send confirmation email, flip status to confirmed
On rejection: notify guest, release the hold
Celery task to expire unactioned holds and (optionally) remind staff of requests sitting too long
Phase 4 — Check-in, Walk-ins & Guest Requests (Week 6)
QR-based check-in screen for staff (camera scan, manual code entry fallback)
Separate "Quick walk-in booking" form for staff — skips the marketplace/auth/approval flow entirely, creates a booking that goes straight to checked_in
GuestRequest model + staff-facing request queue tied to occupied rooms
Front-desk dashboard: today's arrivals, departures, room status board
Phase 5 — Polish, Reporting, Deployment (Week 7–8)
Basic admin reports: occupancy rate, upcoming arrivals, requests approved vs. rejected, revenue-by-period
Full permission testing — a guest can't hit staff endpoints, staff from Inn A can't see Inn B's requests, etc.
Dockerize backend + frontend; deploy (Render/Railway for Django+Postgres, Vercel for React)
User acceptance testing with an actual small hotel/inn contact if possible — particularly the approval step, since that's the new behavior change from the original plan
5. Suggested API Surface (DRF)
GET    /api/v1/inns/                       # public marketplace listing (search/filter)
GET    /api/v1/inns/{slug}/                # public inn detail page
GET    /api/v1/inns/{slug}/rooms/available/ # query by date range
POST   /api/v1/auth/register/              # guest self-registration
POST   /api/v1/auth/login/                 # returns JWT pair
POST   /api/v1/bookings/                   # guest submits request (status=pending_approval)
POST   /api/v1/bookings/walkin/            # staff-only, direct check-in, no approval step
GET    /api/v1/bookings/{id}/              # booking detail + QR (once confirmed)
GET    /api/v1/staff/requests/pending/     # staff-only, scoped to their hotel
POST   /api/v1/staff/requests/{id}/approve/ # staff-only
POST   /api/v1/staff/requests/{id}/reject/  # staff-only
POST   /api/v1/bookings/{id}/checkin/      # staff-only, validates QR token
POST   /api/v1/bookings/{id}/checkout/     # staff-only
GET    /api/v1/admin/reports/occupancy/    # admin-only
Use DRF's permission_classes + a custom IsHotelStaff/IsHotelAdmin permission class that also checks the request's hotel matches request.user.hotel — this is what keeps Inn A staff from seeing Inn B's pending requests.

6. Key Technical Risks to Address Early
The hold window during pending approval — test explicitly that a second guest can't book the same room/dates while a first request is still pending_approval. This is the biggest behavioral change from a simple booking system.
Expired-hold cleanup — verify the Celery sweep actually releases abandoned pending requests; a stuck hold silently blocks a room indefinitely.
QR token security — sign tokens so they can't be guessed or replayed after checkout; only issue them on approval, not on request.
Auth-gate redirect UX — losing the guest's selected room/dates when they're bounced to sign-in is a classic drop-off point; test that round trip carefully.
Timezone handling — check-in/check-out dates stored/compared consistently (USE_TZ=True, explicit local-time display).
Offline/poor-connectivity front desk use — walk-in entry should degrade gracefully if a lodging's internet is unreliable.
7. Suggested Repo Structure
localstay-management/
├── backend/
│   ├── config/            # Django settings, celery.py
│   ├── accounts/          # custom User model, auth
│   ├── hotels/             # Hotel, RoomType, Room, public marketplace views
│   ├── bookings/           # Booking, GuestRequest, approval logic, QR
│   └── api/                 # DRF routers, serializers, permissions
├── frontend/
│   ├── src/routes/          # TanStack Router route tree (public marketplace + gated dashboards)
│   ├── src/features/        # marketplace/, booking/, staff/, admin/ feature folders
│   ├── src/stores/          # Zustand stores (auth, pending-booking-draft, etc.)
│   └── src/components/ui/   # Shadcn components
└── docker-compose.yml
8. Notes for Presentation/Defense
Demo flow that mirrors the pitch: guest browses marketplace (no login) → selects a room → prompted to sign in → submits request → staff approves from their dashboard → guest gets QR → staff scans to check in. Then show the separate walk-in path to contrast it.
One slide on the pending-hold mechanism specifically — it's the detail that proves you've actually thought through the double-booking problem in a multi-step approval flow, not just at final confirmation.