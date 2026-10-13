import { GENOGRAM_TEMPLATES, buildTemplate } from './templates';
import { LayoutEngine } from './LayoutEngine';
import { validateGenogramData } from '../utils/json-schema';
import { GenogramData } from '../types';

const names = (d: GenogramData) => d.persons.map(p => p.fullName).sort();
const byName = (d: GenogramData, name: string) => d.persons.find(p => p.fullName === name)!;
const coupleOf = (d: GenogramData, a: string, b: string) =>
  d.relationships.find(r => [r.person1Id, r.person2Id].sort().join('|') === [byName(d, a).id, byName(d, b).id].sort().join('|'));

describe('genogram templates', () => {
  it.each(GENOGRAM_TEMPLATES.map(t => t.id))('%s builds a valid tree with the patient marked and laid out cleanly', id => {
    for (const gender of ['male', 'female'] as const) {
      const data = buildTemplate(id, gender);
      expect(validateGenogramData(data).valid).toBe(true);
      const probands = data.persons.filter(p => p.isProband);
      expect(probands.map(p => [p.fullName, p.gender])).toEqual([['Patient', gender]]);
      expect(data.persons.some(p => p.isPlaceholder)).toBe(false);

      new LayoutEngine().calculateLayout(data.persons, data.relationships);
      const y = (pid: string) => data.persons.find(p => p.id === pid)!.y!;
      for (const r of data.relationships) {
        expect(y(r.person1Id)).toBe(y(r.person2Id));
        for (const c of r.childrenIds) expect(y(c)).toBeGreaterThan(y(r.person1Id));
      }
    }
  });

  it('names the partner wife or husband from the patient gender', () => {
    expect(names(buildTemplate('couple', 'male'))).toEqual(['Patient', 'Wife']);
    expect(byName(buildTemplate('couple', 'male'), 'Wife').gender).toBe('female');
    expect(names(buildTemplate('couple', 'female'))).toEqual(['Husband', 'Patient']);
    expect(GENOGRAM_TEMPLATES.find(t => t.id === 'couple')!.description('female')).toBe('Patient and husband');
  });

  it('links grandparents, parents and patient across three generations', () => {
    const d = buildTemplate('grandparents', 'female');
    expect(d.persons).toHaveLength(7);
    expect(coupleOf(d, 'Paternal grandfather', 'Paternal grandmother')!.childrenIds).toEqual([byName(d, 'Father').id]);
    expect(coupleOf(d, 'Maternal grandfather', 'Maternal grandmother')!.childrenIds).toEqual([byName(d, 'Mother').id]);
    expect(coupleOf(d, 'Father', 'Mother')!.childrenIds).toEqual([byName(d, 'Patient').id]);
  });

  it('builds the standard three-generation family', () => {
    const d = buildTemplate('three-generations', 'male');
    expect(names(d)).toEqual([
      'Brother', 'Daughter', 'Father', 'Maternal grandfather', 'Maternal grandmother', 'Mother',
      'Paternal grandfather', 'Paternal grandmother', 'Patient', 'Sister', 'Son', 'Wife',
    ]);
    expect([...coupleOf(d, 'Patient', 'Wife')!.childrenIds].sort()).toEqual([byName(d, 'Son').id, byName(d, 'Daughter').id].sort());
    expect(d.metadata?.title).toBe('Standard 3-generation');
  });

  it('rejects an unknown template', () => {
    expect(() => buildTemplate('nope')).toThrow('Unknown genogram template');
  });
});
