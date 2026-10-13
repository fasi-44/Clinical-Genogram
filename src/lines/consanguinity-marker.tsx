import { h } from '@stencil/core';
import { LineOptions } from '../types';
import { COLORS } from '../utils/constants';

/**
 * Marks a consanguineous couple (partners related by blood) with an extra
 * line parallel to the couple line. The marriage line is already a double
 * line, so the marker is a third line below it rather than the classic
 * double-line convention. Uncertain relationships are drawn dashed.
 */
export function renderConsanguinityMarker(opts: LineOptions, uncertain = false): any {
  const { x1, y1, x2, y2 } = opts;
  const offset = 7;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const px = len > 0 ? -(dy / len) : 0;
  const py = len > 0 ? dx / len : 1;

  // Keep the marker on the lower side regardless of line direction
  const sign = py >= 0 ? 1 : -1;
  const ox = px * offset * sign;
  const oy = py * offset * sign;

  return (
    <g class="line-consanguinity">
      <line
        x1={x1 + ox}
        y1={y1 + oy}
        x2={x2 + ox}
        y2={y2 + oy}
        stroke={COLORS.consanguinity}
        stroke-width={1.5}
        stroke-dasharray={uncertain ? '4,3' : undefined}
      />
    </g>
  );
}

/**
 * Label such as "1st cousins" for a consanguineous couple. Drawn above the
 * partners' symbols (the gap between partners is too short for text), so
 * callers render it in a layer on top of the person nodes.
 */
export function renderConsanguinityLabel(x: number, y: number, label: string): any {
  return (
    <text
      class="consanguinity-label"
      x={x}
      y={y}
      text-anchor="middle"
      font-size="9"
      font-weight="600"
      fill={COLORS.consanguinity}
      stroke="#ffffff"
      stroke-width="3"
      paint-order="stroke"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      {label}
    </text>
  );
}
