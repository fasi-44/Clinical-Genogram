import { Person, Gender, Relationship, RelationshipType, GenogramData } from '../types';
import { HistoryManager } from './HistoryManager';
import { generateId } from '../utils/id-generator';
import { migratePerson } from '../utils/migrate';
import { deriveConsanguinity } from '../utils/consanguinity';
import { orderedByAge, sortByBirth } from '../utils/birth-order';

export type StateSubscriber = () => void;

export class GenogramState {
  private persons: Map<string, Person>;
  private relationships: Map<string, Relationship>;
  private history: HistoryManager<GenogramData>;
  private subscribers: Set<StateSubscriber>;

  constructor(initialData?: GenogramData) {
    this.persons = new Map();
    this.relationships = new Map();
    this.history = new HistoryManager<GenogramData>();
    this.subscribers = new Set();

    if (initialData) {
      this.setData(initialData);
    }
  }

  // ---------------------------------------------------------------------------
  // Person CRUD
  // ---------------------------------------------------------------------------

  addPerson(person: Partial<Person> & { gender: Gender }): Person {
    this.saveSnapshot();

    const id = person.id || generateId('person');
    const newPerson: Person = {
      id,
      gender: person.gender,
      type: person.type ?? 'standard',
      isDeceased: person.isDeceased ?? false,
      isProband: person.isProband ?? false,
      conditions: person.conditions ?? [],
      fullName: person.fullName,
      dateOfBirth: person.dateOfBirth,
      dateOfDeath: person.dateOfDeath,
      notes: person.notes,
      x: person.x,
      y: person.y,
      generation: person.generation,
      twinGroupId: person.twinGroupId,
      isIdenticalTwin: person.isIdenticalTwin,
    };

    this.persons.set(newPerson.id, newPerson);
    this.notify();
    return newPerson;
  }

  updatePerson(id: string, updates: Partial<Person>): Person | null {
    const existing = this.persons.get(id);
    if (!existing) {
      return null;
    }

    this.saveSnapshot();

    const updated: Person = { ...existing, ...updates, id }; // id is immutable
    this.persons.set(id, updated);
    this.refreshBirthOrder();
    this.notify();
    return updated;
  }

  /**
   * Update a person's position without creating a history snapshot.
   * Use for drag operations and layout calculations where creating
   * a snapshot on every update would be wasteful.
   */
  updatePersonPosition(id: string, x: number, y: number): void {
    const existing = this.persons.get(id);
    if (!existing) return;
    this.persons.set(id, { ...existing, x, y });
  }

  /**
   * Notify subscribers manually. Call after a batch of silent updates.
   */
  notifyChange(): void {
    this.notify();
  }

  removePerson(id: string): boolean {
    if (!this.persons.has(id)) {
      return false;
    }

    this.saveSnapshot();

    // Remove the person
    this.persons.delete(id);

    // Remove all relationships that reference this person as person1 or person2
    const relIdsToRemove: string[] = [];
    for (const [relId, rel] of this.relationships) {
      if (rel.person1Id === id || rel.person2Id === id) {
        relIdsToRemove.push(relId);
      }
    }
    for (const relId of relIdsToRemove) {
      this.relationships.delete(relId);
    }

    // Remove the person's ID from any childrenIds arrays in remaining relationships
    for (const [, rel] of this.relationships) {
      const idx = rel.childrenIds.indexOf(id);
      if (idx !== -1) {
        rel.childrenIds = rel.childrenIds.filter(cid => cid !== id);
      }
    }

    this.refreshAutoConsanguinity();
    this.notify();
    return true;
  }

  getPerson(id: string): Person | undefined {
    return this.persons.get(id);
  }

  getPersons(): Person[] {
    return [...this.persons.values()];
  }

  // ---------------------------------------------------------------------------
  // Relationship CRUD
  // ---------------------------------------------------------------------------

  addRelationship(
    rel: Partial<Relationship> & { type: RelationshipType; person1Id: string; person2Id: string },
  ): Relationship {
    this.saveSnapshot();

    const id = rel.id || generateId('rel');
    const newRel: Relationship = {
      id,
      type: rel.type,
      person1Id: rel.person1Id,
      person2Id: rel.person2Id,
      childrenIds: rel.childrenIds ?? [],
      consanguinity: rel.consanguinity ?? 'none',
      startDate: rel.startDate,
      endDate: rel.endDate,
      notes: rel.notes,
    };

    this.relationships.set(newRel.id, newRel);
    this.refreshBirthOrder();
    this.refreshAutoConsanguinity();
    this.notify();
    return this.relationships.get(newRel.id)!;
  }

