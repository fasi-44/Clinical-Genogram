import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { COLORS, STROKE_PATTERNS, DEFAULT_STROKE_WIDTH } from '../utils/constants';

/**
 * Renders an adopted overlay: a dashed blue border drawn around the
 * symbol bounds. For male/unknown shapes this is a rectangle; for
 * female shapes this is a circle. The overlay is slightly larger than
 * the base symbol so both outlines remain visible.
 *
 * Pass opts.type = 'female' to render a circular overlay; any other
 * value renders a rectangular overlay.
 */
export function renderAdoptedOverlay(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    type,
    strokeWidth = DEFAULT_STROKE_WIDTH,
  } = opts;

  const padding = strokeWidth + 4;
  const overlayStroke = COLORS.adopted;
  const dashArray = STROKE_PATTERNS.dashed;

  if (type === 'female') {
    const radius = size / 2 + padding;
    return (
      <g class="overlay-adopted">
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
    <g class="overlay-adopted">
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
