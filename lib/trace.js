// Scores a child's tracing. Inputs are RGBA pixel arrays (like ImageData.data) of the same size:
//   mask   = the letter itself, wide = the letter widened by a tolerance, stroke = what the child drew.
// coverage  = share of the letter that the child's line covers
// precision = share of the child's line that stays on (or near) the letter
export function scoreTrace(mask, wide, stroke, { minCoverage, minPrecision, alphaThreshold = 128 }) {
  let maskN = 0, covered = 0, strokeN = 0, inside = 0;
  for (let i = 3; i < mask.length; i += 4) {
    const m = mask[i] > alphaThreshold;
    const s = stroke[i] > alphaThreshold;
    if (m) { maskN++; if (s) covered++; }
    if (s) { strokeN++; if (wide[i] > alphaThreshold) inside++; }
  }
  const coverage = maskN ? covered / maskN : 0;
  const precision = strokeN ? inside / strokeN : 0;
  return { coverage, precision, pass: strokeN > 0 && coverage >= minCoverage && precision >= minPrecision };
}