  updateRelationship(id: string, updates: Partial<Relationship>): Relationship | null {
    const existing = this.relationships.get(id);
    if (!existing) {
      return null;
    }

    this.saveSnapshot();

    const updated: Relationship = { ...existing, ...updates, id }; // id is immutable
    // A consanguinity value set by a person is never replaced by the automatic one
    const touchesConsanguinity = 'consanguinity' in updates || 'consanguinityRelation' in updates;
    if (touchesConsanguinity && !('consanguinityAuto' in updates)) updated.consanguinityAuto = false;
    this.relationships.set(id, updated);
    this.refreshBirthOrder();
    this.refreshAutoConsanguinity();
    this.notify();
    return this.relationships.get(id)!;
  }

  removeRelationship(id: string): boolean {
    if (!this.relationships.has(id)) {
      return false;
    }

    this.saveSnapshot();

    this.relationships.delete(id);
    this.refreshAutoConsanguinity();
    this.notify();
    return true;
  }

  getRelationship(id: string): Relationship | undefined {
    return this.relationships.get(id);
  }

  getRelationships(): Relationship[] {
    return [...this.relationships.values()];
  }

  getRelationshipsForPerson(personId: string): Relationship[] {
    const result: Relationship[] = [];
    for (const rel of this.relationships.values()) {
      if (rel.person1Id === personId || rel.person2Id === personId) {
        result.push(rel);
      }
    }
    return result;
  }

  getChildrenOf(person1Id: string, person2Id: string): Person[] {
    for (const rel of this.relationships.values()) {
      const matchForward = rel.person1Id === person1Id && rel.person2Id === person2Id;
      const matchReverse = rel.person1Id === person2Id && rel.person2Id === person1Id;
      if (matchForward || matchReverse) {
        return rel.childrenIds
          .map(cid => this.persons.get(cid))
          .filter((p): p is Person => p !== undefined);
      }
    }
    return [];
  }

  getParentsOf(personId: string): { parents: [string, string] | null; relationship: Relationship | null } {
    for (const rel of this.relationships.values()) {
      if (rel.childrenIds.includes(personId)) {
        return {
          parents: [rel.person1Id, rel.person2Id],
          relationship: rel,
        };
      }
    }
    return { parents: null, relationship: null };
  }

  // ---------------------------------------------------------------------------
  // State management
  // ---------------------------------------------------------------------------

  getData(): GenogramData {
    return structuredClone({
      version: '1.0.0',
      persons: [...this.persons.values()],
      relationships: [...this.relationships.values()],
    });
  }

  setData(data: GenogramData): void {
    this.persons = new Map();
    this.relationships = new Map();

    if (data.persons) {
      for (const person of data.persons) {
        this.persons.set(person.id, migratePerson(person));
      }
    }

    if (data.relationships) {
      for (const rel of data.relationships) {
        this.relationships.set(rel.id, rel);
      }
    }

    this.refreshBirthOrder();
    this.refreshAutoConsanguinity();
    this.notify();
  }

  /**
   * Replace the whole genogram as one undoable step (unlike setData, which
   * is for initial loads and leaves history untouched).
   */
  replaceData(data: GenogramData): void {
    this.saveSnapshot();
    this.setData(data);
  }


  // ---------------------------------------------------------------------------
  // Family editing: each call is one undo step and keeps the links consistent
  // ---------------------------------------------------------------------------

  /** Couples (any non-child relationship) this person is a partner in */
  getCouplesOf(personId: string): Relationship[] {
    return this.getRelationshipsForPerson(personId).filter(r => r.type !== 'child');
  }

