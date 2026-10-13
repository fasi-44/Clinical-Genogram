import { LayoutEngine } from './LayoutEngine';
import { isotonicWithGaps } from './PositionResolver';
import { DEFAULT_NODE_SIZE } from '../utils/constants';
import { GenogramData } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const load = (name: string): GenogramData =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../../demo/sample-data', `${name}.json`), 'utf8'));

describe('LayoutEngine on demo sample data', () => {
  for (const name of ['three-generation-family', 'complex-relationships', 'clinical-case-study', 'consanguinity-family']) {
    describe(name, () => {
      const data = load(name);
      new LayoutEngine().calculateLayout(data.persons, data.relationships);
      const byId = new Map(data.persons.map(p => [p.id, p]));

      it('places every child below its parents', () => {
        for (const rel of data.relationships) {
          for (const cid of rel.childrenIds ?? []) {
            expect(byId.get(cid)!.y!).toBeGreaterThan(byId.get(rel.person1Id)!.y!);
          }
        }
      });

      it('does not overlap nodes within a row', () => {
        const rows = new Map<number, number[]>();
        for (const p of data.persons) rows.set(p.y!, [...(rows.get(p.y!) ?? []), p.x!]);
        for (const xs of rows.values()) {
          xs.sort((a, b) => a - b);
          for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(DEFAULT_NODE_SIZE);
        }
      });
    });
  }

  it('aligns a disconnected family with the oldest generation (uncle in clinical-case-study)', () => {
    const data = load('clinical-case-study');
    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    const y = (id: string) => data.persons.find(p => p.id === id)!.y;
    expect(y('g0-uncle')).toBe(y('g0-father'));
    expect(y('g1-cousin')).toBe(y('g1-proband'));
  });

  it('draws a couple from different generations side by side, children below both', () => {
    const data = load('consanguinity-family');
    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    const gen = (id: string) => data.persons.find(p => p.id === id)!.generation!;
    // Uncle and niece: Luke is drawn on Hannah's row, below his own parents
    expect(gen('luke')).toBe(gen('hannah'));
    expect(gen('luke')).toBeGreaterThan(gen('frances'));
    expect(gen('daniel')).toBe(gen('hannah') + 1);
    // First cousins once removed: James on Ruth's row
    expect(gen('james')).toBe(gen('ruth'));
    expect(gen('james')).toBeGreaterThan(gen('oliver'));
  });

  it('puts married-in partners on their spouse row', () => {
    const data = load('consanguinity-family');
    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    const gen = (id: string) => data.persons.find(p => p.id === id)!.generation!;
    expect(gen('mary')).toBe(gen('henry'));
    expect(gen('peter')).toBe(gen('frances'));
    expect(gen('rachel')).toBe(gen('thomas'));
    expect(gen('andrew')).toBe(0); // proband
  });

  it('keeps an unlinked person on the proband row', () => {
    const data = load('three-generation-family');
    data.persons.push({ id: 'loner', gender: 'male', type: 'standard', isDeceased: false, isProband: false, conditions: [] });
    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    const proband = data.persons.find(p => p.isProband) ?? data.persons[0];
    expect(data.persons.find(p => p.id === 'loner')!.generation).toBe(proband.generation);
  });
});

describe('isotonicWithGaps', () => {
  it('returns targets unchanged when they already satisfy the gaps', () => {
    expect(isotonicWithGaps([0, 200, 400], [1, 1, 1], [0, 100, 100])).toEqual([0, 200, 400]);
  });

  it('spreads conflicting targets symmetrically around their mean', () => {
    expect(isotonicWithGaps([50, 50, 50], [1, 1, 1], [0, 100, 100])).toEqual([-50, 50, 150]);
  });

  it('respects weights', () => {
    const [a, b] = isotonicWithGaps([0, 0], [3, 1], [0, 100]);
    expect(b - a).toBe(100);
    expect(a).toBeCloseTo(-25);
  });
});
