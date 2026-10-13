import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a pet symbol: a smaller diamond shape centered at (x, y).
 * The diamond is drawn at 70% of the given size to visually distinguish
 * pets from unknown-gender persons.
 */
export function renderPetSymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.pet,
    stroke = COLORS.stroke,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  // Smaller diamond: 70% of the standard size
  const scaledSize = size * 0.7;
  const half = scaledSize / 2;

  // Diamond vertices: top, right, bottom, left
  const points = `${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}`;

  return (
    <g class="symbol-pet">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
    </g>
  );
}
