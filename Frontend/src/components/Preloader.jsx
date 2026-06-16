import { useEffect, useState } from "react";

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("enter"); // enter | loading | done | exit
  const [displayNum, setDisplayNum] = useState(0);
  //

  // Phase: enter
  useEffect(() => {
    const t = setTimeout(() => setPhase("loading"), 400);
    return () => clearTimeout(t);
  }, []);

  // Progress ticker
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        const step = prev < 30 ? 2.5 : prev < 70 ? 1.2 : prev < 90 ? 0.8 : 2;
        return Math.min(prev + step, 100);
      });
    }, 28);
    return () => clearInterval(interval);
  }, [phase]);

  // Smooth display number
  useEffect(() => {
    const target = Math.round(progress);
    if (displayNum === target) return;
    const step = target > displayNum ? 1 : -1;
    const t = setTimeout(() => {
      setDisplayNum((n) => n + step);
    }, 18);
    return () => clearTimeout(t);
  }, [progress, displayNum]);

  // Completion sequence
  useEffect(() => {
    if (progress < 100) return;
    setTimeout(() => setPhase("done"), 200);
    setTimeout(() => setPhase("exit"), 900);
    setTimeout(() => onComplete(), 1000);
  }, [progress]);

  const isExit = phase === "exit";
  const isDone = phase === "done" || phase === "exit";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: isExit ? "transparent" : "#080c1a",
      display: "flex",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", fontFamily: "'DM Sans', sans-serif",
      pointerEvents: isExit ? "none" : "all",
    }}>
      {/* Ambient grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(#4f6ef7 1px, transparent 1px), linear-gradient(90deg, #4f6ef7 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        transition: "opacity 0.6s ease",
      }} />

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,110,247,0.08) 0%, transparent 70%)",
        animation: "pp-breathe 3s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Curtain panels */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "50%", height: "100%",
        background: "#0d1327",
        transform: isExit ? "translateX(-101%)" : "translateX(0)",
        transition: "transform 0.75s cubic-bezier(0.76,0,0.24,1)",
        zIndex: 2,
      }} />
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "50%", height: "100%",
        background: "#0d1327",
        transform: isExit ? "translateX(101%)" : "translateX(0)",
        transition: "transform 0.75s cubic-bezier(0.76,0,0.24,1)",
        zIndex: 2,
      }} />

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 3,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 0,
        opacity: isDone ? 0 : 1,
        transform: isDone ? "translateY(-20px) scale(0.96)" : "translateY(0) scale(1)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>

        {/* Orbit ring + logo */}
        <div style={{ position: "relative", width: 96, height: 96, marginBottom: 28 }}>
          {/* Spinning orbit */}
          <svg width="96" height="96" style={{
            position: "absolute", inset: 0,
            animation: "pp-spin 2.4s linear infinite",
          }}>
            <circle cx="48" cy="48" r="44"
              fill="none" stroke="rgba(79,110,247,0.15)" strokeWidth="1" />
            <circle cx="48" cy="4" r="4"
              fill="#4f6ef7" opacity="0.9" />
          </svg>
          {/* Counter-spin ring */}
          <svg width="96" height="96" style={{
            position: "absolute", inset: 0,
            animation: "pp-spin-rev 3.6s linear infinite",
          }}>
            <circle cx="48" cy="48" r="36"
              fill="none" stroke="rgba(79,110,247,0.08)" strokeWidth="1"
              strokeDasharray="4 8" />
            <circle cx="48" cy="12" r="3"
              fill="#a5b4fc" opacity="0.6" />
          </svg>
          {/* Logo box */}
          <div style={{
            position: "absolute", inset: "50%",
            transform: "translate(-50%,-50%)",
            width: 56, height: 56,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 0 32px rgba(79,110,247,0.35)",
            animation: "pp-logopulse 2s ease-in-out infinite",
          }}>
            <img
              src="/src/assets/placementpro.png"
              alt="PlacementPro"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* Brand */}
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "1.9rem", fontWeight: 700,
          letterSpacing: "-0.02em", lineHeight: 1,
          marginBottom: 8,
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(10px)" : "translateY(0)",
          transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
        }}>
          <span style={{ color: "#ffffff" }}>Placement</span>
          <span style={{ color: "#4f6ef7" }}>Pro</span>
        </div>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.72rem", color: "#3a4a70",
          letterSpacing: "0.18em", textTransform: "uppercase",
          marginBottom: 40,
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.6s ease 0.4s",
        }}>
          Your career starts here
        </p>

        {/* Progress bar */}
        <div style={{
          width: 220, height: 2,
          background: "#111830", borderRadius: 2,
          overflow: "hidden", marginBottom: 12,
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.4s ease 0.5s",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${progress}%`,
            background: "linear-gradient(90deg, #3a56d4, #4f6ef7, #818cf8)",
            transition: "width 0.1s linear",
            boxShadow: "0 0 12px rgba(79,110,247,0.6)",
            position: "relative",
          }}>
            {/* Shimmer dot at tip */}
            <div style={{
              position: "absolute", right: 0, top: "50%",
              transform: "translateY(-50%)",
              width: 6, height: 6, borderRadius: "50%",
              background: "#a5b4fc",
              boxShadow: "0 0 8px #a5b4fc",
            }} />
          </div>
        </div>

        {/* Counter row */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", width: 220,
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.4s ease 0.6s",
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.7rem", color: "#2a3660",
            letterSpacing: "0.1em",
          }}>
            {progress < 30 ? "Initializing..." : progress < 60 ? "Loading modules..." : progress < 90 ? "Almost ready..." : "Launching..."}
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem", color: "#4f6ef7",
            letterSpacing: "0.05em",
          }}>
            {displayNum}%
          </span>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes pp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pp-spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes pp-breathe {
          0%,100% { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          50%      { transform: translate(-50%,-50%) scale(1.15); opacity:0.6; }
        }
        @keyframes pp-logopulse {
          0%,100% { box-shadow: 0 0 32px rgba(79,110,247,0.35); }
          50%      { box-shadow: 0 0 48px rgba(79,110,247,0.6); }
        }
      `}</style>
    </div>
  );
};

export default Preloader;