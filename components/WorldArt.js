// Little illustrated banner for each world (original vector art).
export default function WorldArt({ art, height = 84 }) {
  const common = { viewBox: "0 0 200 90", height, width: "100%", preserveAspectRatio: "xMidYMid meet", "aria-hidden": true, className: "worldart" };
  if (art === "pyramids")
    return (
      <svg {...common}>
        <circle cx="160" cy="24" r="14" fill="#ffd34d" />
        <rect x="0" y="70" width="200" height="20" fill="#f2d08a" />
        <polygon points="30,70 80,18 130,70" fill="#e9c46a" /><polygon points="80,18 130,70 80,70" fill="#d4a73f" />
        <polygon points="95,70 125,38 155,70" fill="#e9c46a" /><polygon points="125,38 155,70 125,70" fill="#d4a73f" />
        <path d="M24 70 C24 54 22 46 20 40" stroke="#8a5a2b" strokeWidth="3" fill="none" />
        <g className="palm"><path d="M20 40 q-14 -4 -18 6 M20 40 q-4 -14 10 -16 M20 40 q10 -10 22 -2 M20 40 q12 4 14 14" stroke="#3bb273" strokeWidth="4" fill="none" strokeLinecap="round" /></g>
      </svg>
    );
  if (art === "rocket")
    return (
      <svg {...common}>
        {[[20, 14], [50, 60], [150, 20], [175, 62], [120, 70]].map(([x, y], i) => <circle key={i} className="twinkle" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy={y} r="2.5" fill="#ffd34d" />)}
        <g className="rocketbody" transform="translate(100 45)">
          <path d="M0 -36 C14 -22 14 8 10 22 L-10 22 C-14 8 -14 -22 0 -36Z" fill="#fff" stroke="#c9c9d6" strokeWidth="2" />
          <path d="M0 -36 C8 -30 11 -24 12 -18 L-12 -18 C-11 -24 -8 -30 0 -36Z" fill="#ff7a59" />
          <circle cx="0" cy="-4" r="6" fill="#5aa9ff" stroke="#fff" strokeWidth="2" />
          <path d="M-10 10 L-20 24 L-10 20Z M10 10 L20 24 L10 20Z" fill="#ff7a59" />
          <path className="flame" d="M-6 22 Q0 44 6 22Z" fill="#ffb347" />
        </g>
      </svg>
    );
  if (art === "balloons")
    return (
      <svg {...common}>
        {[[55, "#ff7a59", 0], [100, "#5aa9ff", 0.4], [145, "#ffd34d", 0.8]].map(([x, c, d], i) => (
          <g key={i} className="balloon" style={{ animationDelay: `${d}s` }}>
            <ellipse cx={x} cy="34" rx="20" ry="25" fill={c} />
            <ellipse cx={x - 7} cy="25" rx="5" ry="8" fill="#fff" opacity=".45" />
            <path d={`M${x} 59 q-6 10 0 18 q6 8 0 14`} stroke="#6b6a78" strokeWidth="2" fill="none" />
          </g>
        ))}
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="40" y="46" width="42" height="42" rx="4" fill="#3b9ae1" />
      <polygon points="61,6 85,46 37,46" fill="#3bb273" />
      <circle cx="116" cy="66" r="22" fill="#ff7a59" />
      <rect x="140" y="52" width="48" height="36" rx="4" fill="#f4b942" />
      <path d="M164 28 l5 12 12 1 -9 8 3 12 -11 -7 -11 7 3 -12 -9 -8 12 -1Z" fill="#ffb300" className="twinkle" />
    </svg>
  );
}
