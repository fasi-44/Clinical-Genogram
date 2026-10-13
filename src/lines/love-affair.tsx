import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS, STROKE_PATTERNS } from '../utils/constants';

/**
 * Renders a love affair line: dash-dot-dot pattern in red/pink.
 * Uses the dashDotDot stroke pattern (10,4,3,4,3,4).
 */
export function renderLoveAffairLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-love-affair">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.loveAffair}
        stroke-width={strokeWidth}
        stroke-dasharray={STROKE_PATTERNS.dashDotDot}
      />
    </g>
  );
}
