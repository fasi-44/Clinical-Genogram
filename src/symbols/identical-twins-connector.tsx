import { h } from '@stencil/core';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';
import { TwinsConnectorOptions } from './twins-connector';

/**
 * Renders an identical-twins connector: the same V-shape as the
 * fraternal twins connector, plus a horizontal bar across the
 * midpoint of the two legs to indicate monozygosity.
 */
export function renderIdenticalTwinsConnector(opts: TwinsConnectorOptions): any {
  const {
    parentX,
    parentY,
    twin1X,
    twin1Y,
    twin2X,
    twin2Y,
    stroke = COLORS.stroke,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  // Midpoints of each leg, used to draw the horizontal bar
  const midLeftX = (parentX + twin1X) / 2;
  const midLeftY = (parentY + twin1Y) / 2;
  const midRightX = (parentX + twin2X) / 2;
  const midRightY = (parentY + twin2Y) / 2;

  return (
    <g class="connector-identical-twins">
      {/* Left leg: apex to twin 1 */}
      <line
        x1={parentX}
        y1={parentY}
        x2={twin1X}
        y2={twin1Y}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      {/* Right leg: apex to twin 2 */}
      <line
        x1={parentX}
        y1={parentY}
        x2={twin2X}
        y2={twin2Y}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
      {/* Horizontal bar across the midpoints of both legs */}
      <line
        x1={midLeftX}
        y1={midLeftY}
        x2={midRightX}
        y2={midRightY}
        stroke={stroke}
        stroke-width={strokeWidth}
      />
    </g>
  );
}
