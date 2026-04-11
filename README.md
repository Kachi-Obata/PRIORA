# Priora

Academic decision-support system for university students. Helps students understand what to do, what they haven't done, and what happens if they don't act.

Built for Babcock University, Computer Science, 200 Level.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (PostgreSQL, Auth, Realtime)
- **Vercel** (hosting)
- **PWA** (push notifications, installable)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- A [Vercel](https://vercel.com) account (free tier)

### Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd priora
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   ```

4. Run the Supabase migrations to set up the database schema (see `supabase/migrations/`).

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
priora/
├── app/                  # Next.js App Router pages and layouts
├── components/           # Reusable UI components
├── lib/                  # Supabase client, utilities, constants
├── public/               # Static assets, manifest.json, service worker
├── supabase/
│   └── migrations/       # SQL migration files for schema setup
├── .env.local            # Environment variables (not committed)
└── PRIORA_BUILD_SPEC.md  # Full build specification
```

## Documentation

See **[PRIORA_BUILD_SPEC.md](./PRIORA_BUILD_SPEC.md)** for the complete build specification — data model, screen layouts, logic, permissions, and all product decisions.

## License

Private. Not open source.
