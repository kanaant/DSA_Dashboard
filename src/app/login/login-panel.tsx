"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Shield, Terminal, Orbit, Radio, Disc } from "lucide-react";
import { gsap } from "gsap";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThreeBackground } from "@/components/ThreeBackground";
import { AGENT_AVATAR, AGENT_NAME } from "@/lib/brand";

export function LoginPanel() {
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error") === "invalid_credentials";

  // GSAP Refs
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax Plane Refs
  const bgGridRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const avatarRingRef = useRef<HTMLDivElement>(null);
  const avatarImageRef = useRef<HTMLImageElement>(null);
  const statusBlockRef = useRef<HTMLDivElement>(null);
  const consoleDeckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Staggered Entrance Animations with Custom Blur & Scale transitions
    const ctx = gsap.context(() => {
      // Set initial values
      gsap.set(avatarRingRef.current, {
        scale: 0.6,
        rotation: -180,
        opacity: 0,
      });

      gsap.set(avatarImageRef.current, {
        scale: 1.3,
        opacity: 0,
      });

      gsap.set(".animate-hero-text", {
        opacity: 0,
        y: 20,
        filter: "blur(10px)",
      });

      gsap.set(statusBlockRef.current, {
        opacity: 0,
        scaleY: 0,
        transformOrigin: "top",
      });

      gsap.set(consoleDeckRef.current, {
        opacity: 0,
        y: 80,
        scale: 0.98,
        filter: "blur(12px)",
      });

      // Play high-end sequential timeline
      const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.4 } });

      tl.to(avatarRingRef.current, {
        scale: 1,
        rotation: 0,
        opacity: 1,
        duration: 1.6,
        ease: "back.out(1.1)",
      })
        .to(
          avatarImageRef.current,
          {
            scale: 1,
            opacity: 1,
            duration: 1.2,
          },
          "-=1.0"
        )
        .to(
          ".animate-hero-text",
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: 0.15,
            duration: 1.0,
          },
          "-=0.8"
        )
        .to(
          statusBlockRef.current,
          {
            opacity: 1,
            scaleY: 1,
            duration: 0.8,
            ease: "power2.out",
          },
          "-=0.6"
        )
        .to(
          consoleDeckRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.4,
            ease: "back.out(1.2)",
          },
          "-=0.8"
        );
      
      // Infinite gentle rotation on the HUD orbit border
      gsap.to(".hud-orbit-spin", {
        rotation: 360,
        duration: 30,
        repeat: -1,
        ease: "none",
      });

      gsap.to(".hud-orbit-spin-reverse", {
        rotation: -360,
        duration: 20,
        repeat: -1,
        ease: "none",
      });
    }, containerRef);

    // 2. Immersive 3D Spatial Parallax (Elements offset on separate planes)
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Calculate tilt percentages (-0.5 to 0.5)
      const xPercent = clientX / innerWidth - 0.5;
      const yPercent = clientY / innerHeight - 0.5;

      // Shift elements on different depth planes
      // Deep background shifts slightly
      gsap.to(bgGridRef.current, {
        x: xPercent * -15,
        y: yPercent * -15,
        duration: 0.8,
        ease: "power2.out",
        overwrite: "auto",
      });

      // Midground Hero & Avatar shift prominently
      gsap.to(heroRef.current, {
        x: xPercent * 25,
        y: yPercent * 25,
        rotateX: -yPercent * 6,
        rotateY: xPercent * 6,
        duration: 0.6,
        ease: "power2.out",
        overwrite: "auto",
      });

      // Foreground Console Deck shifts at a different pace
      gsap.to(consoleDeckRef.current, {
        x: xPercent * 14,
        y: yPercent * 14,
        rotateX: -yPercent * 3,
        rotateY: xPercent * 3,
        duration: 0.7,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const handleMouseLeave = () => {
      // Smoothly reset all layers to absolute center
      gsap.to([bgGridRef.current, heroRef.current, consoleDeckRef.current], {
        x: 0,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        duration: 1.0,
        ease: "power3.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      ctx.revert();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-between items-center [perspective:1500px]"
    >
      {/* Immersive 3D interactive particle background */}
      <ThreeBackground />

      {/* Deep Background Grid Overlay */}
      <div 
        ref={bgGridRef}
        className="absolute inset-0 -z-5 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top spacing / subtle indicator */}
      <header className="w-full max-w-7xl flex justify-between items-center select-none opacity-60 text-xs font-semibold uppercase tracking-[0.25em] text-[#00d4ff] pt-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 animate-pulse" />
          DarkSenses Labs Space
        </div>
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-ping" />
          Neural Link Active
        </div>
      </header>

      {/* CENTER STAGE: AGENT HERO CARD */}
      <section
        ref={heroRef}
        className="my-auto flex flex-col items-center text-center max-w-2xl select-none [transform-style:preserve-3d] mt-12 mb-8 relative z-20"
      >
        {/* Glowing Cybernetic HUD Avatar Frame */}
        <div 
          ref={avatarRingRef}
          className="relative mb-8 w-44 h-44 flex items-center justify-center [transform-style:preserve-3d]"
        >
          {/* External Orbital Circles */}
          <div className="absolute inset-0 rounded-full border border-dashed border-[#00d4ff]/30 hud-orbit-spin pointer-events-none" />
          <div className="absolute -inset-4 rounded-full border border-double border-[#8b5cf6]/20 hud-orbit-spin-reverse pointer-events-none" />
          
          {/* Tech HUD decorative reticles */}
          <div className="absolute -inset-2 flex items-center justify-between pointer-events-none opacity-40">
            <div className="w-2.5 h-6 border-l-2 border-t-2 border-[#00d4ff] rounded-tl-sm" />
            <div className="w-2.5 h-6 border-r-2 border-t-2 border-[#00d4ff] rounded-tr-sm" />
          </div>
          <div className="absolute -inset-2 flex items-end justify-between pointer-events-none opacity-40">
            <div className="w-2.5 h-6 border-l-2 border-b-2 border-[#00d4ff] rounded-bl-sm" />
            <div className="w-2.5 h-6 border-r-2 border-b-2 border-[#00d4ff] rounded-br-sm" />
          </div>

          {/* Inner Glowing Backdrop */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-[#8b5cf6]/30 via-transparent to-[#00d4ff]/30 blur-md pointer-events-none" />

          {/* Solid Glowing Core */}
          <div className="absolute inset-1.5 rounded-full border-2 border-[#00d4ff]/60 shadow-[0_0_25px_rgba(0,212,255,0.4)] pointer-events-none z-10" />

          {/* The Agent Image */}
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-white/15 bg-slate-900 shadow-inner">
            <img
              ref={avatarImageRef}
              src={AGENT_AVATAR}
              alt={`${AGENT_NAME} avatar`}
              className="w-full h-full object-cover grayscale opacity-90 brightness-95 scale-[1.02] transition-all duration-300"
              style={{
                filter: "drop-shadow(0 0 15px rgba(139,92,246,0.3))"
              }}
            />
          </div>

          {/* Core Telemetry Node */}
          <div className="absolute -bottom-1 right-2 w-6 h-6 rounded-full bg-[#050816] border border-[#00d4ff] flex items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.3)] z-20">
            <Orbit className="w-3.5 h-3.5 text-[#00d4ff] animate-spin" style={{ animationDuration: "12s" }} />
          </div>
        </div>

        {/* Space and Title block */}
        <div className="space-y-3">
          <div className="animate-hero-text inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.6em] text-[#00d4ff]/90">
            <Disc className="h-3 w-3 animate-spin text-[#8b5cf6]" style={{ animationDuration: "8s" }} />
            DarkSenses Labs Space
          </div>
          
          <h1
            className="animate-hero-text text-6xl sm:text-8xl font-black tracking-tighter leading-none select-none text-white"
            style={{
              textShadow: "0 0 40px rgba(139,92,246,0.18)",
            }}
          >
            {AGENT_NAME}
          </h1>

          {/* Agent Narrative Telemetry Block */}
          <div className="animate-hero-text max-w-xl mx-auto mt-4 px-4">
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-medium">
              {AGENT_NAME} is the core synthetic cognitive intelligence designed within the DarkSenses neural framework. Deployed to manage and orchestrate the live operations control room.
            </p>
          </div>
        </div>

        {/* Technical Status Telemetry Deck */}
        <div
          ref={statusBlockRef}
          className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 border-y border-white/10 bg-slate-950/20 px-8 py-3 rounded-xl backdrop-blur-sm text-xs font-semibold tracking-wider text-slate-400 select-none"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            CLASS: COGNITIVE SHELL
          </div>
          <span className="hidden sm:inline text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
            HANDSHAKE: WAITING
          </div>
          <span className="hidden sm:inline text-white/20">|</span>
          <div className="flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-slate-500" />
            CLEARANCE: LEVEL 9
          </div>
        </div>
      </section>

      {/* BOTTOM PORTION: SECURE CONSOLE DECK */}
      <footer 
        ref={consoleDeckRef}
        className="w-full max-w-2xl bg-slate-950/45 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-[0_25px_65px_rgba(2,6,23,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl [transform-style:preserve-3d] select-none relative z-20 mb-2"
      >
        {/* Subtle glowing beams */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/70 to-transparent" />
        
        {/* Compact Side-by-Side Console Input form */}
        <form action="/api/auth/login" method="post" className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 w-full">
          
          <div className="flex-1 space-y-1.5 text-left">
            <label htmlFor="username" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 pl-1">
              OPERATOR CODE
            </label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              placeholder="operator ID"
              className="h-10 bg-black/40 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/20 transition-all duration-300 pl-3.5 text-sm"
            />
          </div>

          <div className="flex-1 space-y-1.5 text-left">
            <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 pl-1">
              ACCESS DECRYPT KEY
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              className="h-10 bg-black/40 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus:border-[#00d4ff] focus:ring-[#00d4ff]/20 transition-all duration-300 pl-3.5 text-sm"
            />
          </div>

          <div className="pt-2 sm:pt-0">
            <Button 
              type="submit" 
              className="w-full sm:w-auto h-10 bg-gradient-to-r from-[#8b5cf6] to-[#00d4ff] text-white font-semibold rounded-xl px-6 shadow-[0_4px_15px_rgba(139,92,246,0.25)] hover:shadow-[0_6px_22px_rgba(139,92,246,0.38)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-none cursor-pointer flex items-center justify-center gap-2 group text-sm"
            >
              Secure Login
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </form>

        {/* Error Alert Display */}
        {hasError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 mt-4 shadow-[0_0_10px_rgba(244,63,94,0.06)] flex items-center gap-2 text-left transition-all duration-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
            <span>Authorization failed. Secure gateway access denied. Verify operator code.</span>
          </div>
        ) : null}

        {/* Footer Deck stats */}
        <div className="flex items-center justify-between border-t border-white/5 mt-4 pt-3.5 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            System Locked
          </span>
          <span className="font-semibold uppercase tracking-wider text-slate-400">
            Authentication Required
          </span>
        </div>
      </footer>
    </main>
  );
}
