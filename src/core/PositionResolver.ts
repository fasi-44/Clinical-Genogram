import { Person, Relationship } from '../types';
import {
  DEFAULT_NODE_SIZE,
  GENERATION_SPACING_Y,
  SIBLING_SPACING_X,
  COUPLE_SPACING_X,
  FAMILY_GAP_X,
} from '../utils/constants';

/** A set of parents and the children they share. */
interface Family {
  parents: string[];
  children: string[];
}

/**
 * A rigid horizontal group in one generation row: a person plus every
 * partner (and partner's partner, ...) in the same row. Members keep fixed
 * offsets so couples stay together.
 */
interface Block {
  members: string[];
  offsets: number[];
  width: number;
  /** x of the first member */
  x: number;
}

const ORDERING_PASSES = 3;
const REFINE_PASSES = 12;
/** Pull towards the current position for blocks with no family ties, so they stay put. */
const FREE_BLOCK_WEIGHT = 0.5;

/**
 * Assigns x, y coordinates to every person.
 *
 * y comes straight from the generation. x is computed per generation row:
 *  1. Partners in a row are grouped into rigid blocks (couple adjacency).
 *  2. Blocks are ordered with barycentre sweeps (down by parents, up by
 *     children) so sibling groups stay contiguous and lines don't cross.
 *  3. x is refined by repeatedly pulling each block towards its parents'
 *     midpoint and its children's midpoint, solved per row as a weighted
 *     isotonic regression so the order and minimum spacing are preserved.
 */
export class PositionResolver {

