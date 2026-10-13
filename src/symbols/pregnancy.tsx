import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a pregnancy symbol: a small upward-pointing triangle
 * centered at (x, y). Size controls the overall triangle dimensions.
 */
export function renderPregnancySymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.pregnancy,
    stroke = COLORS.stroke,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  const half = size / 2;
  const height = size * 0.866; // equilateral triangle height: sqrt(3)/2 * side
  const topY = y - height / 2;
  const bottomY = y + height / 2;

  // Triangle vertices: top-center, bottom-left, bottom-right
  const points = `${x},${topY} ${x - half},${bottomY} ${x + half},${bottomY}`;

  return (
    <g class="symbol-pregnancy">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
    </g>
  );
}
