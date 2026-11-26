"use client";
import { config, rewards } from "@/lib/content";
import { useState } from "react";
import { useApp } from "./AppProvider";
// Small SVG / CSS visuals. Everything is vector, so it works offline and looks sharp.

export function Mascot({ mood = "happy", size = 110 }) {
  const { state } = useApp();
  const hat = rewards.hats.find((h) => h.id === state.child?.hat)?.emoji;
  const custom = config.mascot?.images?.[mood] ?? config.mascot?.images?.happy;
  if (custom) return <img className={`mascot ${mood}`} src={custom} width={size} height={size} alt="Bloom" />;
  const mouth = mood === "think" ? "M42 70 q8 -2 16 0" : mood === "cheer" ? "M38 64 q12 16 24 0 z" : "M40 66 q10 10 20 0";
  return (
    <svg className={`mascot ${mood}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Bloom">
      <g className="sprout">
        <path d="M50 28 C50 14 40 8 28 10 C28 22 36 30 50 28Z" fill="#3bb273" />
        <path d="M50 28 C50 12 62 6 74 10 C74 24 64 30 50 28Z" fill="#5fd391" />
      </g>
      <ellipse cx="50" cy="62" rx="32" ry="30" fill="#ffb347" />
      {hat && <text x="50" y="40" fontSize="30" textAnchor="middle">{hat}</text>}
      <ellipse cx="50" cy="62" rx="32" ry="30" fill="none" stroke="#e8902a" strokeWidth="3" />
      <g className="eyes">
        <circle cx="38" cy="54" r="5" fill="#2b2a33" />
        <circle cx="62" cy="54" r="5" fill="#2b2a33" />
        <circle cx="40" cy="52" r="1.6" fill="#fff" />
        <circle cx="64" cy="52" r="1.6" fill="#fff" />
      </g>
      <circle cx="30" cy="66" r="5" fill="#ff8e72" opacity=".6" />
      <circle cx="70" cy="66" r="5" fill="#ff8e72" opacity=".6" />
      <path d={mouth} fill={mood === "cheer" ? "#b3261e" : "none"} stroke="#2b2a33" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// A flower that grows with `stage` 0..5 (stem, leaves, then petals).
export function Flower({ stage = 0, size = 96, color = "#ff7a59" }) {
  const petals = Math.max(0, Math.min(8, (stage - 2) * 2 + 2));
  const rot = (i, n) => (360 / n) * i;
  return (
    <svg className="flower" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`stage ${stage}`}>
      <ellipse cx="50" cy="92" rx="22" ry="5" fill="#d9c7a6" />
      {stage >= 0 && <circle cx="50" cy="86" r="4" fill="#8a5a2b" />}
      {stage >= 1 && <path d="M50 86 L50 52" stroke="#3bb273" strokeWidth="5" strokeLinecap="round" />}
      {stage >= 2 && <path d="M50 74 C34 74 28 64 28 58 C42 58 50 64 50 74Z" fill="#5fd391" />}
      {stage >= 3 && <path d="M50 68 C66 68 72 58 72 52 C58 52 50 58 50 68Z" fill="#3bb273" />}
      {stage >= 3 &&
        Array.from({ length: petals }, (_, i) => (
          <ellipse key={i} cx="50" cy="38" rx="7" ry="13" fill={color} transform={`rotate(${rot(i, petals)} 50 50)`} opacity=".95" />
        ))}
      {stage >= 3 && <circle cx="50" cy="50" r="8" fill="#ffd34d" />}
      {stage < 3 && stage >= 1 && <circle cx="50" cy="50" r="5" fill="#9be3b5" />}
    </svg>
  );
}

export function Confetti({ n = 36 }) {
  const colors = ["#ff7a59", "#ffd34d", "#3bb273", "#5aa9ff", "#c06cff"];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.12}s`,
            animationDuration: `${1.8 + (i % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// A picture: a real image if the data has an `image` path, otherwise a big emoji.
export function Pic({ pic, size = "5rem", alt = "" }) {
  if (!pic) return null;
  if (pic.image) return <img className="pic framed" src={pic.image} alt={alt} style={{ width: size, height: size }} />;
  return (
    <span className="picframe" style={{ fontSize: size }}>
      <AnimEmoji emoji={pic.emoji} alt={alt} />
    </span>
  );
}

// Optional: Google's animated Noto emoji (needs internet; falls back to the normal emoji). Off by default,
// switch on with config.animatedEmoji.enabled. Noto Emoji is CC BY 4.0.
export function AnimEmoji({ emoji, alt = "" }) {
  const [failed, setFailed] = useState(false);
  const on = config.animatedEmoji?.enabled && !failed;
  if (!on) return <span className="picemoji" role="img" aria-label={alt}>{emoji}</span>;
  const code = Array.from(emoji).map((c) => c.codePointAt(0).toString(16)).join("_");
  return (
    <img
      className="picemoji animemoji" alt={alt} src={config.animatedEmoji.urlTemplate.replace("{code}", code)}
      style={{ width: "1.1em", height: "1.1em" }} onError={() => setFailed(true)}
    />
  );
}

// A hungry monster. mood: hungry | yum | yuck. `fed` makes it a little bigger each time.
export function Monster({ mood = "hungry", fed = 0, size = 180, label }) {
  const scale = 1 + fed * 0.07;
  const mouth = mood === "yuck" ? "M38 100 q12 -10 24 0" : mood === "yum" ? "M34 92 q16 26 32 0 z" : "M38 94 q12 14 24 0 z";
  return (
    <svg className={`monster ${mood}`} width={size} height={size} viewBox="0 0 100 120" role="img" aria-label="monster" style={{ transform: `scale(${scale})` }}>
      <path d="M22 22 L30 40 L16 38 Z M78 22 L70 40 L84 38 Z" fill="#8a5cf6" />
      <ellipse cx="50" cy="72" rx="38" ry="40" fill="#a47bff" />
      <ellipse cx="50" cy="84" rx="26" ry="24" fill="#c9b3ff" opacity=".7" />
      <circle cx="36" cy="54" r="10" fill="#fff" /><circle cx="64" cy="54" r="10" fill="#fff" />
      <circle cx={mood === "yuck" ? 33 : 37} cy="56" r="5" fill="#2b2a33" /><circle cx={mood === "yuck" ? 61 : 65} cy="56" r="5" fill="#2b2a33" />
      <path d={mouth} fill={mood === "yuck" ? "none" : "#5a1f7a"} stroke="#2b2a33" strokeWidth="3" strokeLinecap="round" />
      {mood !== "yuck" && <path d="M44 94 l3 7 l3 -7 M54 94 l3 7 l3 -7" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" />}
      {label && <text x="50" y="118" fontSize="0" />}
    </svg>
  );
}