  /**
   * Assign x, y positions to all persons.
   *
   * @param persons       - Array of all persons (array order breaks ties in row order).
   * @param relationships - Array of all relationships.
   * @param generations   - Map of person id to generation number.
   * @param nodeSize      - Node diameter; partners/siblings are never closer than this.
   * @returns Map of personId to { x, y }.
   */
  resolve(
    persons: Person[],
    relationships: Relationship[],
    generations: Map<string, number>,
    nodeSize: number = DEFAULT_NODE_SIZE,
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    if (!persons || persons.length === 0) return positions;

    const ids = new Set(persons.map(p => p.id));
    const discovery = new Map(persons.map((p, i) => [p.id, i]));
    const genOf = (id: string) => generations.get(id) ?? 0;

    // ---------------------------------------------------------------
    // 1. Look-ups
    // ---------------------------------------------------------------
    const partnersOf = new Map<string, Set<string>>();
    for (const rel of relationships) {
      if (rel.type === 'child') continue;
      if (!ids.has(rel.person1Id) || !ids.has(rel.person2Id) || rel.person1Id === rel.person2Id) continue;
      if (!partnersOf.has(rel.person1Id)) partnersOf.set(rel.person1Id, new Set());
      if (!partnersOf.has(rel.person2Id)) partnersOf.set(rel.person2Id, new Set());
      partnersOf.get(rel.person1Id)!.add(rel.person2Id);
      partnersOf.get(rel.person2Id)!.add(rel.person1Id);
    }

    // Families: children live in childrenIds on any relationship
    const families: Family[] = [];
    const parentFamilies = new Map<string, Family[]>(); // childId -> families they are a child of
    const childFamilies = new Map<string, Family[]>(); // parentId -> families they are a parent of
    for (const rel of relationships) {
      const parents = [...new Set([rel.person1Id, rel.person2Id])].filter(id => ids.has(id));
      const children = (rel.childrenIds ?? []).filter(id => ids.has(id) && !parents.includes(id));
      if (parents.length === 0 || children.length === 0) continue;
      const fam: Family = { parents, children };
      families.push(fam);
      for (const c of children) parentFamilies.set(c, [...(parentFamilies.get(c) ?? []), fam]);
      for (const p of parents) childFamilies.set(p, [...(childFamilies.get(p) ?? []), fam]);
    }

    // ---------------------------------------------------------------
    // 2. Rows and blocks
    // ---------------------------------------------------------------
    const rowIds = new Map<number, string[]>();
    for (const p of persons) {
      const g = genOf(p.id);
      rowIds.set(g, [...(rowIds.get(g) ?? []), p.id]);
    }
    const gens = [...rowIds.keys()].sort((a, b) => a - b);

    const rows = new Map<number, Block[]>();
    const blockOf = new Map<string, Block>();
    const offsetOf = new Map<string, number>();
    for (const g of gens) {
      const blocks = this.buildBlocks(rowIds.get(g)!, partnersOf, discovery, nodeSize);
      rows.set(g, blocks);
      for (const b of blocks) b.members.forEach(m => blockOf.set(m, b));
    }
    const refreshOffsets = (b: Block) => b.members.forEach((m, i) => offsetOf.set(m, b.offsets[i]));
    rows.forEach(blocks => blocks.forEach(refreshOffsets));

    const xOf = (id: string) => {
      const b = blockOf.get(id)!;
      return b.x + offsetOf.get(id)!;
    };
    const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
    const center = (b: Block) => b.x + b.width / 2;

    const gapBetween = (a: Block, b: Block) => {
      const shareParents = a.members.some(m =>
        (parentFamilies.get(m) ?? []).some(f => f.children.some(c => b.members.includes(c))),
      );
      return Math.max(nodeSize, shareParents ? SIBLING_SPACING_X : SIBLING_SPACING_X + FAMILY_GAP_X);
    };

    const pack = (blocks: Block[]) => {
      let x = 0;
      blocks.forEach((b, i) => {
        if (i > 0) x += blocks[i - 1].width + gapBetween(blocks[i - 1], b);
        b.x = x;
      });
    };

    // ---------------------------------------------------------------
    // 3. Ordering sweeps (crossing reduction)
    // ---------------------------------------------------------------
    gens.forEach(g => pack(rows.get(g)!));

    const parentKey = (b: Block): number | undefined => {
      const keys: number[] = [];
      for (const m of b.members) {
        for (const f of parentFamilies.get(m) ?? []) {
          const placed = f.parents.filter(p => genOf(p) < genOf(m));
          if (placed.length === 0) continue;
          // Small tie-breaker keeps siblings in childrenIds order
          keys.push(mean(placed.map(xOf)) + f.children.indexOf(m) * 1e-3);
        }
      }
      return keys.length ? mean(keys) : undefined;
    };
    const childKey = (b: Block): number | undefined => {
      const keys: number[] = [];
      for (const m of b.members) {
        for (const f of childFamilies.get(m) ?? []) {
          const placed = f.children.filter(c => genOf(c) > genOf(m));
          if (placed.length) keys.push(mean(placed.map(xOf)));
        }
      }
      return keys.length ? mean(keys) : undefined;
    };

    const reorder = (g: number, keyFn: (b: Block) => number | undefined) => {
      const blocks = rows.get(g)!;
      const keyed = blocks.map(b => ({ b, k: keyFn(b) ?? center(b) }));
      keyed.sort((p, q) => p.k - q.k); // stable: ties keep current order
      const ordered = keyed.map(e => e.b);
      ordered.forEach(b => this.orientBlock(b, parentFamilies, genOf, xOf, nodeSize, partnersOf));
      ordered.forEach(refreshOffsets);
      pack(ordered);
      rows.set(g, ordered);
    };

    for (let pass = 0; pass < ORDERING_PASSES; pass++) {
      for (const g of gens.slice(1)) reorder(g, parentKey);
      for (const g of gens.slice(0, -1).reverse()) reorder(g, childKey);
    }
    for (const g of gens.slice(1)) reorder(g, parentKey);

    // ---------------------------------------------------------------
    // 4. Coordinate refinement
    // ---------------------------------------------------------------
    const refine = (g: number) => {
      const blocks = rows.get(g)!;
      const targets = blocks.map(b => {
        let sum = 0;
        let weight = 0;
        // Children want to sit under their parents' midpoint
        for (const m of b.members) {
          for (const f of parentFamilies.get(m) ?? []) {
            const placed = f.parents.filter(p => genOf(p) < genOf(m));
            if (placed.length === 0) continue;
            sum += mean(placed.map(xOf)) - offsetOf.get(m)!;
            weight += 1;
          }
        }
        // Parents want to sit over their children's midpoint
        const seen = new Set<Family>();
        for (const m of b.members) {
          for (const f of childFamilies.get(m) ?? []) {
            if (seen.has(f)) continue;
            seen.add(f);
            const kids = f.children.filter(c => genOf(c) > genOf(m));
            const ownParents = f.parents.filter(p => b.members.includes(p));
            if (kids.length === 0) continue;
            const kidXs = kids.map(xOf);
            const kidMid = (Math.min(...kidXs) + Math.max(...kidXs)) / 2;
            sum += kidMid - mean(ownParents.map(p => offsetOf.get(p)!));
            weight += 1;
          }
        }
        if (weight === 0) return { target: b.x, weight: FREE_BLOCK_WEIGHT };
        return { target: sum / weight, weight };
      });

      const gaps = blocks.map((b, i) => (i === 0 ? 0 : blocks[i - 1].width + gapBetween(blocks[i - 1], b)));
      const xs = isotonicWithGaps(
        targets.map(t => t.target),
        targets.map(t => t.weight),
        gaps,
      );
      blocks.forEach((b, i) => (b.x = xs[i]));
    };

    for (let pass = 0; pass < REFINE_PASSES; pass++) {
      gens.forEach(refine);
      [...gens].reverse().forEach(refine);
    }

    // ---------------------------------------------------------------
    // 5. Emit, centred horizontally around x = 0
    // ---------------------------------------------------------------
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of persons) {
      const x = xOf(p.id);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    const shift = (minX + maxX) / 2;
    for (const p of persons) {
      positions.set(p.id, { x: Math.round(xOf(p.id) - shift), y: genOf(p.id) * GENERATION_SPACING_Y });
    }
    return positions;
  }

  // -----------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------

