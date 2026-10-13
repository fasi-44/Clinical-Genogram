import { h } from '@stencil/core';

/**
 * Renders zigzag marks perpendicular to a line at its midpoint.
 * Each zigzag is a small V-shape rendered as a polyline.
 *
 * @param x1 - Start x of the line
 * @param y1 - Start y of the line
 * @param x2 - End x of the line
 * @param y2 - End y of the line
 * @param count - Number of zigzag marks to render
 * @param strokeWidth - Stroke width for the zigzag lines
 * @param stroke - Stroke color
 * @param dashArray - Optional dash array for the zigzag strokes
 * @returns A <g> element containing the zigzag marks
 */
export function renderZigzag(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  count: number,
  strokeWidth: number,
  stroke: string,
  dashArray?: string,
): any {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Direction vector of the line
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Unit vector along the line
  const ux = len > 0 ? dx / len : 1;
  const uy = len > 0 ? dy / len : 0;

  // Perpendicular unit vector (rotated 90 degrees)
  const px = -uy;
  const py = ux;

  // Zigzag dimensions
  const zigzagHeight = 8;
  const zigzagWidth = 6;

  // Spacing between multiple zigzags along the line direction
  const spacing = zigzagWidth + 2;
  const totalWidth = (count - 1) * spacing;
  const startOffset = -totalWidth / 2;

  const zigzags: any[] = [];

  for (let i = 0; i < count; i++) {
    const offset = startOffset + i * spacing;

    // Center of this zigzag mark along the line
    const cx = midX + ux * offset;
    const cy = midY + uy * offset;

    // Three points of the V-shape: top-left, bottom-center, top-right
    const topLeftX = cx - ux * (zigzagWidth / 2) + px * (zigzagHeight / 2);
    const topLeftY = cy - uy * (zigzagWidth / 2) + py * (zigzagHeight / 2);

    const bottomX = cx - px * (zigzagHeight / 2);
    const bottomY = cy - py * (zigzagHeight / 2);

    const topRightX = cx + ux * (zigzagWidth / 2) + px * (zigzagHeight / 2);
    const topRightY = cy + uy * (zigzagWidth / 2) + py * (zigzagHeight / 2);

    const points = `${topLeftX},${topLeftY} ${bottomX},${bottomY} ${topRightX},${topRightY}`;

    zigzags.push(
      <polyline
        key={`zigzag-${i}`}
        points={points}
        fill="none"
        stroke={stroke}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
        {...(dashArray ? { 'stroke-dasharray': dashArray } : {})}
      />,
    );
  }

  return <g class="zigzag-marks">{zigzags}</g>;
}
