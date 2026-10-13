import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders an abortion symbol: a small upward-pointing triangle with
 * a horizontal line through it and an X on top, centered at (x, y).
 */
export function renderAbortionSymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.pregnancy,
    stroke = COLORS.abortion,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  const half = size / 2;
  const height = size * 0.866;
  const topY = y - height / 2;
  const bottomY = y + height / 2;

  // Triangle vertices: top-center, bottom-left, bottom-right
  const points = `${x},${topY} ${x - half},${bottomY} ${x + half},${bottomY}`;

  // Horizontal line through the middle of the triangle
  const midY = y;
  // Calculate the triangle width at midY using linear interpolation
  const ratio = (midY - topY) / (bottomY - topY);
  const halfWidthAtMid = half * ratio;

  // X mark above the triangle
  const crossSize = size * 0.2;
  const crossCenterY = topY - crossSize - 2;

  return (
    <g class="symbol-abortion">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      {/* Horizontal line through the triangle */}
      <line
        x1={x - halfWidthAtMid}
        y1={midY}
        x2={x + halfWidthAtMid}
        y2={midY}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      {/* X mark above the triangle */}
      <line
        x1={x - crossSize}
        y1={crossCenterY - crossSize}
        x2={x + crossSize}
        y2={crossCenterY + crossSize}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      <line
        x1={x + crossSize}
        y1={crossCenterY - crossSize}
        x2={x - crossSize}
        y2={crossCenterY + crossSize}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
    </g>
  );
}
