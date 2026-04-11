import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, icons, manifest, sw.js (PWA assets)
     * - any file with an extension (svg/png/…)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\..*).*)",
  ],
};
