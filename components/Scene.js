// Animated storybook background. Pure SVG + CSS, no images to download, respects reduced-motion.
export default function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice">
        <g className="sun" transform="translate(680 110)">
          <g className="rays">
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x="-4" y="-70" width="8" height="26" rx="4" fill="#ffd34d" transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle r="38" fill="#ffd34d" />
          <circle r="38" fill="#ffe89a" opacity=".5" cx="-8" cy="-8" />
        </g>
        {[[90, 90, 1], [380, 60, 0.7], [560, 170, 0.85]].map(([x, y, s], i) => (
          <g key={i} className={`cloud c${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
            <ellipse cx="0" cy="0" rx="48" ry="20" fill="#fff" />
            <ellipse cx="-26" cy="-10" rx="26" ry="18" fill="#fff" />
            <ellipse cx="22" cy="-14" rx="30" ry="22" fill="#fff" />
          </g>
        ))}
        <g className="bird b1"><path d="M0 0 q8 -10 16 0 q8 -10 16 0" fill="none" stroke="#6b6a78" strokeWidth="3" strokeLinecap="round" /></g>
        <g className="bird b2"><path d="M0 0 q6 -8 12 0 q6 -8 12 0" fill="none" stroke="#6b6a78" strokeWidth="2.5" strokeLinecap="round" /></g>
        <path d="M0 470 C140 400 260 440 400 460 C540 480 680 410 800 450 L800 600 L0 600Z" fill="#bfe8b0" />
        <path d="M0 520 C160 470 300 520 460 510 C600 500 700 480 800 510 L800 600 L0 600Z" fill="#9bd88a" />
        {[[70, 548, "#ff7a59"], [190, 560, "#ffd34d"], [330, 552, "#e84a7f"], [520, 556, "#8a5cf6"], [650, 548, "#ff7a59"], [740, 562, "#ffd34d"]].map(([x, y, c], i) => (
          <g key={i} className="sway" style={{ animationDelay: `${i * 0.4}s` }} transform={`translate(${x} ${y})`}>
            <path d="M0 0 L0 -26" stroke="#3bb273" strokeWidth="4" strokeLinecap="round" />
            <circle cx="0" cy="-32" r="9" fill={c} />
            <circle cx="0" cy="-32" r="3.5" fill="#fff4c2" />
          </g>
        ))}
      </svg>
    </div>
  );
}
