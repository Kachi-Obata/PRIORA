// Web Push dispatcher. Server-side only — uses the `web-push` library with
// VAPID keys. Reads subscriptions from Supabase and drops any that return
// a 404/410 "gone" status.
import "server-only";
import webpush from "web-push";
import { getSupabaseServiceRole } from "./supabase/server";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@priora.app";
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const priv = process.env.VAPID_PRIVATE_KEY!;
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Coalesce repeated notifications of the same kind. */
  tag?: string;
}

/**
 * Send a push payload to every subscription belonging to the given user IDs.
 * Expired subscriptions are removed from the DB.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; dropped: number }> {
  if (userIds.length === 0) return { sent: 0, dropped: 0 };
  ensureVapid();
  const supa = getSupabaseServiceRole();

  const { data: subs } = await supa
    .from("push_subscriptions")
    .select("id, subscription, endpoint")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return { sent: 0, dropped: 0 };

  const body = JSON.stringify(payload);
  const toDelete: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, body);
        sent += 1;
      } catch (err: any) {
        // 404/410 means the subscription is gone — clean up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          toDelete.push(row.id);
        }
      }
    }),
  );

  if (toDelete.length > 0) {
    await supa.from("push_subscriptions").delete().in("id", toDelete);
  }

  return { sent, dropped: toDelete.length };
}
