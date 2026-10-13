import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';

/**
 * Renders a committed relationship line: single solid indigo line.
 */
export function renderCommittedLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;

  return (
    <g class="line-committed">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLORS.committed}
        stroke-width={strokeWidth}
      />
    </g>
  );
}
