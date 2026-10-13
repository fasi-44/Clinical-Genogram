import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Extra options specific to twin connectors.
 * - parentX / parentY: the midpoint above both twins where the V apex sits.
 * - twin1X / twin1Y: center of the first twin symbol.
 * - twin2X / twin2Y: center of the second twin symbol.
 */
export interface TwinsConnectorOptions extends SymbolOptions {
  parentX: number;
  parentY: number;
  twin1X: number;
  twin1Y: number;
  twin2X: number;
  twin2Y: number;
}

/**
 * Renders a V-shaped connector between twin positions.
 * The apex of the V is at the parent connection point; the two
 * legs reach down to the top of each twin's symbol.
 */
export function renderTwinsConnector(opts: TwinsConnectorOptions): any {
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

  return (
    <g class="connector-twins">
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
    </g>
  );
}
