import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS, STROKE_PATTERNS } from '../utils/constants';
import { renderZigzag } from './zigzag-pattern';

/**
 * Renders a temporary-separation line: single dotted brown line with 1 zigzag in the middle.
 */
export function renderTemporarySeparationLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-temporary-separation">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.temporary}
        stroke-width={strokeWidth}
        stroke-dasharray={STROKE_PATTERNS.dotted}
      />
      {renderZigzag(x1, y1, x2, y2, 1, strokeWidth, COLORS.temporary)}
    </g>
  );
}
