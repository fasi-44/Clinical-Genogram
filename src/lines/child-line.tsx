import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';

/**
 * Renders a child connector line with orthogonal routing and rounded corners,
 * similar to GoJS style. The path goes:
 *   - Vertical from (x1,y1) down to the rail
 *   - Horizontal along the rail to above the child
 *   - Vertical from the rail down to (x2,y2)
 * Corners use quadratic bezier curves for smooth rounding.
 */
export function renderChildLine(opts: LineOptions): any {
  const { x1, y1, x2, y2, strokeWidth = 1.5 } = opts;

  // Rail sits at the vertical midpoint between parent connector and child,
  // unless the caller staggers it to avoid overlapping another family's rail
  const railY = opts.railY ?? (y1 + y2) / 2;
  const r = 8; // corner radius

  // If parent and child are vertically aligned, draw a straight line
  if (Math.abs(x1 - x2) < 1) {
    return (
      <g class="line-child">
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={COLORS.child}
          stroke-width={strokeWidth}
          fill="none"
        />
      </g>
    );
  }

  // Direction: child is to the right (+1) or left (-1) of the parent midpoint
  const dir = x2 > x1 ? 1 : -1;
  const dx = Math.abs(x2 - x1);
  const dyTop = railY - y1;
  const dyBottom = y2 - railY;

  // Clamp radius to available space
  const cr = Math.min(r, dx / 2, dyTop / 2, dyBottom / 2);

  // Build the path with rounded corners at the two bends
  const d = [
    `M ${x1} ${y1}`,
    // Vertical down to first corner
    `L ${x1} ${railY - cr}`,
    // Rounded corner: turn toward child
    `Q ${x1} ${railY} ${x1 + dir * cr} ${railY}`,
    // Horizontal along rail to second corner
    `L ${x2 - dir * cr} ${railY}`,
    // Rounded corner: turn down toward child
    `Q ${x2} ${railY} ${x2} ${railY + cr}`,
    // Vertical down to child
    `L ${x2} ${y2}`,
  ].join(' ');

  return (
    <g class="line-child">
      <path
        d={d}
        stroke={COLORS.child}
        stroke-width={strokeWidth}
        fill="none"
      />
    </g>
  );
}
