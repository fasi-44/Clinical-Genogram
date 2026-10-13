import { Person, Relationship } from '../types';
import { DEFAULT_NODE_SIZE, RAIL_BELOW_LABELS } from './constants';

/** Vertical space between stacked rails of families whose lines overlap */
export const RAIL_LANE_SPACING = 18;
const CORNER = 8;
const HOP = 5;

/**
 * Lines joining a couple to its children: a drop from the middle of the
 * couple line to a horizontal rail, then a drop to each child.
 */
export interface FamilyConnector {
  /** Relationship id of the parents' couple */
  id: string;
  /** Midpoint of the couple line, where the parent drop starts */
  mx: number;
  py: number;
  railY: number;
  /** Horizontal extent of the rail (includes the parent drop) */
  left: number;
  right: number;
  children: { id: string; x: number; top: number }[];
}

/**
 * Work out every family's connector. Families whose rails would overlap at
 * the same height are stacked into lanes: the widest family takes the top
 * lane and narrower ones sit below it, so lines nest instead of interleaving.
 */
export function computeFamilyConnectors(persons: Person[], relationships: Relationship[]): FamilyConnector[] {
  const byId = new Map(persons.map(p => [p.id, p]));
  const half = DEFAULT_NODE_SIZE / 2;
  const families: (FamilyConnector & { baseRail: number; maxRail: number; row: number })[] = [];

  for (const rel of relationships) {
    if (rel.type === 'child' || !rel.childrenIds?.length) continue;
    const p1 = byId.get(rel.person1Id);
    const p2 = byId.get(rel.person2Id);
    if (!p1 || !p2) continue;
    const kids = rel.childrenIds.map(id => byId.get(id)).filter((c): c is Person => !!c);
    if (kids.length === 0) continue;

    const mx = ((p1.x ?? 0) + (p2.x ?? 0)) / 2;
    const py = ((p1.y ?? 0) + (p2.y ?? 0)) / 2;
    const children = kids.map(c => ({ id: c.id, x: c.x ?? 0, top: (c.y ?? 0) - half + 10 }));
    const nearestChildY = Math.min(...kids.map(c => c.y ?? 0));
    const xs = [mx, ...children.map(c => c.x)];
    families.push({
      id: rel.id,
      mx,
      py,
      children,
      left: Math.min(...xs),
      right: Math.max(...xs),
      // Rail sits below the parents' name labels, but always above the children
      baseRail: Math.min(py + half + RAIL_BELOW_LABELS, nearestChildY - half - 14),
      maxRail: nearestChildY - half - 8,
      railY: 0,
      row: Math.round(Math.max(p1.y ?? 0, p2.y ?? 0)),
    });
  }

  // Lanes per parent row, widest rail first
  const rows = new Map<number, typeof families>();
  for (const f of families) rows.set(f.row, [...(rows.get(f.row) ?? []), f]);
  for (const row of rows.values()) {
    const lanes: { left: number; right: number }[][] = [];
    const ordered = [...row].sort((a, b) => (b.right - b.left) - (a.right - a.left));
    for (const f of ordered) {
      let lane = lanes.findIndex(spans => spans.every(s => f.right < s.left - 6 || f.left > s.right + 6));
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push({ left: f.left, right: f.right });
      f.railY = Math.min(f.baseRail + lane * RAIL_LANE_SPACING, f.maxRail);
    }
  }

  return families.map(({ baseRail: _b, maxRail: _m, row: _r, ...f }) => f);
}

/**
 * SVG path for one family's connector, with rounded corners where a line
 * turns, a small hop wherever a vertical crosses another family's rail
 * (so crossings don't look like joins), and the points where lines really
 * branch (T-junctions) for drawing dots.
 */
export function buildConnectorPath(f: FamilyConnector, all: FamilyConnector[]): { d: string; junctions: { x: number; y: number }[] } {
  const junctions: { x: number; y: number }[] = [];
  const rail = f.railY;

  // Rails of other families that a vertical at x between ya and yb crosses
  const hopsAt = (x: number, ya: number, yb: number) =>
    all
      .filter(g => g !== f && g.left + 2 < x && x < g.right - 2 && ya + HOP + 1 < g.railY && g.railY < yb - HOP - 1)
      .map(g => g.railY)
      .sort((a, b) => a - b);
  const downTo = (x: number, ya: number, yb: number) => {
    let d = '';
    for (const hy of hopsAt(x, ya, yb)) d += ` V${hy - HOP} a${HOP} ${HOP} 0 0 1 0 ${HOP * 2}`;
    return `${d} V${yb}`;
  };

  // A single child straight below the parents: one vertical line
  if (f.right - f.left < 1) {
    let d = '';
    for (const c of f.children) d += `M${f.mx} ${f.py}${downTo(f.mx, f.py, c.top)} `;
    return { d: d.trim(), junctions };
  }

  const r = Math.min(CORNER, (f.right - f.left) / 2);
  const atLeft = (x: number) => Math.abs(x - f.left) < 0.5;
  const atRight = (x: number) => Math.abs(x - f.right) < 0.5;
  const childrenAt = (x: number) => f.children.filter(c => Math.abs(c.x - x) < 0.5).length;

  // An end of the rail turns a corner when exactly one line meets it there
  const parentAtEnd = atLeft(f.mx) || atRight(f.mx);
  const endIsCorner = (x: number) => (parentAtEnd && Math.abs(f.mx - x) < 0.5 ? 1 : 0) + childrenAt(x) === 1;
  const leftCorner = endIsCorner(f.left);
  const rightCorner = endIsCorner(f.right);

  const parts: string[] = [];
  // Rail
  parts.push(`M${f.left + (leftCorner ? r : 0)} ${rail} H${f.right - (rightCorner ? r : 0)}`);

  // Parent drop, from the couple line down to the rail
  const parentCorner = (atLeft(f.mx) && leftCorner) || (atRight(f.mx) && rightCorner);
  if (parentCorner) {
    const dir = atLeft(f.mx) ? 1 : -1;
    parts.push(`M${f.mx} ${f.py}${downTo(f.mx, f.py, rail - r)} Q${f.mx} ${rail} ${f.mx + dir * r} ${rail}`);
  } else {
    parts.push(`M${f.mx} ${f.py}${downTo(f.mx, f.py, rail)}`);
    junctions.push({ x: f.mx, y: rail });
  }

  // Child drops, from the rail down to each child
  for (const c of f.children) {
    const corner = (atLeft(c.x) && leftCorner) || (atRight(c.x) && rightCorner);
    if (corner) {
      const dir = atLeft(c.x) ? 1 : -1;
      parts.push(`M${c.x + dir * r} ${rail} Q${c.x} ${rail} ${c.x} ${rail + r}${downTo(c.x, rail + r, c.top)}`);
    } else {
      parts.push(`M${c.x} ${rail}${downTo(c.x, rail, c.top)}`);
      if (Math.abs(c.x - f.mx) > 0.5) junctions.push({ x: c.x, y: rail });
    }
  }

  return { d: parts.join(' '), junctions };
}
