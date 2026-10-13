import { Person } from '../types';

/**
 * Siblings are drawn oldest on the left (standard genogram convention).
 * These helpers keep a couple's `childrenIds` in that order, using whatever
 * is known about each child's age.
 */

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

function yearOf(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const t = Date.parse(date);
  return Number.isFinite(t) ? 1970 + t / YEAR_MS : undefined;
}

/**
 * Approximate birth time as a fractional year, or undefined when nothing
 * about the person's age is known. Uses, in order: date of birth, age
 * (living), or date of death minus age at death. "Age 30" means born 30 to
 * 31 years ago, so the midpoint is used.
 */
export function birthKey(person: Person | undefined, now: Date = new Date()): number | undefined {
  if (!person) return undefined;
  const born = yearOf(person.dateOfBirth);
  if (born !== undefined) return born;
  if (person.age !== undefined && !person.isDeceased) return 1970 + now.getTime() / YEAR_MS - person.age - 0.5;
  const died = yearOf(person.dateOfDeath);
  if (died !== undefined && person.ageAtDeath !== undefined) return died - person.ageAtDeath - 0.5;
  return undefined;
}

/**
 * Children in birth order, oldest first. Children whose age is known are
 * sorted among the places they hold; those with no age keep their place, so
 * an order set by hand for them is kept. Ties (e.g. twins) keep their order.
 */
export function sortByBirth(childIds: string[], personOf: (id: string) => Person | undefined, now: Date = new Date()): string[] {
  const keyed = childIds
    .map((id, index) => ({ id, index, key: birthKey(personOf(id), now) }))
    .filter((c): c is { id: string; index: number; key: number } => c.key !== undefined);
  if (keyed.length < 2) return childIds;
  const sorted = [...keyed].sort((a, b) => a.key - b.key || a.index - b.index);
  const result = [...childIds];
  keyed.forEach((slot, i) => (result[slot.index] = sorted[i].id));
  return result;
}

/** Whether two children are already placed by age, so swapping them by hand would be undone */
export function orderedByAge(a: Person | undefined, b: Person | undefined): boolean {
  return birthKey(a) !== undefined && birthKey(b) !== undefined;
}
