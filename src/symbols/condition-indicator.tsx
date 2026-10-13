import { h } from '@stencil/core';
import { SymbolOptions } from '../types';
import { iconInkFor, matchConditionIcon, renderConditionGlyph } from './condition-icons';

/**
 * Renders colored quadrant fills inside the symbol bounds to indicate
 * clinical conditions. Up to 4 quadrants can be filled, each with a
 * different color.
 *
 * Quadrant layout (standard genogram convention):
 *   1 = top-left
 *   2 = top-right
 *   3 = bottom-left
 *   4 = bottom-right
 *
 * Pass opts.type = 'female' to clip quadrants to a circle;
 * otherwise they are clipped to a square.
 *
 * Each entry in opts.conditions specifies a color and a quadrant number.
 * With 5 or more conditions there are not enough quarters, so the symbol
 * is split into equal pie slices instead, in array order, clockwise with
 * the first slice at the top-left. At most 6 slices are drawn; with more
 * conditions the 6th is a grey "+N" slice.
 *
 * With opts.showConditionIcons, each quarter (or slice) also carries the
 * condition's icon (or first letter), so it can be read without the legend
 * and in black-and-white print.
 */
export function renderConditionIndicator(opts: SymbolOptions): any {
  const {
    x,
    y,
    size,
    type,
    conditions = [],
    showConditionIcons = false,
  } = opts;

  if (conditions.length === 0) {
    return null;
  }

  const half = size / 2;

  // Unique id for the clip-path so multiple instances don't collide
  const clipId = `clip-cond-${x}-${y}`;

  // Build the clip shape based on symbol type
  const radius = size * 0.09; // matches the male symbol
  const clipShape =
    type === 'female' ? (
      <circle cx={x} cy={y} r={half} />
    ) : (
      <rect x={x - half} y={y - half} width={size} height={size} rx={radius} ry={radius} />
    );

  if (conditions.length > 4) {
    return renderSlices(opts, clipId, clipShape);
  }

  // Map quadrant number to the rectangle that covers that quarter
  const quadrantRect = (quadrant: number): { qx: number; qy: number } => {
    switch (quadrant) {
      case 1: // top-left
        return { qx: x - half, qy: y - half };
      case 2: // top-right
        return { qx: x, qy: y - half };
      case 3: // bottom-left
        return { qx: x - half, qy: y };
      case 4: // bottom-right
      default:
        return { qx: x, qy: y };
    }
  };

  return (
    <g class="condition-indicator">
      <defs>
        <clipPath id={clipId}>{clipShape}</clipPath>
      </defs>
      <g clip-path={`url(#${clipId})`}>
        {conditions.map(cond => {
          const { qx, qy } = quadrantRect(cond.quadrant ?? 1);
          return (
            <rect
              x={qx}
              y={qy}
              width={half}
              height={half}
              fill={cond.color}
            />
          );
        })}
      </g>
      {showConditionIcons &&
        conditions.map(cond => {
          const { qx, qy } = quadrantRect(cond.quadrant ?? 1);
          // Pull the icon slightly towards the centre so it stays inside a circle
          const inset = half * 0.08;
          const cx = qx + half / 2 + (qx < x ? inset : -inset);
          const cy = qy + half / 2 + (qy < y ? inset : -inset);
          const name = cond.name ?? '';
          return renderConditionGlyph(name, matchConditionIcon(name, cond.icon), cx, cy, half * 0.42, iconInkFor(cond.color));
        })}
    </g>
  );
}

/** Most slices drawn in a symbol; beyond this they get too thin to read. */
export const MAX_CONDITION_SLICES = 6;

/**
 * Equal pie slices, one per condition, for 5 or 6 conditions. With more,
 * the first 5 get a slice and the last slice is a grey "+N" for the rest
 * (hover lists them).
 */
function renderSlices(opts: SymbolOptions, clipId: string, clipShape: any): any {
  const { x, y, size, showConditionIcons = false } = opts;
  const all = opts.conditions ?? [];
  const overflow = all.length > MAX_CONDITION_SLICES ? all.slice(MAX_CONDITION_SLICES - 1) : [];
  const conditions = overflow.length ? all.slice(0, MAX_CONDITION_SLICES - 1) : all;
  const half = size / 2;
  const count = conditions.length + (overflow.length ? 1 : 0);
  const step = (Math.PI * 2) / count;
  // The first slice ends at 12 o'clock, so it sits top-left like quarter 1
  const start = -Math.PI / 2 - step;
  // Long enough to reach the corners of the square before clipping
  const reach = half * 1.5;
  const point = (angle: number, r: number) => `${x + Math.cos(angle) * r},${y + Math.sin(angle) * r}`;
  // Icons shrink as slices get narrower
  const iconSize = half * 0.42 * Math.max(0.6, Math.sqrt(4 / count));
  const iconRadius = half * 0.6;

  return (
    <g class="condition-indicator condition-indicator--slices">
      <defs>
        <clipPath id={clipId}>{clipShape}</clipPath>
      </defs>
      <g clip-path={`url(#${clipId})`}>
        {conditions.map((cond, i) => {
          const a0 = start + i * step;
          const a1 = a0 + step;
          return (
            <path
              d={`M ${x},${y} L ${point(a0, reach)} A ${reach} ${reach} 0 0 1 ${point(a1, reach)} Z`}
              fill={cond.color}
              stroke="#ffffff"
              stroke-width={0.75}
            />
          );
        })}
        {overflow.length > 0 && (
          <path
            class="condition-indicator__more"
            d={`M ${x},${y} L ${point(start + (count - 1) * step, reach)} A ${reach} ${reach} 0 0 1 ${point(start + count * step, reach)} Z`}
            fill="#cfd8dc"
            stroke="#ffffff"
            stroke-width={0.75}
          >
            <title>{`${overflow.length} more: ${overflow.map(c => c.name ?? '').filter(Boolean).join(', ')}`}</title>
          </path>
        )}
      </g>
      {overflow.length > 0 && (
        <text
          class="condition-indicator__more-label"
          x={x + Math.cos(start + (count - 0.5) * step) * iconRadius}
          y={y + Math.sin(start + (count - 0.5) * step) * iconRadius}
          text-anchor="middle"
          dominant-baseline="central"
          font-size={iconSize * 0.8}
          font-weight="700"
          fill="#37474f"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {`+${overflow.length}`}
        </text>
      )}
      {showConditionIcons &&
        conditions.map((cond, i) => {
          const mid = start + (i + 0.5) * step;
          const name = cond.name ?? '';
          return renderConditionGlyph(
            name,
            matchConditionIcon(name, cond.icon),
            x + Math.cos(mid) * iconRadius,
            y + Math.sin(mid) * iconRadius,
            iconSize,
            iconInkFor(cond.color),
          );
        })}
    </g>
  );
}
