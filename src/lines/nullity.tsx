import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS, STROKE_PATTERNS } from '../utils/constants';
import { renderZigzag } from './zigzag-pattern';

/**
 * Renders a nullity line: dashed gray base line with 3 zigzags in the middle.
 * Represents an annulled relationship.
 */
export function renderNullityLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-nullity">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.nullity}
        stroke-width={strokeWidth}
        stroke-dasharray={STROKE_PATTERNS.dashed}
      />
      {renderZigzag(x1, y1, x2, y2, 3, strokeWidth, COLORS.nullity)}
    </g>
  );
}
