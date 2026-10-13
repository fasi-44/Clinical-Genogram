import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a male symbol: a square centered at (x, y).
 * Size represents the side length.
 */
export function renderMaleSymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.male,
    stroke = COLORS.stroke,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    dashed = false,
  } = opts;

  const half = size / 2;

  const radius = size * 0.09; // softly rounded corners

  return (
    <g class="symbol-male">
      <rect
        x={x - half}
        y={y - half}
        width={size}
        height={size}
        rx={radius}
        ry={radius}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
        stroke-dasharray={dashed ? '5 4' : undefined}
        stroke-opacity={dashed ? 0.6 : undefined}
      />
    </g>
  );
}
