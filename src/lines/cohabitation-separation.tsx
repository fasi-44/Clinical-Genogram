import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';
import { renderZigzag } from './zigzag-pattern';

/**
 * Renders a cohabitation-separation line: two solid parallel purple lines with 1 zigzag.
 * The two lines are spaced 4px apart (2px above and below center).
 */
export function renderCohabitationSeparationLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 2 } = opts;
  const gap = 2;

  // Direction vector of the line
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular unit vector
  const px = len > 0 ? -(dy / len) : 0;
  const py = len > 0 ? dx / len : 1;

  return (
    <g class="line-cohabitation-separation">
      <line
        x1={x1 + px * gap}
        y1={y1 + py * gap}
        x2={x2 + px * gap}
        y2={y2 + py * gap}
        stroke={COLORS.cohabitation}
        stroke-width={strokeWidth}
      />
      <line
        x1={x1 - px * gap}
        y1={y1 - py * gap}
        x2={x2 - px * gap}
        y2={y2 - py * gap}
        stroke={COLORS.cohabitation}
        stroke-width={strokeWidth}
      />
      {renderZigzag(x1, y1, x2, y2, 1, strokeWidth, COLORS.cohabitation)}
    </g>
  );
}
