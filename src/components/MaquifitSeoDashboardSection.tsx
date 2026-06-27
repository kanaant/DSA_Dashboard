import { CheckCircle2, Globe2, Loader2, Search, ServerCog, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CredentialState = {
  label: string;
  helper: string;
  present: boolean;
};

function getCredentialStates(): CredentialState[] {
  return [
    {
      label: "WordPress token",
      helper: "Read/write auth for the site API",
      present: Boolean(process.env.WP_TOKEN),
    },
    {
      label: "WooCommerce consumer key",
      helper: "Primary WooCommerce API access",
      present: Boolean(process.env.WOOCOMMERCE_CONSUMER_KEY),
    },
    {
      label: "WooCommerce consumer secret",
      helper: "Paired WooCommerce API secret",
      present: Boolean(process.env.WOOCOMMERCE_CONSUMER_SECRET),
    },
    {
      label: "SSH host",
      helper: "Host for remote command line access",
      present: Boolean(process.env.MAQUIFIT_SSH_HOST),
    },
    {
      label: "SSH port",
      helper: "Port for remote command line access",
      present: Boolean(process.env.MAQUIFIT_SSH_PORT),
    },
    {
      label: "SSH user",
      helper: "User for remote command line access",
      present: Boolean(process.env.MAQUIFIT_SSH_USER),
    },
    {
      label: "SSH pass",
      helper: "Password/key for remote command line access",
      present: Boolean(process.env.MAQUIFIT_SSH_PASS),
    },
    {
      label: "WP API URL",
      helper: "WordPress MCP Adapter API endpoint URL",
      present: Boolean(process.env.WP_API_URL),
    },
    {
      label: "WP API username",
      helper: "Username for WordPress MCP Adapter API",
      present: Boolean(process.env.WP_API_USERNAME),
    },
    {
      label: "MCP user key",
      helper: "Password/key for WordPress MCP Adapter API",
      present: Boolean(process.env.WP_API_PASSWORD),
    },
  ];
}

export function MaquifitSeoDashboardSection() {
  const credentialStates = getCredentialStates();
  const configuredCount = credentialStates.filter((state) => state.present).length;

  return (
    <section id="maquifit-seo" className="scroll-mt-24">
      <Card className="relative overflow-hidden rounded-2xl border-white/10 bg-slate-950/45 shadow-[0_20px_50px_rgba(2,6,23,0.7)] backdrop-blur-2xl select-none">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22c55e]/50 to-transparent" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-wide text-white">
                <Search className="h-5 w-5 text-[#4ade80]" />
                MaquiFit SEO
              </CardTitle>
              <CardDescription className="text-slate-400">
                Scaffolded control surface for future WordPress, WooCommerce, SSH, and MCP SEO tooling. No SEO data is loaded yet.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Readiness check only
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Globe2 className="h-4 w-4 text-[#4ade80]" />
                Connection readiness
              </div>
              <div className="mt-2 text-sm leading-relaxed text-slate-400">
                This section is intentionally empty of live SEO content for now. It only confirms that the integration credentials are present and leaves the actual dashboard widgets for the next pass.
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Configured</div>
                  <div className="mt-1 text-3xl font-extrabold text-white tracking-tight">
                    {configuredCount} <span className="text-sm font-semibold text-slate-500">/ {credentialStates.length}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status</div>
                  <div className="mt-1 text-xl font-extrabold text-white tracking-tight">Scaffolded</div>
                  <div className="mt-1 text-[11px] text-slate-500">Waiting for SEO widgets</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {credentialStates.map((credential) => (
                <div
                  key={credential.label}
                  className={`rounded-2xl border p-4 transition-colors duration-200 ${
                    credential.present
                      ? "border-emerald-400/20 bg-emerald-400/10"
                      : "border-amber-400/20 bg-amber-400/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">{credential.label}</div>
                      <div className="mt-1 text-xs leading-relaxed text-slate-400">{credential.helper}</div>
                    </div>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${credential.present ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                      {credential.present ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {credential.present ? "Configured" : "Missing"}
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ServerCog className="h-4 w-4 text-[#4ade80]" />
                  Next build step
                </div>
                <div className="mt-2 text-sm leading-relaxed text-slate-400">
                  Once you confirm the environment is correct, this area can be expanded into live SEO pulls, Rank Math controls, and write workflows.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
