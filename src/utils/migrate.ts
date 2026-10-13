import { Person } from '../types';

/**
 * Upgrade a person from older data formats. Files written before v1.1 stored
 * `firstName` / `lastName`; these are joined into `fullName`.
 */
export function migratePerson(person: Person): Person {
  const legacy = person as Person & { firstName?: string; lastName?: string };
  if (legacy.firstName === undefined && legacy.lastName === undefined) return person;

  const { firstName, lastName, ...rest } = legacy;
  const joined = [firstName, lastName].map(s => s?.trim()).filter(Boolean).join(' ');
  const migrated: Person = { ...rest };
  if (rest.fullName === undefined && joined) migrated.fullName = joined;
  return migrated;
}
