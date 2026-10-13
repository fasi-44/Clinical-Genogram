import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';
import { renderZigzag } from './zigzag-pattern';

/**
 * Renders a committed-separation line: single solid indigo line with 1 zigzag in the middle.
 */
export function renderCommittedSeparationLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-committed-separation">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.committed}
        stroke-width={strokeWidth}
      />
      {renderZigzag(x1, y1, x2, y2, 1, strokeWidth, COLORS.committed)}
    </g>
  );
}
