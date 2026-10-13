import { buildGenogramFromIntake } from './KinshipBuilder';
import { LayoutEngine } from './LayoutEngine';
import { validateGenogramData } from '../utils/json-schema';
import { DEFAULT_NODE_SIZE } from '../utils/constants';
import { GenogramData, IntakeForm, Person, Relationship } from '../types';

// The worked example from the design discussion
const SARAH: IntakeForm = {
  patient: { fullName: 'Sarah', gender: 'female', age: 34, conditions: ['Anxiety'] },
  father: { fullName: 'John', status: 'deceased', ageAtDeath: 58, causeOfDeath: 'Heart attack', conditions: ['Heart disease'] },
  mother: { fullName: 'Mary', age: 60, conditions: ['Type 2 diabetes'] },
  siblings: [{ fullName: 'Mike', gender: 'male', age: 38, conditions: ['type 2 diabetes'] }],
  partners: [
    {
      fullName: 'David',
      relationshipType: 'marriage',
      children: [{ fullName: 'Emma', gender: 'female', age: 5 }],
    },
  ],
  grandparents: { maternalGrandmother: { conditions: ['Breast cancer'] } },
};

function byName(data: GenogramData, name: string): Person {
  const p = data.persons.find(x => x.fullName === name);
  if (!p) throw new Error(`No person named ${name}`);
  return p;
}

function coupleOf(data: GenogramData, a: Person, b: Person): Relationship | undefined {
  return data.relationships.find(
    r => (r.person1Id === a.id && r.person2Id === b.id) || (r.person1Id === b.id && r.person2Id === a.id),
  );
}

function parentRel(data: GenogramData, child: Person): Relationship | undefined {
  return data.relationships.find(r => r.childrenIds.includes(child.id));
}

