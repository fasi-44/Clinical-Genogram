import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';
import { renderZigzag } from './zigzag-pattern';

/**
 * Renders a divorce line: single solid red line with 3 zigzags in the middle.
 */
export function renderDivorceLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-divorce">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.divorce}
        stroke-width={strokeWidth}
      />
      {renderZigzag(x1, y1, x2, y2, 3, strokeWidth, COLORS.divorce)}
    </g>
  );
}
