import { deriveConsanguinity, consanguinityLabel, isConsanguineous } from './consanguinity';
import { Person, Relationship } from '../types';

const person = (id: string, gender: Person['gender'] = 'unknown'): Person => ({
  id, gender, type: 'standard', isDeceased: false, isProband: false, conditions: [],
});
const family = (id: string, a: string, b: string, children: string[]): Relationship => ({
  id, type: 'marriage', person1Id: a, person2Id: b, childrenIds: children, consanguinity: 'none',
});

// gg1+gg2 -> g1, g2 (siblings); g1+g1w -> p1; g2+g2w -> p2; p1+p1w -> c1; p2+p2w -> c2, c3
const persons = ['gg1', 'gg2', 'g1', 'g1w', 'g2', 'g2w', 'p1', 'p1w', 'p2', 'p2w', 'c1', 'c2', 'c3']
  .map(id => person(id, id === 'g2' ? 'female' : 'male'));
const rels = [
  family('r0', 'gg1', 'gg2', ['g1', 'g2']),
  family('r1', 'g1', 'g1w', ['p1']),
  family('r2', 'g2', 'g2w', ['p2']),
  family('r3', 'p1', 'p1w', ['c1']),
  family('r4', 'p2', 'p2w', ['c2', 'c3']),
];
const derive = (a: string, b: string) => deriveConsanguinity(persons, rels, a, b);

describe('deriveConsanguinity', () => {
  it('names relationships by distance to the nearest common ancestor', () => {
    expect(derive('p1', 'p2')).toEqual({ relation: 'first-cousins', degree: 'third-degree' });
    expect(derive('c1', 'c2')).toEqual({ relation: 'second-cousins', degree: 'distant' });
    expect(derive('p1', 'c2')).toEqual({ relation: 'first-cousins-once-removed', degree: 'distant' });
    expect(derive('g2', 'p1')).toEqual({ relation: 'aunt-nephew', degree: 'second-degree' }); // g2 is female
    expect(derive('g1', 'p2')).toEqual({ relation: 'uncle-niece', degree: 'second-degree' });
    expect(derive('c2', 'c3')).toEqual({ relation: 'other', degree: 'first-degree' }); // siblings
  });

  it('returns null for people with no common ancestor in the tree', () => {
    expect(derive('p1', 'p1w')).toBeNull();
    expect(derive('gg1', 'gg2')).toBeNull();
  });
});

describe('consanguinity labels', () => {
  const rel = (extra: Partial<Relationship>): Relationship => ({ ...family('x', 'a', 'b', []), ...extra });

  it('prefers the plain-language relation and falls back to the degree', () => {
    expect(consanguinityLabel(rel({ consanguinityRelation: 'first-cousins', consanguinity: 'third-degree' }))).toBe('1st cousins');
    expect(consanguinityLabel(rel({ consanguinity: 'second-degree' }))).toBe('2nd degree relatives');
  });

  it('treats "possibly related" as consanguineous for drawing', () => {
    expect(isConsanguineous(rel({}))).toBe(false);
    expect(isConsanguineous(rel({ consanguinityRelation: 'unknown' }))).toBe(true);
  });
});
