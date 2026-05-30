import { Suspense } from "react";

import { LoginPanel } from "./login-panel";

function LoginFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center bg-[#02040a]">
      {/* Visual match to the loaded state */}
      <div
        className="absolute inset-0 -z-10 h-full w-full"
        style={{
          background: `
            radial-gradient(circle at 40% 20%, rgba(139, 92, 246, 0.12), transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.08), transparent 40%),
            linear-gradient(180deg, #02040a 0%, #050816 100%)
          `,
        }}
      />
      <div className="relative mx-auto flex w-full max-w-lg items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-8 py-10 text-sm font-semibold tracking-wide text-slate-300 shadow-[0_30px_80px_rgba(2,6,23,0.85),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00d4ff] animate-ping" />
          Establishing Secure Handshake...
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPanel />
    </Suspense>
  );
}
