import { Person, Relationship } from '../types';

/**
 * Calculates generation levels (rows) for all persons. The proband is
 * generation 0, parents -1, children 1, and so on.
 *
 * Generations follow blood lines first: a child is always below both
 * parents. Partners share a row: people who married in, and in-law
 * families, move to their partner's row. When blood relatives from
 * different generations are partners (uncle and niece, first cousins once
 * removed), the older one is drawn on the younger one's row with a longer
 * line from their own parents, so no child ends up on a parent's row.
 */
export class GenerationCalculator {

  /**
   * @param persons       - Array of all persons in the genogram.
   * @param relationships - Array of all relationships.
   * @returns Map from person id to generation number.
   */
  calculate(persons: Person[], relationships: Relationship[]): Map<string, number> {
    const generations = new Map<string, number>();
    if (!persons || persons.length === 0) return generations;

    const ids = new Set(persons.map(p => p.id));
    const proband = persons.find(p => p.isProband) ?? persons[0];

    // ---------------------------------------------------------------
    // Links
    // ---------------------------------------------------------------
    const parentsOf = new Map<string, Set<string>>();
    const childrenOf = new Map<string, Set<string>>();
    const partnerPairs: [string, string][] = [];
    const hasPartner = new Set<string>();

    const add = (map: Map<string, Set<string>>, key: string, value: string) => {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(value);
    };

    for (const rel of relationships) {
      const parents = [rel.person1Id, rel.person2Id].filter(id => ids.has(id));
      if (rel.type !== 'child' && parents.length === 2 && parents[0] !== parents[1]) {
        partnerPairs.push([parents[0], parents[1]]);
        hasPartner.add(parents[0]);
        hasPartner.add(parents[1]);
      }
      for (const child of rel.childrenIds ?? []) {
        if (!ids.has(child)) continue;
        for (const parent of parents) {
          if (parent === child) continue;
          add(parentsOf, child, parent);
          add(childrenOf, parent, child);
        }
      }
    }

    // ---------------------------------------------------------------
    // Relax constraints until stable. Every rule only moves people down
    // (increases the generation), so this settles quickly.
    //   1. A child is at least one row below each parent.
    //   2. Ancestors move down to sit one row above their nearest child.
    //      This keeps in-law and married-in families next to their partner,
    //      and draws the older partner of a couple from different
    //      generations (uncle-niece, cousins once removed) on the younger
    //      partner's row, with a longer line down from their own parents.
    //   3. Partners share a row (the one higher up moves down). Since a
    //      child is always kept below its parents, moving people down can
    //      never put a child on its parent's row.
    // ---------------------------------------------------------------
    for (const p of persons) generations.set(p.id, 0);
    const gen = (id: string) => generations.get(id)!;
    const raise = (id: string, value: number) => {
      if (value > gen(id)) {
        generations.set(id, value);
        return true;
      }
      return false;
    };

    const maxPasses = persons.length * 4 + 10; // guards against cyclic (invalid) parent links
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;
      for (const p of persons) {
        const parents = parentsOf.get(p.id);
        if (parents) {
          for (const parent of parents) changed = raise(p.id, gen(parent) + 1) || changed;
        }
        const children = childrenOf.get(p.id);
        if (children && children.size) {
          const nearest = Math.min(...[...children].map(gen));
          changed = raise(p.id, nearest - 1) || changed;
        }
      }
      for (const [a, b] of partnerPairs) {
        const g = Math.max(gen(a), gen(b));
        changed = raise(a, g) || changed;
        changed = raise(b, g) || changed;
      }
      if (!changed) break;
    }

    // People with no links at all stay on the proband's row
    for (const p of persons) {
      if (!parentsOf.has(p.id) && !childrenOf.has(p.id) && !hasPartner.has(p.id) && p.id !== proband.id) {
        generations.set(p.id, gen(proband.id));
      }
    }

    // Proband = 0
    const offset = gen(proband.id);
    for (const p of persons) generations.set(p.id, gen(p.id) - offset);
    return generations;
  }
}
