import { redirect } from "next/navigation"

// This route used to duplicate "Offline Dr" with its own implementation that
// called the network API and had no offline fallback at all - despite
// branding itself "Works Offline • No Internet Required". The real,
// genuinely-offline implementation (client-side triage-engine, no network
// calls) lives at /check-symptoms and is what the dashboard nav links to.
export default function LegacySymptomCheckerRedirect() {
  redirect("/check-symptoms")
}