describe('KinshipBuilder', () => {
  describe('worked example (Sarah)', () => {
    const data = buildGenogramFromIntake(SARAH);

    it('produces valid GenogramData', () => {
      expect(validateGenogramData(data)).toEqual({ valid: true, errors: [] });
    });

    it('creates 8 people including a placeholder maternal grandfather', () => {
      expect(data.persons).toHaveLength(8);
      const placeholders = data.persons.filter(p => p.isPlaceholder);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].gender).toBe('male');
    });

    it('marks only the patient as proband', () => {
      expect(data.persons.filter(p => p.isProband).map(p => p.fullName)).toEqual(['Sarah']);
    });

    it('links parents as a couple with Sarah and Mike as children, oldest first', () => {
      const rel = coupleOf(data, byName(data, 'John'), byName(data, 'Mary'))!;
      expect(rel.type).toBe('marriage');
      expect(rel.person1Id).toBe(byName(data, 'John').id); // male first
      expect(rel.childrenIds).toEqual([byName(data, 'Mike').id, byName(data, 'Sarah').id]);
    });

    it('links Sarah and David with Emma as their child', () => {
      const rel = coupleOf(data, byName(data, 'Sarah'), byName(data, 'David'))!;
      expect(rel.childrenIds).toEqual([byName(data, 'Emma').id]);
      expect(byName(data, 'David').gender).toBe('male'); // defaults to opposite of patient
    });

    it('hangs Mary from the maternal grandparents', () => {
      const rel = parentRel(data, byName(data, 'Mary'))!;
      const gm = data.persons.find(p => p.id === rel.person2Id)!;
      expect(gm.gender).toBe('female');
      expect(gm.conditions.map(c => c.name)).toEqual(['Breast cancer']);
      expect(gm.isPlaceholder).toBeUndefined();
    });

    it('records ages, death and cause of death', () => {
      const john = byName(data, 'John');
      expect(john.isDeceased).toBe(true);
      expect(john.ageAtDeath).toBe(58);
      expect(john.age).toBeUndefined();
      expect(john.notes).toContain('Cause of death: Heart attack');
      expect(byName(data, 'Sarah').age).toBe(34);
    });

    it('reuses one condition (same id/colour/quadrant) for case-insensitive duplicates', () => {
      const mary = byName(data, 'Mary').conditions[0];
      const mike = byName(data, 'Mike').conditions[0];
      expect(mike.id).toBe(mary.id);
      expect(mike.color).toBe(mary.color);
      expect(mike.quadrant).toBe(mary.quadrant);
      expect(mike.name).toBe('Type 2 diabetes'); // first spelling wins
    });
  });

  it('builds just the patient from an empty questionnaire', () => {
    const data = buildGenogramFromIntake({ patient: { gender: 'male' } });
    expect(data.persons).toHaveLength(1);
    expect(data.relationships).toHaveLength(0);
    expect(data.persons[0].isProband).toBe(true);
    expect(data.persons[0].isPlaceholder).toBeUndefined();
  });

  it('creates both parents when only one is known', () => {
    const data = buildGenogramFromIntake({ patient: { gender: 'female' }, mother: { fullName: 'Ann' } });
    expect(data.persons).toHaveLength(3);
    const father = data.persons.find(p => p.gender === 'male')!;
    expect(father.isPlaceholder).toBe(true);
    expect(data.relationships[0].childrenIds).toHaveLength(1);
  });

  it('creates placeholder parents for siblings when parents were not described', () => {
    const data = buildGenogramFromIntake({
      patient: { gender: 'female' },
      siblings: [{ fullName: 'Tom', gender: 'male' }],
    });
    expect(data.persons.filter(p => p.isPlaceholder)).toHaveLength(2);
    expect(parentRel(data, byName(data, 'Tom'))!.childrenIds).toHaveLength(2);
  });

  it('treats a relative with nothing filled in as a placeholder', () => {
    const data = buildGenogramFromIntake({
      patient: { gender: 'male' },
      father: {},
      mother: { status: 'deceased' },
      siblings: [{ gender: 'female' }],
    });
    const nonPatient = data.persons.filter(p => !p.isProband);
    expect(nonPatient.find(p => p.gender === 'male')!.isPlaceholder).toBe(true); // father: empty
    expect(nonPatient.find(p => p.isDeceased)!.isPlaceholder).toBeUndefined(); // mother: known deceased
    expect(nonPatient.find(p => p.gender === 'female' && !p.isDeceased)!.isPlaceholder).toBe(true); // sibling: gender only
  });

  it('marks an "unknown" relative as a placeholder', () => {
    const data = buildGenogramFromIntake({ patient: { gender: 'male' }, father: { unknown: true } });
    expect(data.persons.find(p => p.gender === 'male' && !p.isProband)!.isPlaceholder).toBe(true);
  });

  it('hangs half-siblings from the shared parent and a placeholder other parent', () => {
    const data = buildGenogramFromIntake({
      patient: { gender: 'female' },
      father: { fullName: 'John' },
      mother: { fullName: 'Mary' },
      siblings: [
        { fullName: 'Full', gender: 'male' },
        { fullName: 'MatHalf', gender: 'female', parentage: 'mother' },
        { fullName: 'PatHalf', gender: 'male', parentage: 'father' },
      ],
    });
    const mary = byName(data, 'Mary');
    const john = byName(data, 'John');

    const matRel = parentRel(data, byName(data, 'MatHalf'))!;
    expect([matRel.person1Id, matRel.person2Id]).toContain(mary.id);
    expect([matRel.person1Id, matRel.person2Id]).not.toContain(john.id);
    expect(matRel.type).toBe('casual');

    const patRel = parentRel(data, byName(data, 'PatHalf'))!;
    expect([patRel.person1Id, patRel.person2Id]).toContain(john.id);
    expect([patRel.person1Id, patRel.person2Id]).not.toContain(mary.id);

    expect(parentRel(data, byName(data, 'Full'))).toBe(coupleOf(data, john, mary));
    expect(data.persons.filter(p => p.isPlaceholder)).toHaveLength(2);
  });

  it('groups twins with the patient', () => {
    const data = buildGenogramFromIntake({
      patient: { fullName: 'Pat', gender: 'female' },
      siblings: [
        { fullName: 'Twin', gender: 'female', twin: 'identical' },
        { fullName: 'Other', gender: 'male' },
      ],
    });
    const pat = byName(data, 'Pat');
    const twin = byName(data, 'Twin');
    expect(pat.twinGroupId).toBeDefined();
    expect(twin.twinGroupId).toBe(pat.twinGroupId);
    expect(pat.isIdenticalTwin).toBe(true);
    expect(byName(data, 'Other').twinGroupId).toBeUndefined();
  });

  it('keeps questionnaire order when some ages are missing', () => {
    const data = buildGenogramFromIntake({
      patient: { fullName: 'Pat', gender: 'female', age: 30 },
      siblings: [{ fullName: 'Older', gender: 'male' }],
    });
    expect(parentRel(data, byName(data, 'Pat'))!.childrenIds).toEqual([byName(data, 'Pat').id, byName(data, 'Older').id]);
  });

  it('supports multiple partners with their own children', () => {
    const data = buildGenogramFromIntake({
      patient: { fullName: 'Pat', gender: 'male' },
      partners: [
        { fullName: 'Ex', relationshipType: 'divorce', children: [{ fullName: 'A', gender: 'male' }] },
        { fullName: 'Wife', children: [{ fullName: 'B', gender: 'female' }] },
      ],
    });
    expect(coupleOf(data, byName(data, 'Pat'), byName(data, 'Ex'))!.type).toBe('divorce');
    expect(coupleOf(data, byName(data, 'Pat'), byName(data, 'Ex'))!.childrenIds).toEqual([byName(data, 'A').id]);
    expect(coupleOf(data, byName(data, 'Pat'), byName(data, 'Wife'))!.childrenIds).toEqual([byName(data, 'B').id]);
  });

  it('builds grandchildren and great-grandchildren through each child partner', () => {
    const data = buildGenogramFromIntake({
      patient: { fullName: 'Gran', gender: 'female', age: 82 },
      partners: [{
        fullName: 'Grandad',
        children: [
          {
            fullName: 'Son', gender: 'male', age: 55,
            partners: [{
              fullName: 'DIL',
              children: [{
                fullName: 'GS', gender: 'male', age: 30, conditions: ['Asthma'],
                partners: [{ unknown: true, children: [{ fullName: 'GGD', gender: 'female', age: 2 }] }],
              }],
            }],
          },
          { fullName: 'Daughter', gender: 'female', age: 50, partners: [{ unknown: true, children: [{ fullName: 'GD', gender: 'female' }] }] },
        ],
      }],
    });
    const son = byName(data, 'Son');
    const dil = byName(data, 'DIL');
    expect(dil.gender).toBe('female'); // defaults to opposite of the child
    expect(coupleOf(data, son, dil)!.childrenIds).toEqual([byName(data, 'GS').id]);
    expect(parentRel(data, byName(data, 'GGD'))!.person1Id).toBe(byName(data, 'GS').id);
    // Daughter's unknown partner is a male placeholder
    const gdRel = parentRel(data, byName(data, 'GD'))!;
    const other = data.persons.find(p => p.id === gdRel.person1Id)!;
    expect(other.isPlaceholder).toBe(true);
    expect(other.gender).toBe('male');
    expect(validateGenogramData(data).valid).toBe(true);

    new LayoutEngine().calculateLayout(data.persons, data.relationships);
    const gen = (n: string) => byName(data, n).y!;
    expect(gen('Son')).toBeLessThan(gen('GS'));
    expect(gen('GS')).toBeLessThan(gen('GGD'));
    expect(gen('GS')).toBe(gen('GD')); // cousins on one row
  });

  describe('aunts, uncles, cousins and consanguinity', () => {
    const COUSIN_MARRIAGE: IntakeForm = {
      patient: { fullName: 'Ali', gender: 'male', age: 30 },
      father: { fullName: 'Dad' },
      mother: { fullName: 'Mum' },
      paternalAuntsUncles: [
        {
          fullName: 'Uncle Omar',
          gender: 'male',
          partners: [{ fullName: 'Aunt Huda', children: [{ key: 'c1', fullName: 'Sara', gender: 'female', age: 28 }] }],
        },
      ],
      maternalAuntsUncles: [{ fullName: 'Aunt Mona', gender: 'female' }],
      partners: [{ linkedRelativeKey: 'c1', fullName: 'ignored', children: [{ fullName: 'Baby', gender: 'female' }] }],
    };
    const data = buildGenogramFromIntake(COUSIN_MARRIAGE);

    it('hangs aunts and uncles from placeholder grandparents on their side', () => {
      const dadRel = parentRel(data, byName(data, 'Dad'))!;
      expect(dadRel.childrenIds).toEqual([byName(data, 'Uncle Omar').id, byName(data, 'Dad').id]);
      const mumRel = parentRel(data, byName(data, 'Mum'))!;
      expect(mumRel.childrenIds).toEqual([byName(data, 'Mum').id, byName(data, 'Aunt Mona').id]);
      expect(data.persons.filter(p => p.isPlaceholder)).toHaveLength(4); // the 4 grandparents
    });

    it('reuses the cousin as the wife instead of creating a duplicate', () => {
      expect(data.persons.filter(p => p.fullName === 'Sara')).toHaveLength(1);
      expect(data.persons.find(p => p.fullName === 'ignored')).toBeUndefined();
      const marriage = coupleOf(data, byName(data, 'Ali'), byName(data, 'Sara'))!;
      expect(marriage.childrenIds).toEqual([byName(data, 'Baby').id]);
    });

    it('works out "first cousins" from the tree', () => {
      const marriage = coupleOf(data, byName(data, 'Ali'), byName(data, 'Sara'))!;
      expect(marriage.consanguinityRelation).toBe('first-cousins');
      expect(marriage.consanguinity).toBe('third-degree');
      expect(coupleOf(data, byName(data, 'Dad'), byName(data, 'Mum'))!.consanguinity).toBe('none');
    });

    it('lays out the cousin-marriage loop without overlaps, partners side by side', () => {
      const copy = structuredClone(data);
      new LayoutEngine().calculateLayout(copy.persons, copy.relationships);
      const ali = byName(copy, 'Ali');
      const sara = byName(copy, 'Sara');
      expect(ali.y).toBe(sara.y);
      expect(Math.abs(ali.x! - sara.x!)).toBeLessThanOrEqual(200);
      const rows = new Map<number, number[]>();
      for (const p of copy.persons) rows.set(p.y!, [...(rows.get(p.y!) ?? []), p.x!]);
      for (const xs of rows.values()) {
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(DEFAULT_NODE_SIZE);
      }
    });

    it('records a plain answer when the partner is not linked', () => {
      const d = buildGenogramFromIntake({
        patient: { fullName: 'Ali', gender: 'male' },
        partners: [{ fullName: 'Sara', consanguinity: 'second-cousins' }],
      });
      expect(d.relationships[0].consanguinityRelation).toBe('second-cousins');
      expect(d.relationships[0].consanguinity).toBe('distant');
    });

    it('records whether the parents are related', () => {
      const d = buildGenogramFromIntake({
        patient: { gender: 'female' },
        father: { fullName: 'Dad' },
        mother: { fullName: 'Mum' },
        parentsConsanguinity: 'first-cousins',
      });
      expect(coupleOf(d, byName(d, 'Dad'), byName(d, 'Mum'))!.consanguinityRelation).toBe('first-cousins');
    });

    it('detects an uncle-niece marriage from the tree', () => {
      const d = buildGenogramFromIntake({
        patient: { fullName: 'Lina', gender: 'female' },
        father: { fullName: 'Dad' },
        mother: { fullName: 'Mum' },
        paternalAuntsUncles: [{ key: 'u1', fullName: 'Uncle Sami', gender: 'male' }],
        partners: [{ linkedRelativeKey: 'u1' }],
      });
      const rel = coupleOf(d, byName(d, 'Lina'), byName(d, 'Uncle Sami'))!;
      expect(rel.consanguinityRelation).toBe('uncle-niece');
      expect(rel.consanguinity).toBe('second-degree');
      expect(validateGenogramData(d).valid).toBe(true);
    });
  });

  describe('Collins family core from the questionnaire (links in any part of the form)', () => {
    const COLLINS: IntakeForm = {
      patient: { fullName: 'Andrew', gender: 'male', age: 32 },
      father: { fullName: 'Matthew' },
      mother: { fullName: 'Lucy' },
      parentsConsanguinity: 'first-cousins',
      siblings: [
        // Hannah married her mother's brother Luke (entered later, under the mother's side)
        { fullName: 'Hannah', gender: 'female', partners: [{ linkedRelativeKey: 'luke', children: [{ key: 'daniel', fullName: 'Daniel', gender: 'male' }] }] },
        { fullName: 'Benjamin', gender: 'male', partners: [{ fullName: 'Esther' }] },
      ],
      paternalAuntsUncles: [
        // Natalie married Simon, an uncle on the mother's side, so Sarah is a cousin on both sides
        {
          key: 'natalie', fullName: 'Natalie', gender: 'female',
          partners: [{ linkedRelativeKey: 'simon', children: [{ key: 'sarah', fullName: 'Sarah', gender: 'female' }] }],
        },
        // Half uncle: grandfather's son with another partner
        {
          key: 'francis', fullName: 'Francis', gender: 'male', parentage: 'father',
          partners: [{ fullName: 'Nora', children: [{ key: 'lily', fullName: 'Lily', gender: 'female' }] }],
        },
      ],
      maternalAuntsUncles: [
        { key: 'simon', fullName: 'Simon', gender: 'male' },
        { key: 'luke', fullName: 'Luke', gender: 'male' },
      ],
      partners: [{ linkedRelativeKey: 'sarah', children: [{ fullName: 'Adam', gender: 'male' }, { fullName: 'Mia', gender: 'female' }] }],
    };
    const data = buildGenogramFromIntake(COLLINS);

    it('creates each linked relative once', () => {
      for (const name of ['Simon', 'Luke', 'Sarah']) {
        expect(data.persons.filter(p => p.fullName === name)).toHaveLength(1);
      }
    });

    it("links an aunt to an uncle from the other side, so their daughter is a cousin on both sides", () => {
      const sarahParents = parentRel(data, byName(data, 'Sarah'))!;
      const names = [sarahParents.person1Id, sarahParents.person2Id].map(id => data.persons.find(p => p.id === id)!.fullName);
      expect(names.sort()).toEqual(['Natalie', 'Simon']);
      expect(coupleOf(data, byName(data, 'Andrew'), byName(data, 'Sarah'))!.consanguinityRelation).toBe('first-cousins');
    });

    it("links a sibling's partner to a relative (uncle-niece) and adds their children as nephews/nieces", () => {
      const rel = coupleOf(data, byName(data, 'Hannah'), byName(data, 'Luke'))!;
      expect(rel.consanguinityRelation).toBe('uncle-niece');
      expect(rel.childrenIds).toEqual([byName(data, 'Daniel').id]);
      expect(coupleOf(data, byName(data, 'Benjamin'), byName(data, 'Esther'))).toBeDefined();
    });

    it('hangs a half uncle from the grandfather and a placeholder other partner', () => {
      const francisParents = parentRel(data, byName(data, 'Francis'))!;
      const matthewParents = parentRel(data, byName(data, 'Matthew'))!;
      const grandfather = matthewParents.person1Id; // male partner first
      expect([francisParents.person1Id, francisParents.person2Id]).toContain(grandfather);
      expect(francisParents.id).not.toBe(matthewParents.id);
      const other = data.persons.find(p => [francisParents.person1Id, francisParents.person2Id].includes(p.id) && p.id !== grandfather)!;
      expect(other.isPlaceholder).toBe(true);
      expect(other.gender).toBe('female');
    });

    it('records the parents as first cousins', () => {
      expect(coupleOf(data, byName(data, 'Matthew'), byName(data, 'Lucy'))!.consanguinityRelation).toBe('first-cousins');
    });

    it('lays out cleanly: children below parents, partners side by side, no overlaps', () => {
      const copy = structuredClone(data);
      new LayoutEngine().calculateLayout(copy.persons, copy.relationships);
      const y = (id: string) => copy.persons.find(p => p.id === id)!.y!;
      for (const rel of copy.relationships) {
        expect(y(rel.person1Id)).toBe(y(rel.person2Id));
        for (const c of rel.childrenIds) expect(y(c)).toBeGreaterThan(y(rel.person1Id));
      }
      const rows = new Map<number, number[]>();
      for (const p of copy.persons) rows.set(p.y!, [...(rows.get(p.y!) ?? []), p.x!]);
      for (const xs of rows.values()) {
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(DEFAULT_NODE_SIZE);
      }
      expect(validateGenogramData(copy).valid).toBe(true);
    });
  });

  it('reuses available conditions by name', () => {
    const data = buildGenogramFromIntake(
      { patient: { gender: 'male', conditions: ['asthma'] } },
      { availableConditions: [{ id: 'c-asthma', name: 'Asthma', color: '#123456' }] },
    );
    expect(data.persons[0].conditions[0]).toMatchObject({ id: 'c-asthma', name: 'Asthma', color: '#123456' });
  });

  it('gives each condition on a person its own quadrant, max 4 drawn', () => {
    const data = buildGenogramFromIntake({
      patient: { gender: 'male', conditions: ['A', 'B', 'C', 'D', 'E', 'a'] },
    });
    const conds = data.persons[0].conditions;
    expect(conds.map(c => c.name)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(conds.slice(0, 4).map(c => c.quadrant).sort()).toEqual([1, 2, 3, 4]);
    expect(conds[4].quadrant).toBeUndefined();
  });

  it('trims and collapses whitespace in full names', () => {
    const data = buildGenogramFromIntake({ patient: { fullName: '  Sarah   Ann  Johnson ', gender: 'female' } });
    expect(data.persons[0].fullName).toBe('Sarah Ann Johnson');
    expect(data.metadata?.title).toBe('Genogram - Sarah Ann Johnson');
  });

  it('ignores invalid ages', () => {
    const data = buildGenogramFromIntake({ patient: { gender: 'male', age: -3 } });
    expect(data.persons[0].age).toBeUndefined();
  });
});

