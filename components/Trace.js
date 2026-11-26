"use client";
import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/content";
import { scoreTrace } from "@/lib/trace";
import { useApp } from "./AppProvider";

const SIZE = 320;

function setup(ctx, text, cfg) {
  ctx.font = `700 ${cfg.fontSize}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  return [text, SIZE / 2, SIZE / 2];
}

function letterPixels(text, cfg, widen) {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const args = setup(ctx, text, cfg);
  ctx.fillStyle = "#000";
  ctx.fillText(...args);
  if (widen) {
    ctx.lineWidth = widen * 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.strokeText(...args);
  }
  return ctx.getImageData(0, 0, SIZE, SIZE).data;
}

export default function Trace({ text, lang, locked, onDone }) {
  const { t } = useApp();
  const cfg = config.tracing;
  const guide = useRef(null);
  const ink = useRef(null);
  const last = useRef(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const ctx = guide.current.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    const args = setup(ctx, text, cfg);
    ctx.fillStyle = "#e6d8bf";
    ctx.fillText(...args);
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b09c78";
    ctx.strokeText(...args);
  }, [text, cfg]);

  const point = (e) => {
    const r = ink.current.getBoundingClientRect();
    return [((e.clientX - r.left) * SIZE) / r.width, ((e.clientY - r.top) * SIZE) / r.height];
  };
  const dot = (ctx, [x, y]) => {
    ctx.fillStyle = "#ff7a59";
    ctx.beginPath();
    ctx.arc(x, y, cfg.brush / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const down = (e) => {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = point(e);
    dot(ink.current.getContext("2d"), last.current);
    setTouched(true);
  };
  const move = (e) => {
    if (!last.current || locked) return;
    const ctx = ink.current.getContext("2d");
    const p = point(e);
    ctx.strokeStyle = "#ff7a59";
    ctx.lineWidth = cfg.brush;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(...last.current);
    ctx.lineTo(...p);
    ctx.stroke();
    last.current = p;
  };
  const up = () => { last.current = null; };

  const clear = () => {
    ink.current.getContext("2d").clearRect(0, 0, SIZE, SIZE);
    setTouched(false);
  };

  const finish = () => {
    const stroke = ink.current.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
    const result = scoreTrace(letterPixels(text, cfg, 0), letterPixels(text, cfg, cfg.tolerance), stroke, cfg);
    onDone(result.pass, result);
  };

  return (
    <div className="trace" lang={lang}>
      <div className="trace-stack">
        <canvas ref={guide} width={SIZE} height={SIZE} />
        <canvas
          ref={ink}
          width={SIZE}
          height={SIZE}
          data-testid="trace-ink"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn secondary" onClick={clear} disabled={locked || !touched}>{t("traceClear")}</button>
        <button className="btn" onClick={finish} disabled={locked || !touched}>{t("traceDone")}</button>
      </div>
    </div>
  );
}
