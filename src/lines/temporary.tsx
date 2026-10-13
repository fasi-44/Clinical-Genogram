import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS, STROKE_PATTERNS } from '../utils/constants';

/**
 * Renders a temporary relationship line: single dotted brown line.
 */
export function renderTemporaryLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-temporary">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.temporary}
        stroke-width={strokeWidth}
        stroke-dasharray={STROKE_PATTERNS.dotted}
      />
    </g>
  );
}