describe('KinshipBuilder + LayoutEngine', () => {
  const COMPLEX: IntakeForm = {
    patient: { fullName: 'Pat', gender: 'female', age: 40 },
    father: { fullName: 'Dad' },
    mother: { fullName: 'Mum' },
    parentsRelationship: 'divorce',
    siblings: [
      { fullName: 'Bro', gender: 'male', age: 44 },
      { fullName: 'Sis', gender: 'female', age: 36 },
      { fullName: 'MatHalf', gender: 'male', parentage: 'mother' },
      { fullName: 'PatHalf', gender: 'female', parentage: 'father' },
    ],
    partners: [
      {
        fullName: 'Ex', relationshipType: 'divorce',
        children: [{ fullName: 'K1', gender: 'male', partners: [{ fullName: 'K1W', children: [{ fullName: 'G1', gender: 'female' }] }] }],
      },
      {
        fullName: 'Husband',
        children: [
          { fullName: 'K2', gender: 'female', partners: [{ unknown: true, children: [{ fullName: 'G2', gender: 'male' }, { fullName: 'G3', gender: 'female' }] }] },
          { fullName: 'K3', gender: 'male' },
        ],
      },
    ],
    grandparents: {
      maternalGrandmother: { fullName: 'MGM' },
      paternalGrandfather: { fullName: 'PGF' },
    },
  };

  for (const [label, intake] of [['Sarah example', SARAH], ['complex family', COMPLEX]] as const) {
    describe(label, () => {
      const data = buildGenogramFromIntake(intake);
      new LayoutEngine().calculateLayout(data.persons, data.relationships);

      it('puts children one generation below their parents', () => {
        for (const rel of data.relationships) {
          const parentY = data.persons.find(p => p.id === rel.person1Id)!.y!;
          for (const cid of rel.childrenIds) {
            expect(data.persons.find(p => p.id === cid)!.y!).toBeGreaterThan(parentY);
          }
        }
      });

      it('does not overlap nodes within a generation', () => {
        const rows = new Map<number, number[]>();
        for (const p of data.persons) rows.set(p.y!, [...(rows.get(p.y!) ?? []), p.x!]);
        for (const xs of rows.values()) {
          xs.sort((a, b) => a - b);
          for (let i = 1; i < xs.length; i++) {
            expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(DEFAULT_NODE_SIZE);
          }
        }
      });

      it('keeps each sibling group contiguous so child lines do not cross', () => {
        const families = data.relationships.filter(r => r.childrenIds.length > 0);
        const xOf = (id: string) => data.persons.find(p => p.id === id)!.x!;
        for (const fam of families) {
          const xs = fam.childrenIds.map(xOf);
          const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
          for (const other of families) {
            if (other === fam) continue;
            for (const cid of other.childrenIds) {
              const child = data.persons.find(p => p.id === cid)!;
              if (child.y !== data.persons.find(p => p.id === fam.childrenIds[0])!.y) continue;
              const x = child.x!;
              expect(x > lo && x < hi).toBe(false);
            }
          }
        }
      });

      it('keeps partners on the same row', () => {
        for (const rel of data.relationships) {
          const a = data.persons.find(p => p.id === rel.person1Id)!;
          const b = data.persons.find(p => p.id === rel.person2Id)!;
          expect(a.y).toBe(b.y);
        }
      });
    });
  }
});
