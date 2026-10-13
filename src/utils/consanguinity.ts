import { ConsanguinityRelation, ConsanguinityType, Person, Relationship } from '../types';

/** Genetic degree recorded for each plain-language relation */
export const RELATION_DEGREE: Record<ConsanguinityRelation, ConsanguinityType> = {
  'uncle-niece': 'second-degree',
  'aunt-nephew': 'second-degree',
  'first-cousins': 'third-degree',
  'first-cousins-once-removed': 'distant',
  'second-cousins': 'distant',
  other: 'distant',
  unknown: 'none',
};

/** Options for forms, in the order clinicians usually meet them */
export const RELATION_OPTIONS: [ConsanguinityRelation, string][] = [
  ['first-cousins', 'First cousins'],
  ['second-cousins', 'Second cousins'],
  ['first-cousins-once-removed', 'First cousins once removed'],
  ['uncle-niece', 'Uncle and niece'],
  ['aunt-nephew', 'Aunt and nephew'],
  ['other', 'Other / distant blood relatives'],
  ['unknown', 'Possibly related (unknown)'],
];

/** Short label drawn on the couple line */
const RELATION_LABEL: Record<ConsanguinityRelation, string> = {
  'first-cousins': '1st cousins',
  'first-cousins-once-removed': '1st cousins 1x removed',
  'second-cousins': '2nd cousins',
  'uncle-niece': 'Uncle–niece',
  'aunt-nephew': 'Aunt–nephew',
  other: 'Blood relatives',
  unknown: 'Related?',
};

const DEGREE_LABEL: Record<ConsanguinityType, string> = {
  none: '',
  'first-degree': '1st degree relatives',
  'second-degree': '2nd degree relatives',
  'third-degree': '3rd degree relatives',
  distant: 'Blood relatives',
};

/** True when a couple should be drawn as consanguineous */
export function isConsanguineous(rel: Relationship): boolean {
  return rel.consanguinity !== 'none' || rel.consanguinityRelation !== undefined;
}

/** Label for the couple line, preferring the plain-language relation */
export function consanguinityLabel(rel: Relationship): string {
  if (rel.consanguinityRelation) return RELATION_LABEL[rel.consanguinityRelation];
  return DEGREE_LABEL[rel.consanguinity] ?? '';
}

/**
 * Work out how two people are related by blood from the parent links in the
 * tree: walk up from each to their nearest common ancestor. Returns null when
 * they share no ancestor in the tree.
 */
export function deriveConsanguinity(
  persons: Person[],
  relationships: Relationship[],
  aId: string,
  bId: string,
): { relation: ConsanguinityRelation; degree: ConsanguinityType } | null {
  const parentsOf = new Map<string, string[]>();
  for (const rel of relationships) {
    for (const child of rel.childrenIds ?? []) {
      parentsOf.set(child, [...(parentsOf.get(child) ?? []), rel.person1Id, rel.person2Id]);
    }
  }

  const ancestorDepths = (id: string) => {
    const depths = new Map<string, number>();
    const queue: [string, number][] = [[id, 0]];
    while (queue.length) {
      const [cur, d] = queue.shift()!;
      for (const p of parentsOf.get(cur) ?? []) {
        if (!depths.has(p)) {
          depths.set(p, d + 1);
          queue.push([p, d + 1]);
        }
      }
    }
    return depths;
  };

  const da = ancestorDepths(aId);
  const db = ancestorDepths(bId);
  let best: [number, number] | null = null;
  for (const [anc, a] of da) {
    const b = db.get(anc);
    if (b === undefined) continue;
    if (!best || a + b < best[0] + best[1]) best = [a, b];
  }
  if (!best) return null;

  const [a, b] = best;
  const near = Math.min(a, b);
  const far = Math.max(a, b);
  const degreeNum = a + b - 1;
  const degree: ConsanguinityType =
    degreeNum <= 1 ? 'first-degree' : degreeNum === 2 ? 'second-degree' : degreeNum === 3 ? 'third-degree' : 'distant';

  let relation: ConsanguinityRelation = 'other';
  if (near === 1 && far === 2) {
    // The one a single generation below the common ancestor is the uncle/aunt
    const elder = persons.find(p => p.id === (a === 1 ? aId : bId));
    relation = elder?.gender === 'female' ? 'aunt-nephew' : 'uncle-niece';
  } else if (near === 2 && far === 2) {
    relation = 'first-cousins';
  } else if (near === 2 && far === 3) {
    relation = 'first-cousins-once-removed';
  } else if (near === 3 && far === 3) {
    relation = 'second-cousins';
  }
  return { relation, degree };
}
