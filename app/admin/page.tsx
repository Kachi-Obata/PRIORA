import { requireAdminProfile } from "@/lib/profile";
import { loadAdminData } from "@/lib/data/admin";
import AppShell from "@/components/AppShell";
import AdminActions from "@/components/admin/AdminActions";
import ActivityLog from "@/components/admin/ActivityLog";

export const metadata = { title: "Admin · Priora" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireAdminProfile();
  const data = await loadAdminData(profile.id, profile.role, profile.group);

  return (
    <AppShell role={profile.role}>
      <header className="pt-4 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Post tasks, log class sessions, and keep course settings current.
        </p>
      </header>

      <AdminActions
        courses={data.courses}
        settings={data.settings}
        adminId={profile.id}
        // Master admin bypasses all group filtering — they can post for any
        // group and log sessions for any group. Group-scoped admins (rep,
        // assistant_rep) remain restricted to their own group.
        adminGroup={profile.role === "master_admin" ? null : profile.group}
        // The admin's personal group — used to pre-select their own group
        // in the Post Task form even when they're a master_admin.
        personalGroup={profile.group}
      />

      <section className="mt-8">
        <h2 className="section-header">Recent activity</h2>
        <ActivityLog entries={data.activity} />
      </section>
    </AppShell>
  );
}
