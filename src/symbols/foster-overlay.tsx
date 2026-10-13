import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, STROKE_PATTERNS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders a foster overlay: a dotted green border drawn around the
 * symbol bounds. For female shapes this is a circle; otherwise a
 * rectangle. The overlay is slightly larger than the base symbol so
 * both outlines remain visible.
 *
 * Pass opts.type = 'female' to render a circular overlay; any other
 * value renders a rectangular overlay.
 */
export function renderFosterOverlay(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    type,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  const padding = strokeWidth + 4;
  const overlayStroke = COLORS.foster;
  const dashArray = STROKE_PATTERNS.dotted;

  if (type === 'female') {
    const radius = size / 2 + padding;
    return (
      <g class="overlay-foster">
        <circle
          cx={x}
          cy={y}
          r={radius}
          fill="none"
          stroke={overlayStroke}
          stroke-width={strokeWidth}
          stroke-dasharray={dashArray}
        />
      </g>
    );
  }

  // Default rectangular overlay (male, unknown, pet, etc.)
  const half = size / 2 + padding;
  const radius = half * 0.15;
  return (
    <g class="overlay-foster">
      <rect
        x={x - half}
        y={y - half}
        width={half * 2}
        height={half * 2}
        rx={radius}
        ry={radius}
        fill="none"
        stroke={overlayStroke}
        stroke-width={strokeWidth}
        stroke-dasharray={dashArray}
      />
    </g>
  );
}
