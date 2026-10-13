import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS, STROKE_PATTERNS } from '../utils/constants';

/**
 * Renders a casual relationship line: single dashed gray line.
 */
export function renderCasualLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-casual">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.casual}
        stroke-width={strokeWidth}
        stroke-dasharray={STROKE_PATTERNS.dashed}
      />
    </g>
  );
}
