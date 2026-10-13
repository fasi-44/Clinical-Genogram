import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS, STROKE_PATTERNS } from '../utils/constants';

/**
 * Renders an engagement line: dashed blue line.
 */
export function renderEngagementLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-engagement">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.engagement}
        stroke-width={strokeWidth}
        stroke-dasharray={STROKE_PATTERNS.dashed}
      />
    </g>
  );
}
