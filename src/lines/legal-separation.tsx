import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';
import { renderZigzag } from './zigzag-pattern';

/**
 * Renders a legal separation line: single solid orange line with 2 zigzags in the middle.
 */
export function renderLegalSeparationLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-legal-separation">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.separation}
        stroke-width={strokeWidth}
      />
      {renderZigzag(x1, y1, x2, y2, 2, strokeWidth, COLORS.separation)}
    </g>
  );
}