  /** True when `id` is a child, grandchild, ... of `ancestorId` */
  isDescendant(ancestorId: string, id: string): boolean {
    const stack = this.getCouplesOf(ancestorId).flatMap(r => r.childrenIds);
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === id) return true;
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...this.getCouplesOf(cur).flatMap(r => r.childrenIds));
    }
    return false;
  }

  /** Couples that can be chosen as this person's parents (no cycles, not their own couple) */
  getPossibleParentCouples(personId: string): Relationship[] {
    return this.getRelationships().filter(
      r =>
        r.type !== 'child' &&
        r.person1Id !== personId &&
        r.person2Id !== personId &&
        !this.isDescendant(personId, r.person1Id) &&
        !this.isDescendant(personId, r.person2Id),
    );
  }

  /** Add a father and mother (placeholders until named) to a person without parents */
  addParents(personId: string): Relationship | null {
    if (!this.persons.has(personId) || this.getParentsOf(personId).relationship) return null;
    this.saveSnapshot();
    const couple = this.createParentCouple([personId]);
    this.finishFamilyEdit();
    return this.relationships.get(couple.id)!;
  }

  /** Add a brother or sister; creates placeholder parents if the person has none */
  addSibling(personId: string, gender: Gender): Person | null {
    if (!this.persons.has(personId)) return null;
    this.saveSnapshot();
    let couple = this.getParentsOf(personId).relationship;
    if (!couple) couple = this.createParentCouple([personId]);
    const sibling = this.insertPerson({ gender });
    this.patchRelationship(couple.id, { childrenIds: [...couple.childrenIds, sibling.id] });
    this.finishFamilyEdit();
    return sibling;
  }

  /** Add a partner (married) to a person */
  addPartner(personId: string, gender?: Gender): Person | null {
    const person = this.persons.get(personId);
    if (!person) return null;
    this.saveSnapshot();
    const partner = this.insertPerson({ gender: gender ?? oppositeGender(person.gender) });
    this.insertCouple(person, partner, []);
    this.finishFamilyEdit();
    return partner;
  }

  /**
   * Add a son or daughter. Uses the given couple, else the person's first
   * couple, else creates a placeholder partner for the other parent.
   */
  addChild(personId: string, gender: Gender, coupleId?: string): Person | null {
    const person = this.persons.get(personId);
    if (!person) return null;
    this.saveSnapshot();
    let couple = (coupleId && this.relationships.get(coupleId)) || this.getCouplesOf(personId)[0];
    if (!couple) {
      const other = this.insertPerson({ gender: oppositeGender(person.gender), isPlaceholder: true });
      couple = this.insertCouple(person, other, []);
    }
    const child = this.insertPerson({ gender });
    this.patchRelationship(couple.id, { childrenIds: [...couple.childrenIds, child.id] });
    this.finishFamilyEdit();
    return child;
  }

  /**
   * Make a couple this person's parents (moving them from any previous
   * parents), or pass null to detach them from their parents.
   * Returns false when the change would make someone their own ancestor.
   */
  setParents(personId: string, coupleId: string | null): boolean {
    if (!this.persons.has(personId)) return false;
    if (coupleId !== null && !this.getPossibleParentCouples(personId).some(r => r.id === coupleId)) return false;
    this.saveSnapshot();
    for (const rel of this.getRelationships()) {
      if (rel.childrenIds.includes(personId)) {
        this.patchRelationship(rel.id, { childrenIds: rel.childrenIds.filter(c => c !== personId) });
      }
    }
    if (coupleId !== null) {
      const couple = this.relationships.get(coupleId)!;
      this.patchRelationship(coupleId, { childrenIds: [...couple.childrenIds, personId] });
    }
    this.finishFamilyEdit();
    return true;
  }

  /** Detach a child from a couple without deleting the person */
  removeChildFromCouple(coupleId: string, childId: string): boolean {
    const couple = this.relationships.get(coupleId);
    if (!couple || !couple.childrenIds.includes(childId)) return false;
    this.saveSnapshot();
    this.patchRelationship(coupleId, { childrenIds: couple.childrenIds.filter(c => c !== childId) });
    this.finishFamilyEdit();
    return true;
  }

  /** Move a child one place earlier (-1) or later (+1) in birth order */
  moveChild(coupleId: string, childId: string, delta: -1 | 1): boolean {
    const couple = this.relationships.get(coupleId);
    if (!couple) return false;
    const i = couple.childrenIds.indexOf(childId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= couple.childrenIds.length) return false;
    // Both ages known: they are already in age order, and a swap would be undone
    if (!this.canMoveChild(coupleId, childId, delta)) return false;
    this.saveSnapshot();
    const order = [...couple.childrenIds];
    [order[i], order[j]] = [order[j], order[i]];
    this.patchRelationship(coupleId, { childrenIds: order });
    this.finishFamilyEdit();
    return true;
  }

  /** Whether a child can be moved by hand: not when both it and its neighbour have a known age */
  canMoveChild(coupleId: string, childId: string, delta: -1 | 1): boolean {
    const couple = this.relationships.get(coupleId);
    if (!couple) return false;
    const i = couple.childrenIds.indexOf(childId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= couple.childrenIds.length) return false;
    return !orderedByAge(this.persons.get(childId), this.persons.get(couple.childrenIds[j]));
  }

  private createParentCouple(childrenIds: string[]): Relationship {
    const father = this.insertPerson({ gender: 'male', isPlaceholder: true });
    const mother = this.insertPerson({ gender: 'female', isPlaceholder: true });
    return this.insertCouple(father, mother, childrenIds);
  }

  /** Add a person without a snapshot or notification (for batched edits) */
  private insertPerson(p: Partial<Person> & { gender: Gender }): Person {
    const person: Person = {
      id: generateId('person'),
      type: 'standard',
      isDeceased: false,
      isProband: false,
      conditions: [],
      ...p,
    };
    this.persons.set(person.id, person);
    return person;
  }

  /** Add a married couple without a snapshot or notification; male partner first */
  private insertCouple(a: Person, b: Person, childrenIds: string[]): Relationship {
    const [p1, p2] = a.gender === 'female' && b.gender === 'male' ? [b, a] : [a, b];
    const rel: Relationship = {
      id: generateId('rel'),
      type: 'marriage',
      person1Id: p1.id,
      person2Id: p2.id,
      childrenIds,
      consanguinity: 'none',
    };
    this.relationships.set(rel.id, rel);
    return rel;
  }

  private patchRelationship(id: string, updates: Partial<Relationship>): void {
    const existing = this.relationships.get(id);
    if (existing) this.relationships.set(id, { ...existing, ...updates, id });
  }

  private finishFamilyEdit(): void {
    this.refreshBirthOrder();
    this.refreshAutoConsanguinity();
    this.notify();
  }

  /**
   * Keep every couple's children oldest first (drawn left to right), using
   * the ages that are known; children with no age keep their place.
   */
  private refreshBirthOrder(): void {
    for (const rel of this.relationships.values()) {
      if (!rel.childrenIds || rel.childrenIds.length < 2) continue;
      const sorted = sortByBirth(rel.childrenIds, id => this.persons.get(id));
      if (sorted.some((id, i) => id !== rel.childrenIds[i])) {
        this.relationships.set(rel.id, { ...rel, childrenIds: sorted });
      }
    }
  }

  /**
   * Keep worked-out consanguinity in step with the family links: couples
   * whose partners share an ancestor get the relationship from the tree,
   * and an automatic value is cleared when the shared ancestry goes away.
   * Values a person set (or recorded in older data) are left alone.
   */
  private refreshAutoConsanguinity(): void {
    const persons = this.getPersons();
    const rels = this.getRelationships();
    for (const rel of rels) {
      if (rel.type === 'child') continue;
      const setByPerson =
        rel.consanguinityAuto === false ||
        (rel.consanguinityAuto === undefined && (rel.consanguinity !== 'none' || rel.consanguinityRelation !== undefined));
      if (setByPerson) continue;
      const derived = deriveConsanguinity(persons, rels, rel.person1Id, rel.person2Id);
      if (derived) {
        if (rel.consanguinityRelation !== derived.relation || rel.consanguinity !== derived.degree || !rel.consanguinityAuto) {
          this.relationships.set(rel.id, {
            ...rel,
            consanguinity: derived.degree,
            consanguinityRelation: derived.relation,
            consanguinityAuto: true,
          });
        }
      } else if (rel.consanguinityAuto) {
        const { consanguinityRelation: _r, consanguinityAuto: _a, ...rest } = rel;
        this.relationships.set(rel.id, { ...rest, consanguinity: 'none' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  saveSnapshot(): void {
    this.history.push(this.getData());
  }

  undo(): boolean {
    const previous = this.history.undo(this.getData());
    if (!previous) {
      return false;
    }

    // Restore state without triggering another snapshot
    this.restoreFromData(previous);
    this.notify();
    return true;
  }

  redo(): boolean {
    const next = this.history.redo(this.getData());
    if (!next) {
      return false;
    }

    // Restore state without triggering another snapshot
    this.restoreFromData(next);
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  // ---------------------------------------------------------------------------
  // Subscribers
  // ---------------------------------------------------------------------------

  subscribe(fn: StateSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }

  // ---------------------------------------------------------------------------
  // Proband
  // ---------------------------------------------------------------------------

  getProband(): Person | undefined {
    for (const person of this.persons.values()) {
      if (person.isProband) {
        return person;
      }
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private restoreFromData(data: GenogramData): void {
    this.persons = new Map();
    this.relationships = new Map();

    if (data.persons) {
      for (const person of data.persons) {
        this.persons.set(person.id, person);
      }
    }

    if (data.relationships) {
      for (const rel of data.relationships) {
        this.relationships.set(rel.id, rel);
      }
    }
  }
}

function oppositeGender(g: Gender): Gender {
  return g === 'male' ? 'female' : g === 'female' ? 'male' : 'unknown';
}
