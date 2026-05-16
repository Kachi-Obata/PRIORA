import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { checkBodySize, MAX_PUSH_SUBS_PER_USER } from "@/lib/api-guard";

// Known browser push service host suffixes.
// Chrome → FCM (fcm.googleapis.com or updates.push.services.mozilla.com for Firefox),
// Safari → Apple push (*.push.apple.com). All legitimate services use HTTPS.
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",
  "fcm.google.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "web.push.apple.com",
  // Edge / Windows push
  "notify.windows.com",
  "wns2-bn1p.notify.windows.com",
];

function isValidPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return false;
    return PUSH_SERVICE_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const sizeError = checkBodySize(request.headers);
  if (sizeError) return sizeError;

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subscription?: PushSubscriptionJSON };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body.subscription;
  if (!sub || !sub.endpoint) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
  }

  // SSRF guard: the endpoint must be a valid https:// URL pointing to a
  // known browser push service. We never want the server to make HTTP requests
  // to arbitrary internal or external hosts.
  if (!isValidPushEndpoint(sub.endpoint)) {
    return NextResponse.json({ error: "Invalid push endpoint" }, { status: 400 });
  }

  // Cap subscriptions per user — prevents a logged-in account from flooding
  // the table and causing push fanouts to time out.
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count !== null && count >= MAX_PUSH_SUBS_PER_USER) {
    return NextResponse.json(
      { error: "Too many push subscriptions for this account." },
      { status: 429 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      subscription: sub,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await request.json().catch(() => ({ endpoint: null }));
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
