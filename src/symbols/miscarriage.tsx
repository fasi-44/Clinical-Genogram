import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a miscarriage symbol: a small upward-pointing triangle
 * with an X drawn through it, centered at (x, y).
 */
export function renderMiscarriageSymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.pregnancy,
    stroke = COLORS.miscarriage,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  const half = size / 2;
  const height = size * 0.866;
  const topY = y - height / 2;
  const bottomY = y + height / 2;

  // Triangle vertices: top-center, bottom-left, bottom-right
  const points = `${x},${topY} ${x - half},${bottomY} ${x + half},${bottomY}`;

  // X lines span the bounding box of the triangle
  const crossPad = size * 0.15;

  return (
    <g class="symbol-miscarriage">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      {/* X across the triangle */}
      <line
        x1={x - half + crossPad}
        y1={bottomY - crossPad}
        x2={x + half - crossPad}
        y2={topY + crossPad}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      <line
        x1={x + half - crossPad}
        y1={bottomY - crossPad}
        x2={x - half + crossPad}
        y2={topY + crossPad}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
    </g>
  );
}
