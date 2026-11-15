/** Half-width (world units) the intro and "back" camera fits. Wide screens frame tight so the bodies fill the view; tall ones keep margin so nothing is cut off. */
export function frameExtent(aspect: number): number {
  const a = Number.isFinite(aspect) ? aspect : 1.6;
  const t = Math.min(1, Math.max(0, (1.6 - a) / 0.8)); // 0 at aspect >= 1.6, 1 at aspect <= 0.8
  return Math.round(62 + t * (105 - 62));
}
