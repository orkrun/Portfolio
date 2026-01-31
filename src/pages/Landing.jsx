import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);    
  const [entering, setEntering] = useState(false); 

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    if (entering || exiting) return;

    setExiting(true);

   
    setTimeout(() => setEntering(true), 160);

  
    setTimeout(() => {
      navigate("/world");
    }, 520);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center bg-black text-white overflow-hidden">
      {/* subtle background glow */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          exiting ? "opacity-0" : "opacity-35"
        }`}
      >
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-yellow-500 blur-[150px]" />
        <div className="absolute -bottom-48 -right-48 w-[520px] h-[520px] rounded-full bg-blue-500 blur-[170px]" />
      </div>

      {/* vignette */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/55" />
      </div>

      {/* ✅ Fade-out overlay (page kararsın) */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 bg-black transition-opacity duration-500 ${
          exiting ? "opacity-70" : "opacity-0"
        }`}
      />

      {/* Entering overlay */}
      <div
        className={`absolute inset-0 z-30 grid place-items-center transition-opacity duration-200 ${
          entering ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-white/25 border-t-yellow-500 animate-spin" />
          <div className="text-sm tracking-wide text-gray-200">Entering world…</div>
          <div className="h-1 w-[220px] rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/2 bg-yellow-500/80 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Center content (animated) */}
      <div
        className={`relative z-10 flex flex-col items-center px-6 text-center transition-all duration-700 ease-out
        ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        ${exiting ? "opacity-0 -translate-y-2 scale-[0.98]" : ""}`}
      >
        <div
          className={`text-xs tracking-[0.25em] uppercase text-gray-400 mb-3 transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          Interactive 3D
        </div>

        <h1
          className={`text-5xl sm:text-6xl font-extrabold text-yellow-500 mb-4 leading-tight transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
          style={{ textShadow: "0 0 26px rgba(245, 158, 11, 0.22)" }}
        >
          Step Into My World
        </h1>

        <p
          className={`mb-7 text-gray-300 max-w-xl leading-relaxed transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          Walk the space, discover projects, and interact with objects to learn more.
        </p>

        {/* ✅ Clean Neon Button (hover fix) */}
        <button
          onClick={handleEnter}
          disabled={entering || exiting}
          className={`group relative rounded-xl transition-transform duration-200 ${
            entering || exiting ? "cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-[0.99]"
          }`}
        >
          {/* ring + glow (clean) */}
          <span
            className={`absolute inset-0 rounded-xl ring-1 transition-all duration-200
              ${entering || exiting ? "ring-yellow-500/35" : "ring-yellow-500/55 group-hover:ring-yellow-400/90"}
            `}
            style={{
              boxShadow:
                entering || exiting
                  ? "0 0 18px rgba(245,158,11,0.12)"
                  : "0 0 16px rgba(245,158,11,0.10)",
            }}
          />

          {/* soft glow on hover */}
          <span
            className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 ${
              entering || exiting ? "" : "group-hover:opacity-100"
            }`}
            style={{
              boxShadow: "0 0 34px rgba(245,158,11,0.22)",
            }}
          />

          {/* button face */}
          <span
            className={`relative block rounded-xl px-8 py-3 font-semibold text-black transition-colors duration-200
              ${entering || exiting ? "bg-yellow-600/60" : "bg-yellow-500 group-hover:bg-yellow-400"}
            `}
          >
            {entering || exiting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Entering…
              </span>
            ) : (
              "Enter World"
            )}
          </span>
        </button>

        <p
          className={`mt-4 text-xs text-gray-500 transition-all duration-700 delay-150 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          Tip: Press <span className="text-gray-200 font-semibold">E</span> near objects to interact
        </p>
      </div>

      {/* Bottom-left: Controls */}
      <div
        className={`absolute left-4 bottom-4 z-20 w-[min(380px,92vw)] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3
        transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
      >
        <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Controls</div>
        <ul className="text-sm text-gray-200/90 space-y-1">
          <li>
            <span className="font-semibold text-gray-100">W A S D</span> — Move
          </li>
          <li>
            <span className="font-semibold text-gray-100">Shift</span> — Run
          </li>
          <li>
            <span className="font-semibold text-gray-100">Right Click + Drag</span> — Look around
          </li>
          <li>
            <span className="font-semibold text-gray-100">Scroll</span> — Zoom
          </li>
          <li>
            <span className="font-semibold text-gray-100">E</span> — Interact
          </li>
          <li>
            <span className="font-semibold text-gray-100">Esc</span> — Close / Exit
          </li>
        </ul>
      </div>

      {/* Bottom-right: Under development */}
      <div
        className={`absolute right-4 bottom-4 z-20 w-[min(420px,92vw)] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3
        transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
      >
        <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Note</div>
        <p className="text-sm text-gray-200/90 leading-relaxed">
          This portfolio is still under active development. Some features may change or be incomplete.
        </p>
      </div>

      {/* Bottom-center: Copyright */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-2 z-20 text-[11px] text-gray-500
        transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
      >
        © 2026 Orkun Efe Özdemir
      </div>
    </div>
  );
}
