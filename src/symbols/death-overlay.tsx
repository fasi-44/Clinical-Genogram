import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS } from '../utils/constants';

/**
 * Renders a death overlay: an X (two diagonal lines) inside the symbol,
 * centered at (x, y). A light halo under each line keeps condition icons
 * in the quarters legible where the X crosses them.
 */
export function renderDeathOverlay(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    stroke = COLORS.deceased,
  } = opts;

  // Stay inside the symbol (corners of a circle are at ~0.71 of the half size)
  const d = (size / 2) * (opts.type === 'female' ? 0.71 : 0.92);
  const lines = [
    { x1: x - d, y1: y - d, x2: x + d, y2: y + d },
    { x1: x + d, y1: y - d, x2: x - d, y2: y + d },
  ];

  return (
    <g class="overlay-death">
      {lines.map(l => <line {...l} stroke="#ffffff" stroke-width={3.6} stroke-opacity={0.7} />)}
      {lines.map(l => <line {...l} stroke={stroke} stroke-width={1.4} />)}
    </g>
  );
}
