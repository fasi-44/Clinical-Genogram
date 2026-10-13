import * as fs from 'fs';
import * as path from 'path';
import { intakeFromTree, mergeKept } from './IntakeFromTree';
import { buildGenogramFromIntake } from './KinshipBuilder';
import { LayoutEngine } from './LayoutEngine';
import { validateGenogramData } from '../utils/json-schema';
import { GenogramData } from '../types';

const load = (): GenogramData =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../../demo/sample-data/consanguinity-family.json'), 'utf8'));

function roundTrip(edit?: (intake: ReturnType<typeof intakeFromTree>['intake']) => void) {
  const original = load();
  const { intake, placedIds, partnerOnlyIds } = intakeFromTree(original, 'andrew');
  edit?.(intake);
  const conditions = original.persons.flatMap(p => p.conditions);
  const built = buildGenogramFromIntake(intake, { availableConditions: conditions });
  return { original, intake, placedIds, result: mergeKept(built, original, placedIds, partnerOnlyIds) };
}

const coupleOf = (d: GenogramData, a: string, b: string) =>
  d.relationships.find(r => [r.person1Id, r.person2Id].sort().join('|') === [a, b].sort().join('|'));

describe('intakeFromTree (edit mode)', () => {
  it('reads the board into questionnaire answers from the patient', () => {
    const { intake } = intakeFromTree(load(), 'andrew');
    expect(intake.patient.fullName).toBe('Andrew Collins');
    expect(intake.father?.fullName).toBe('Matthew Collins');
    expect(intake.mother?.fullName).toBe('Lucy Collins');
    expect(intake.parentsConsanguinity).toBe('first-cousins');
    expect(intake.siblings!.map(s => s.fullName)).toEqual(['Hannah Walsh', 'Ruth Collins', 'Benjamin Collins']);
    expect(intake.grandparents!.paternalGrandfather?.fullName).toBe('Henry Collins');
    expect(intake.paternalAuntsUncles!.map(a => [a.fullName, a.parentage ?? 'both'])).toEqual([
      ['Natalie Walsh', 'both'],
      ['Francis Collins', 'father'],
    ]);
    expect(intake.maternalAuntsUncles!.map(a => a.fullName)).toEqual(['Simon Walsh', 'Luke Walsh']);
  });

  it('enters a relative once and links them from their other role', () => {
    const { intake } = intakeFromTree(load(), 'andrew');
    // Sarah is a cousin (under Natalie + Simon) and Andrew's wife
    expect(intake.partners![0].linkedRelativeKey).toBe('sarah');
    // Hannah's partner is her uncle Luke
    expect(intake.siblings![0].partners![0].linkedRelativeKey).toBe('luke');
    // Natalie's partner is Simon from the mother's side
    expect(intake.paternalAuntsUncles![0].partners![0].linkedRelativeKey).toBe('simon');
  });

  it('round-trips the whole tree with the same ids, keeping people the questionnaire cannot show', () => {
    const { original, placedIds, result } = roundTrip();
    expect(result.persons.map(p => p.id).sort()).toEqual(original.persons.map(p => p.id).sort());
    // Great-grandparents and the Oliver branch were never in the questionnaire, but are kept
    for (const id of ['joseph', 'anne', 'oliver', 'grace', 'thomas', 'rachel']) {
      expect(placedIds.has(id)).toBe(false);
      expect(result.persons.some(p => p.id === id)).toBe(true);
    }
    // James and Esther are in the questionnaire as Ruth's and Benjamin's partners
    expect(placedIds.has('james')).toBe(true);
    expect(placedIds.has('esther')).toBe(true);
    // Every original couple still exists (by partners), with its children
    for (const r of original.relationships) {
      const rebuilt = coupleOf(result, r.person1Id, r.person2Id);
      expect(rebuilt).toBeDefined();
      expect([...rebuilt!.childrenIds].sort()).toEqual([...r.childrenIds].sort());
    }
    expect(validateGenogramData(result).valid).toBe(true);
  });

  it('keeps details the questionnaire does not show', () => {
    const { result } = roundTrip();
    const andrew = result.persons.find(p => p.id === 'andrew')!;
    expect(andrew.notes).toContain('genetic counselling');
    expect(andrew.isProband).toBe(true);
    const adam = result.persons.find(p => p.id === 'adam')!;
    expect(adam.conditions[0]).toMatchObject({ id: 'cond-thal-major', color: '#8e24aa' });
    // A hand-set degree with no plain-language relation survives
    expect(coupleOf(result, 'andrew', 'sarah')!.consanguinity).toBe('second-degree');
    expect(coupleOf(result, 'andrew', 'sarah')!.notes).toContain('Double first cousins');
    expect(coupleOf(result, 'luke', 'hannah')!.consanguinityRelation).toBe('uncle-niece');
  });

  it('removes people deleted in the questionnaire, and their couples', () => {
    const { result } = roundTrip(intake => {
      intake.siblings = intake.siblings!.filter(s => s.fullName !== 'Ruth Collins');
    });
    expect(result.persons.some(p => p.id === 'ruth')).toBe(false);
    expect(result.relationships.some(r => r.person1Id === 'ruth' || r.person2Id === 'ruth')).toBe(false);
    // James was never in the questionnaire, so he stays (now without Ruth)
    expect(result.persons.some(p => p.id === 'james')).toBe(true);
  });

  it('lays out the rebuilt tree cleanly', () => {
    const { result } = roundTrip();
    new LayoutEngine().calculateLayout(result.persons, result.relationships);
    const y = (id: string) => result.persons.find(p => p.id === id)!.y!;
    for (const r of result.relationships) {
      expect(y(r.person1Id)).toBe(y(r.person2Id));
      for (const c of r.childrenIds) expect(y(c)).toBeGreaterThan(y(r.person1Id));
    }
  });
});
