import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a female symbol: a circle centered at (x, y).
 * Size represents the diameter.
 */
export function renderFemaleSymbol(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    fill = COLORS.female,
    stroke = COLORS.stroke,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    dashed = false,
  } = opts;

  const radius = size / 2;

  return (
    <g class="symbol-female">
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
        stroke-dasharray={dashed ? '5 4' : undefined}
        stroke-opacity={dashed ? 0.6 : undefined}
      />
    </g>
  );
}
