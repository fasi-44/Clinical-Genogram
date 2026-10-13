import { birthKey, sortByBirth } from './birth-order';
import { GenogramState } from '../core/GenogramState';
import { buildTemplate } from '../core/templates';
import { Person } from '../types';

const NOW = new Date('2026-06-01T00:00:00Z');
const person = (id: string, extra: Partial<Person> = {}): Person => ({
  id, gender: 'male', type: 'standard', isDeceased: false, isProband: false, conditions: [], ...extra,
});

describe('birth order', () => {
  it('works out birth from date of birth, age, or death date and age at death', () => {
    expect(Math.floor(birthKey(person('a', { dateOfBirth: '1990-07-01' }), NOW)!)).toBe(1990);
    expect(Math.floor(birthKey(person('b', { age: 30 }), NOW)!)).toBe(1995);
    expect(Math.floor(birthKey(person('c', { isDeceased: true, dateOfDeath: '2000-01-01', ageAtDeath: 50 }), NOW)!)).toBe(1949);
    expect(birthKey(person('d'), NOW)).toBeUndefined();
    // Age of a deceased person is not their current age
    expect(birthKey(person('e', { isDeceased: true, age: 40 }), NOW)).toBeUndefined();
  });

  it('puts the oldest first and leaves children with no age in their place', () => {
    const people = new Map([
      ['young', person('young', { age: 5 })],
      ['unknown', person('unknown')],
      ['old', person('old', { age: 40 })],
      ['mid', person('mid', { dateOfBirth: '2006-03-01' })],
    ]);
    expect(sortByBirth(['young', 'unknown', 'old', 'mid'], id => people.get(id), NOW)).toEqual(['old', 'unknown', 'mid', 'young']);
  });

  it('keeps twins (same age) in their order', () => {
    const people = new Map([
      ['t2', person('t2', { age: 10 })],
      ['t1', person('t1', { age: 10 })],
      ['big', person('big', { age: 12 })],
    ]);
    expect(sortByBirth(['t2', 't1', 'big'], id => people.get(id), NOW)).toEqual(['big', 't2', 't1']);
  });
});

describe('GenogramState keeps siblings in age order', () => {
  const kidsOf = (s: GenogramState, a: string, b: string) => {
    const r = s.getRelationships().find(r => [r.person1Id, r.person2Id].sort().join() === [a, b].sort().join())!;
    return r.childrenIds.map(id => s.getPerson(id)!.fullName);
  };

  it('re-sorts a template when ages are entered, and when a child is added', () => {
    const s = new GenogramState(buildTemplate('three-generations', 'male'));
    const id = (name: string) => s.getPersons().find(p => p.fullName === name)!.id;
    expect(kidsOf(s, id('Father'), id('Mother'))).toEqual(['Patient', 'Brother', 'Sister']);

    s.updatePerson(id('Patient'), { age: 30 });
    s.updatePerson(id('Brother'), { age: 25 });
    s.updatePerson(id('Sister'), { age: 35 });
    expect(kidsOf(s, id('Father'), id('Mother'))).toEqual(['Sister', 'Patient', 'Brother']);

    const added = s.addSibling(id('Patient'), 'male')!;
    s.updatePerson(added.id, { fullName: 'Eldest', age: 40 });
    expect(kidsOf(s, id('Father'), id('Mother'))).toEqual(['Eldest', 'Sister', 'Patient', 'Brother']);
  });

  it('sorts on load and refuses a hand move that age order would undo', () => {
    const s = new GenogramState({
      version: '1.0.0',
      persons: [
        person('f'), person('m', { gender: 'female' }),
        person('a', { fullName: 'A', age: 3 }), person('b', { fullName: 'B', age: 9 }), person('c', { fullName: 'C' }),
      ],
      relationships: [{ id: 'r', type: 'marriage', person1Id: 'f', person2Id: 'm', childrenIds: ['a', 'b', 'c'], consanguinity: 'none' }],
    });
    expect(kidsOf(s, 'f', 'm')).toEqual(['B', 'A', 'C']);
    expect(s.canMoveChild('r', 'a', -1)).toBe(false);
    expect(s.moveChild('r', 'a', -1)).toBe(false);
    // C has no age, so it can still be placed by hand
    expect(s.moveChild('r', 'c', -1)).toBe(true);
    expect(kidsOf(s, 'f', 'm')).toEqual(['B', 'C', 'A']);
  });
});