  /**
   * Group a row into blocks of connected partners and order each block:
   * a chain of partners is laid out along the chain; otherwise the person
   * with the most partners goes in the middle with partners split either side.
   */
  private buildBlocks(
    row: string[],
    partnersOf: Map<string, Set<string>>,
    discovery: Map<string, number>,
    nodeSize: number,
  ): Block[] {
    const inRow = new Set(row);
    const visited = new Set<string>();
    const blocks: Block[] = [];
    const byDiscovery = (a: string, b: string) => discovery.get(a)! - discovery.get(b)!;
    const rowPartners = (id: string) => [...(partnersOf.get(id) ?? [])].filter(p => inRow.has(p)).sort(byDiscovery);

    for (const start of row) {
      if (visited.has(start)) continue;
      const component: string[] = [];
      const queue = [start];
      visited.add(start);
      while (queue.length) {
        const id = queue.shift()!;
        component.push(id);
        for (const p of rowPartners(id)) {
          if (!visited.has(p)) {
            visited.add(p);
            queue.push(p);
          }
        }
      }
      component.sort(byDiscovery);

      const degree = new Map(component.map(id => [id, rowPartners(id).length]));
      const edges = component.reduce((s, id) => s + degree.get(id)!, 0) / 2;
      let members: string[];

      if (component.length === 1) {
        members = component;
      } else if (Math.max(...degree.values()) <= 2 && edges === component.length - 1) {
        // Simple chain: walk from the first-discovered end
        const end = component.find(id => degree.get(id) === 1)!;
        members = [end];
        while (members.length < component.length) {
          const last = members[members.length - 1];
          members.push(rowPartners(last).find(p => !members.includes(p))!);
        }
      } else {
        const hub = [...component].sort((a, b) => degree.get(b)! - degree.get(a)! || byDiscovery(a, b))[0];
        const others = component.filter(id => id !== hub);
        const half = Math.floor(others.length / 2);
        members = [...others.slice(0, half), hub, ...others.slice(half)];
      }

      const block: Block = { members, offsets: [], width: 0, x: 0 };
      this.layoutBlock(block, partnersOf, nodeSize);
      blocks.push(block);
    }
    return blocks;
  }

  private layoutBlock(block: Block, partnersOf: Map<string, Set<string>>, nodeSize: number) {
    let x = 0;
    block.offsets = block.members.map((id, i) => {
      if (i > 0) {
        const coupled = partnersOf.get(block.members[i - 1])?.has(id) ?? false;
        x += Math.max(nodeSize, coupled ? COUPLE_SPACING_X : SIBLING_SPACING_X);
      }
      return x;
    });
    block.width = x;
  }

  /**
   * Flip a block left-to-right when its members' parents are laid out in the
   * opposite order (e.g. husband's parents are on the right).
   */
  private orientBlock(
    block: Block,
    parentFamilies: Map<string, Family[]>,
    genOf: (id: string) => number,
    xOf: (id: string) => number,
    nodeSize: number,
    partnersOf: Map<string, Set<string>>,
  ) {
    if (block.members.length < 2) return;
    const samples: { i: number; px: number }[] = [];
    block.members.forEach((m, i) => {
      for (const f of parentFamilies.get(m) ?? []) {
        const placed = f.parents.filter(p => genOf(p) < genOf(m));
        if (placed.length) samples.push({ i, px: placed.reduce((s, p) => s + xOf(p), 0) / placed.length });
      }
    });
    if (samples.length < 2) return;
    const meanI = samples.reduce((s, v) => s + v.i, 0) / samples.length;
    const corr = samples.reduce((s, v) => s + (v.i - meanI) * v.px, 0);
    if (corr < 0) {
      const oldX = block.x;
      block.members.reverse();
      this.layoutBlock(block, partnersOf, nodeSize);
      block.x = oldX;
    }
  }
}

/**
 * Weighted least squares placement of an ordered row:
 *   minimise  sum w_i (x_i - t_i)^2   subject to  x_i >= x_{i-1} + gap_i
 * Substituting y_i = x_i - (gap_1 + ... + gap_i) turns this into isotonic
 * regression, solved with pool-adjacent-violators.
 */
export function isotonicWithGaps(targets: number[], weights: number[], gaps: number[]): number[] {
  const n = targets.length;
  const cum: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += gaps[i];
    cum.push(acc);
  }

  // Pools of { value, weight, count }
  const pools: { v: number; w: number; n: number }[] = [];
  for (let i = 0; i < n; i++) {
    pools.push({ v: targets[i] - cum[i], w: weights[i], n: 1 });
    while (pools.length > 1 && pools[pools.length - 2].v > pools[pools.length - 1].v) {
      const b = pools.pop()!;
      const a = pools.pop()!;
      const w = a.w + b.w;
      pools.push({ v: (a.v * a.w + b.v * b.w) / w, w, n: a.n + b.n });
    }
  }

  const xs: number[] = [];
  for (const pool of pools) {
    for (let k = 0; k < pool.n; k++) xs.push(pool.v + cum[xs.length]);
  }
  return xs;
}
