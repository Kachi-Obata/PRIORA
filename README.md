# Priora
Build to let students know how many classes they can comfortably miss without being disallowed from exams — we love to stick it to the system lol.

Academic decision-support PWA for university students. Tracks tasks, attendance, and deadlines — with push notifications, offline support, and role-based admin tools.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database / Auth | Supabase (PostgreSQL, RLS, Realtime) |
| Hosting | Vercel |
| Error monitoring | Sentry |
| PWA | Service Worker, Web Push (VAPID) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account
- A [Sentry](https://sentry.io) project (Next.js)

### 1 — Clone and install

```bash
git clone <repo-url>
cd priora
npm install
```

### 2 — Environment variables

Create a `.env.local` file in the project root (see `.env.example` for all required keys):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Web Push (VAPID)
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Cron job authentication
CRON_SECRET=a_long_random_secret

# Sentry (optional locally — errors only sent in production)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

> **Never commit `.env.local`.** It is listed in `.gitignore`.

### 3 — Database setup

Run the migrations in order against your Supabase project:

```bash
supabase db push
```

Or apply each file in `supabase/migrations/` manually via the Supabase dashboard SQL editor, then run `supabase/seed.sql` to populate the initial data.

### 4 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
priora/
├── app/                        # Next.js App Router pages and layouts
│   ├── api/                    # API routes (tasks, attendance, push, cron)
│   ├── admin/                  # Admin page (reps + master admin)
│   ├── attendance/             # Attendance tracking page
│   ├── login/                  # Auth (sign in + sign up)
│   ├── onboarding/             # First-run name + group selection
│   └── offline/                # Offline fallback page (pre-cached by SW)
├── components/                 # Reusable UI components
│   ├── admin/                  # Admin-specific components
│   └── attendance/             # Attendance-specific components
├── lib/                        # Shared utilities
│   ├── supabase/               # Supabase client (server + browser)
│   ├── audit.ts                # Server-side audit logging
│   ├── api-guard.ts            # Request validation and error sanitization
│   ├── attendance.ts           # Attendance computation logic
│   ├── constants.ts            # Roles, groups, labels
│   └── types.ts                # Shared TypeScript types
├── public/
│   ├── sw.js                   # Service worker (offline caching + push)
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # App icons
├── supabase/
│   ├── migrations/             # SQL migration files (run in order)
│   └── seed.sql                # Initial data
├── sentry.client.config.ts     # Sentry browser initialisation
├── sentry.server.config.ts     # Sentry server initialisation
├── sentry.edge.config.ts       # Sentry edge runtime initialisation
├── instrumentation.ts          # Next.js instrumentation hook
├── .env.local                  # Environment variables (not committed)
└── .env.example                # Environment variable reference
```

## Roles

| Role | Permissions |
|---|---|
| `student` | View tasks and attendance for their group |
| `rep` | All student permissions + post tasks + log sessions for their group |
| `assistant_rep` | Same as rep |
| `master_admin` | Full access across all groups |

Roles are assigned directly in the database. There is no self-service role upgrade.

## License

Private. Not open source.
