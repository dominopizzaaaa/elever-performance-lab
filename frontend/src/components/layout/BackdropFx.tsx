/**
 * Fixed decorative background: accent grid, corner blooms, vignette and CRT
 * scanlines. Purely presentational and non-interactive.
 */
export function BackdropFx() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Perspective grid, masked to fade out toward the bottom */}
      <div className="grid-backdrop absolute inset-0" />

      {/* Accent bloom top-centre */}
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-[50%] blur-3xl"
        style={{ background: 'radial-gradient(ellipse, rgb(var(--accent-rgb) / 0.16), transparent 65%)' }}
      />

      {/* Cool counter-bloom bottom-left keeps the palette from flattening */}
      <div
        className="absolute -bottom-56 -left-32 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(77 141 255 / 0.12), transparent 70%)' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 40%, transparent 40%, rgb(3 5 11 / 0.85) 100%)' }}
      />

      {/* Scanlines */}
      <div className="scanlines absolute inset-0" />
    </div>
  );
}
