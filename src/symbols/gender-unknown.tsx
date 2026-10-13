import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a gender-unknown symbol: a diamond (rotated square) centered at (x, y)
 * with a "?" text label inside. Size represents the diagonal span.
 */
export function renderGenderUnknownSymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.unknown,
    stroke = COLORS.stroke,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    dashed = false,
  } = opts;

  const half = size / 2;

  // Diamond vertices: top, right, bottom, left
  const points = `${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}`;

  return (
    <g class="symbol-gender-unknown">
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
        stroke-dasharray={dashed ? '5 4' : undefined}
        stroke-opacity={dashed ? 0.6 : undefined}
      />
      <text
        x={x}
        y={y}
        text-anchor="middle"
        dominant-baseline="central"
        font-size={size * 0.4}
        fill={stroke}
        pointer-events="none"
      >
        ?
      </text>
    </g>
  );
}
