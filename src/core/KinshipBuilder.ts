import {
  ClinicalCondition,
  ConsanguinityRelation,
  Gender,
  GenogramData,
  IntakeChild,
  IntakeConsanguinity,
  IntakeCoupleExtra,
  IntakeForm,
  IntakePartner,
  IntakeRelative,
  IntakeSibling,
  Person,
  PersonType,
  Relationship,
  RelationshipType,
} from '../types';
import { generateId } from '../utils/id-generator';
import { CONDITION_PALETTE } from '../utils/constants';
import { RELATION_DEGREE, deriveConsanguinity } from '../utils/consanguinity';
import { sortByBirth } from '../utils/birth-order';

export interface KinshipBuildOptions {
  /** Known conditions; intake condition names matching these (case-insensitive) reuse their id and colour. */
  availableConditions?: ClinicalCondition[];
}

/**
 * Convenience wrapper: build GenogramData from questionnaire answers.
 */
export function buildGenogramFromIntake(intake: IntakeForm, options: KinshipBuildOptions = {}): GenogramData {
  return new KinshipBuilder(options).build(intake);
}

/**
 * Deterministic rules that turn an IntakeForm (relatives described relative
 * to the patient) into persons and relationships.
 *
 * - Any parent-side information creates both parents; a missing one becomes
 *   a placeholder so child lines have a couple to hang from.
 * - Any grandparent on one side creates both grandparents on that side, and
 *   the parent they connect through.
 * - Half-siblings hang from a couple between the shared parent and a
 *   placeholder "other parent".
 * - Aunts and uncles are children of the grandparents on their side (half
 *   aunts and uncles of one grandparent and a placeholder partner); their
 *   partners' children are cousins. Siblings' partners' children are
 *   nephews and nieces.
 * - Any partner can be linked to a relative entered elsewhere (the patient
 *   marrying a cousin, an aunt marrying an uncle from the other side, a
 *   sister marrying her uncle). The linked person is reused, not
 *   duplicated, and every couple whose members share an ancestor gets its
 *   blood relationship worked out from the tree.
 *
 * Persons are emitted in left-to-right order per generation because the
 * PositionResolver uses array order to break ties within a row.
 */
export class KinshipBuilder {
  private persons: Person[] = [];
  private relationships: Relationship[] = [];
  private conditions!: ConditionResolver;
  /** Persons created from intake entries that carry a `key` */
  private byKey = new Map<string, Person>();

  constructor(private options: KinshipBuildOptions = {}) {}

  build(intake: IntakeForm): GenogramData {
    this.persons = [];
    this.relationships = [];
    this.byKey = new Map();
    this.conditions = new ConditionResolver(this.options.availableConditions ?? []);
    // Create everyone who can be linked to first, so a link works whichever
    // part of the questionnaire the linked relative was entered in
    this.precreateKeyed(intake);

    const siblings = intake.siblings ?? [];
    const fullSiblings = siblings.filter(s => (s.parentage ?? 'both') === 'both');
    const maternalHalf = siblings.filter(s => s.parentage === 'mother');
    const paternalHalf = siblings.filter(s => s.parentage === 'father');
    const gp = intake.grandparents ?? {};
    const paternalAll = intake.paternalAuntsUncles ?? [];
    const maternalAll = intake.maternalAuntsUncles ?? [];
    const byParentage = (list: IntakeChild[], p: 'both' | 'father' | 'mother') =>
      list.filter(a => (a.parentage ?? 'both') === p);
    const paternalAunts = byParentage(paternalAll, 'both');
    const maternalAunts = byParentage(maternalAll, 'both');
    const paternalAuntsViaGf = byParentage(paternalAll, 'father');
    const paternalAuntsViaGm = byParentage(paternalAll, 'mother');
    const maternalAuntsViaGf = byParentage(maternalAll, 'father');
    const maternalAuntsViaGm = byParentage(maternalAll, 'mother');
    const hasMaternalGp = !!(gp.maternalGrandmother || gp.maternalGrandfather) || maternalAll.length > 0;
    const hasPaternalGp = !!(gp.paternalGrandmother || gp.paternalGrandfather) || paternalAll.length > 0;
    const needParents =
      !!intake.father || !!intake.mother || siblings.length > 0 || hasMaternalGp || hasPaternalGp;

    // Half relatives hang from a couple between the shared parent and their
    // other parent: the named person when known, else one placeholder per side
    const pgfHalf = this.halfGroups(paternalAuntsViaGf);
    const pgmHalf = this.halfGroups(paternalAuntsViaGm);
    const mgfHalf = this.halfGroups(maternalAuntsViaGf);
    const mgmHalf = this.halfGroups(maternalAuntsViaGm);
    const fatherHalf = this.halfGroups(paternalHalf);
    const motherHalf = this.halfGroups(maternalHalf);

    // Generation -2: grandparents (father's side on the left), with the other
    // parents of half aunts and uncles on the outside of each couple
    let pgf: Person | undefined, pgm: Person | undefined, mgf: Person | undefined, mgm: Person | undefined;
    if (hasPaternalGp) {
      pgfHalf.forEach(g => (g.other = this.addPerson(g.otherParent, 'female')));
      pgf = this.addPerson(gp.paternalGrandfather, 'male');
      pgm = this.addPerson(gp.paternalGrandmother, 'female');
      pgmHalf.forEach(g => (g.other = this.addPerson(g.otherParent, 'male')));
    }
    if (hasMaternalGp) {
      mgfHalf.forEach(g => (g.other = this.addPerson(g.otherParent, 'female')));
      mgf = this.addPerson(gp.maternalGrandfather, 'male');
      mgm = this.addPerson(gp.maternalGrandmother, 'female');
      mgmHalf.forEach(g => (g.other = this.addPerson(g.otherParent, 'male')));
    }

    // Generation -1: father's siblings (and their families) on the far left,
    // half aunts and uncles furthest out
    pgfHalf.forEach(g => (g.persons = this.addChildren(g.items)));
    const paternalAuntPersons = this.addChildren(paternalAunts);
    pgmHalf.forEach(g => (g.persons = this.addChildren(g.items)));

    // Parents, with half-sibling "other parents" on the outside
    let father: Person | undefined, mother: Person | undefined;
    if (needParents) {
      fatherHalf.forEach(g => (g.other = this.addPerson(g.otherParent, 'female')));
      father = this.addPerson(intake.father, 'male');
      mother = this.addPerson(intake.mother, 'female');
      motherHalf.forEach(g => (g.other = this.addPerson(g.otherParent, 'male')));
    }

    // Generation 0: paternal half-siblings, patient + full siblings, maternal half-siblings
    fatherHalf.forEach(g => (g.persons = g.items.map(s => this.addSibling(s))));

    const patient = this.createPerson(intake.patient, intake.patient.gender ?? 'unknown');
    patient.isProband = true;
    delete patient.isPlaceholder; // the patient is always a real person
    const fullSiblingPersons = fullSiblings.map(s => this.createPerson(s, s.gender ?? 'unknown'));
    const fullGroup = this.orderByAge(
      [{ person: patient, intake: intake.patient }].concat(
        fullSiblingPersons.map((p, i) => ({ person: p, intake: fullSiblings[i] })),
      ),
    );
    fullGroup.forEach(p => this.persons.push(p));

    motherHalf.forEach(g => (g.persons = g.items.map(s => this.addSibling(s))));

    // Siblings' partners (gen 0) and their children: the patient's nephews and nieces
    const siblingPerson = (s: IntakeSibling) => {
      for (const g of [...fatherHalf, ...motherHalf]) {
        const i = g.items.indexOf(s);
        if (i >= 0) return g.persons[i];
      }
      return fullSiblingPersons[fullSiblings.indexOf(s)];
    };
    for (const s of siblings) {
      if (s.partners?.length) this.addPartnerFamilies(siblingPerson(s), s.partners);
    }

    // Mother's siblings (gen -1) and their families on the far right
    mgfHalf.forEach(g => (g.persons = this.addChildren(g.items)));
    const maternalAuntPersons = this.addChildren(maternalAunts);
    mgmHalf.forEach(g => (g.persons = this.addChildren(g.items)));

    this.applyTwins(patient, fullSiblings, fullSiblingPersons);

    // Patient's partners (gen 0) and descendants (gen +1, +2, ...)
    this.addPartnerFamilies(patient, intake.partners ?? []);

    // Couples, now that all persons exist
    // Parents stay next to each other: father rightmost among his siblings, mother leftmost among hers
    if (pgf && pgm && father) this.addCouple(pgf, pgm, 'marriage', [...paternalAuntPersons, father]);
    if (mgf && mgm && mother) this.addCouple(mgf, mgm, 'marriage', [mother, ...maternalAuntPersons]);
    if (pgf) this.addHalfCouples(pgf, pgfHalf);
    if (pgm) this.addHalfCouples(pgm, pgmHalf);
    if (mgf) this.addHalfCouples(mgf, mgfHalf);
    if (mgm) this.addHalfCouples(mgm, mgmHalf);
    if (father && mother) {
      this.addCouple(father, mother, intake.parentsRelationship ?? 'marriage', fullGroup, undefined, intake.parentsConsanguinity, intake.parentsCoupleExtra);
    }
    if (father) this.addHalfCouples(father, fatherHalf);
    if (mother) this.addHalfCouples(mother, motherHalf);

    this.deriveConsanguinityFromTree();
    // Siblings oldest first wherever ages were given (drawn left to right)
    const personById = new Map(this.persons.map(p => [p.id, p]));
    for (const rel of this.relationships) rel.childrenIds = sortByBirth(rel.childrenIds, id => personById.get(id));

    const patientName = patient.fullName;
    return {
      version: '1.0.0',
      persons: this.persons,
      relationships: this.relationships,
      metadata: {
        title: patientName ? `Genogram - ${patientName}` : 'Genogram',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Persons
  // ---------------------------------------------------------------------------

  private addPerson(rel: IntakeRelative | undefined, gender: Gender): Person {
    const person = this.createPerson(rel, gender);
    this.persons.push(person);
    return person;
  }

  private addSibling(s: IntakeSibling): Person {
    return this.addPerson(s, s.gender ?? 'unknown');
  }

  /** Add `person`'s partners, a couple for each, and their children (recursively). */
  private addPartnerFamilies(person: Person, partners: IntakePartner[]) {
    const partnerPersons = partners.map(p => {
      // A partner who is already in the tree (e.g. a cousin) is reused, not duplicated
      const linked = p.linkedRelativeKey ? this.byKey.get(p.linkedRelativeKey) : undefined;
      if (linked && linked !== person) return linked;
      return this.addPerson(p, p.gender ?? this.oppositeGender(person.gender));
    });
    partners.forEach((partner, i) => {
      const children = this.addChildren(partner.children ?? []);
      this.addCouple(
        person,
        partnerPersons[i],
        partner.relationshipType ?? 'marriage',
        children,
        undefined,
        partner.consanguinity,
        partner.coupleExtra,
      );
    });
  }

  private addChildren(children: IntakeChild[]): Person[] {
    const created = children.map(c => {
      const person = this.createPerson(c, c.gender ?? 'unknown');
      if (c.type) person.type = c.type as PersonType;
      return { person, intake: c };
    });
    const ordered = this.orderByAge(created);
    ordered.forEach(p => this.persons.push(p));
    // Each child's own family (grandchildren of the couple), left to right
    for (const child of ordered) {
      const intake = created.find(c => c.person === child)!.intake;
      if (intake.partners?.length) this.addPartnerFamilies(child, intake.partners);
    }
    return ordered;
  }

  /** Create a Person from intake answers without adding it to the tree. */
  private createPerson(rel: IntakeRelative | undefined, gender: Gender): Person {
    // Keyed entries were created up front (see precreateKeyed); reuse them
    const existing = rel?.key ? this.byKey.get(rel.key) : undefined;
    if (existing) {
      if (!rel!.gender) existing.gender = gender;
      return existing;
    }
    const r = rel ?? {};
    const isDeceased = r.status === 'deceased';
    const notes = [r.causeOfDeath?.trim() ? `Cause of death: ${r.causeOfDeath.trim()}` : '', r.notes?.trim() ?? '']
      .filter(Boolean)
      .join('\n');

    const person: Person = {
      // An entry's key becomes the person's id, so editing an existing tree keeps ids stable
      id: r.key ?? generateId('person'),
      gender: r.gender ?? gender,
      type: 'standard',
      isDeceased,
      isProband: false,
      conditions: this.conditions.resolve(r.conditions ?? []),
    };
    const fullName = r.fullName?.trim().replace(/\s+/g, ' ');
    if (fullName) person.fullName = fullName;
    if (!isDeceased && isValidAge(r.age)) person.age = r.age;
    if (isDeceased && isValidAge(r.ageAtDeath)) person.ageAtDeath = r.ageAtDeath;
    if (notes) person.notes = notes;
    if (isPlaceholder(rel)) person.isPlaceholder = true;
    if (r.extra) {
      const { isPlaceholder: wasPlaceholder, ...rest } = r.extra;
      Object.assign(person, rest);
      if (wasPlaceholder && !person.fullName) person.isPlaceholder = true;
    }
    if (rel?.key) this.byKey.set(rel.key, person);
    return person;
  }

  /**
   * Oldest first (genogram convention), but only when every living member
   * has a known age; otherwise keep the questionnaire order.
   */
  private orderByAge(group: { person: Person; intake: IntakeRelative }[]): Person[] {
    const allAged = group.every(g => g.intake.status !== 'deceased' && isValidAge(g.intake.age));
    const sorted = allAged ? [...group].sort((a, b) => (b.intake.age as number) - (a.intake.age as number)) : group;
    return sorted.map(g => g.person);
  }

  /**
   * Create a Person for every questionnaire entry that has a key (the
   * relatives a partner can be linked to), so links resolve regardless of
   * the order the builder walks the form in. Each is added to the tree when
   * its own entry is reached.
   */
  private precreateKeyed(intake: IntakeForm) {
    const visitChildren = (children?: IntakeChild[]) => children?.forEach(visitEntry);
    const visitPartners = (partners?: IntakePartner[]) =>
      partners?.forEach(p => {
        visitEntry(p);
        visitChildren(p.children);
      });
    const visitEntry = (e: IntakeRelative & { partners?: IntakePartner[] }) => {
      if (e.key && !this.byKey.has(e.key)) this.createPerson(e, e.gender ?? 'unknown');
      visitPartners(e.partners);
    };
    visitPartners(intake.partners);
    (intake.siblings ?? []).forEach(visitEntry);
    visitChildren(intake.paternalAuntsUncles);
    visitChildren(intake.maternalAuntsUncles);
  }

  /** Half relatives grouped by their other parent; unknown other parents share one group */
  private halfGroups<T extends IntakeRelative & { otherParent?: IntakeRelative; otherParentCouple?: IntakeCoupleExtra }>(items: T[]) {
    const groups = new Map<string, HalfGroup<T>>();
    for (const item of items) {
      const key = item.otherParent?.key ?? '__unknown';
      if (!groups.has(key)) groups.set(key, { otherParent: item.otherParent, couple: item.otherParentCouple, items: [], persons: [] });
      groups.get(key)!.items.push(item);
    }
    return [...groups.values()];
  }

  private addHalfCouples(shared: Person, groups: HalfGroup<IntakeRelative>[]) {
    for (const g of groups) {
      if (!g.other || g.persons.length === 0) continue;
      const note = g.otherParent ? undefined : 'Relationship details unknown';
      this.addCouple(shared, g.other, g.couple?.type ?? 'casual', g.persons, note, undefined, g.couple);
    }
  }

  private applyTwins(patient: Person, siblings: IntakeSibling[], siblingPersons: Person[]) {
    const twinIdx = siblings.map((s, i) => (s.twin && s.twin !== 'none' ? i : -1)).filter(i => i >= 0);
    if (twinIdx.length === 0) return;
    const groupId = generateId('twins');
    const allIdentical = twinIdx.every(i => siblings[i].twin === 'identical');
    patient.twinGroupId = groupId;
    if (allIdentical) patient.isIdenticalTwin = true;
    for (const i of twinIdx) {
      siblingPersons[i].twinGroupId = groupId;
      if (siblings[i].twin === 'identical') siblingPersons[i].isIdenticalTwin = true;
    }
  }

  private oppositeGender(g: Gender): Gender {
    return g === 'male' ? 'female' : g === 'female' ? 'male' : 'unknown';
  }

  // ---------------------------------------------------------------------------
  // Relationships
  // ---------------------------------------------------------------------------

  private addCouple(
    a: Person,
    b: Person,
    type: RelationshipType,
    children: Person[],
    notes?: string,
    consanguinity?: IntakeConsanguinity,
    extra?: IntakeCoupleExtra,
  ) {
    // Convention: male partner on person1
    const [p1, p2] = a.gender === 'female' && b.gender === 'male' ? [b, a] : [a, b];
    const rel: Relationship = {
      id: generateId('rel'),
      type,
      person1Id: p1.id,
      person2Id: p2.id,
      childrenIds: children.map(c => c.id),
      consanguinity: 'none',
    };
    if (notes) rel.notes = notes;
    if (consanguinity && consanguinity !== 'none') this.setConsanguinity(rel, consanguinity);
    // Details carried through from an existing tree (id, dates, notes). A hand-set
    // consanguinity is kept only when the questionnaire answer doesn't replace it.
    if (extra) {
      const { consanguinity: c, consanguinityRelation: cr, consanguinityAuto: ca, ...rest } = extra;
      Object.assign(rel, rest);
      if ((!consanguinity || consanguinity === 'none') && c !== undefined && c !== 'none') {
        rel.consanguinity = c;
        if (cr) rel.consanguinityRelation = cr;
        rel.consanguinityAuto = ca;
      }
    }
    this.relationships.push(rel);
  }

  private setConsanguinity(rel: Relationship, relation: ConsanguinityRelation) {
    rel.consanguinityRelation = relation;
    rel.consanguinity = RELATION_DEGREE[relation];
  }

  /**
   * Couples whose members share an ancestor in the tree are related by
   * blood; the tree is the source of truth, so this overrides any answer
   * given in the questionnaire.
   */
  private deriveConsanguinityFromTree() {
    for (const rel of this.relationships) {
      if (rel.consanguinityAuto === false) continue; // set by a person; keep it
      const derived = deriveConsanguinity(this.persons, this.relationships, rel.person1Id, rel.person2Id);
      if (derived) {
        rel.consanguinityRelation = derived.relation;
        rel.consanguinity = derived.degree;
        rel.consanguinityAuto = true;
      }
    }
  }
}

/**
 * A relative is a placeholder when it was not described at all, was marked
 * "nothing known", or every descriptive field was left empty.
 */
function isPlaceholder(rel: IntakeRelative | undefined): boolean {
  if (!rel || rel.unknown) return true;
  return !(
    rel.fullName?.trim() ||
    rel.status === 'deceased' ||
    isValidAge(rel.age) ||
    isValidAge(rel.ageAtDeath) ||
    rel.causeOfDeath?.trim() ||
    rel.notes?.trim() ||
    rel.conditions?.some(c => c.trim())
  );
}

function isValidAge(age: unknown): age is number {
  return typeof age === 'number' && Number.isFinite(age) && age >= 0 && age <= 130;
}

/**
 * Turns condition names into ClinicalCondition objects. The same name always
 * maps to the same id and colour across the tree, and each distinct condition
 * prefers the same quadrant (1-4) so the symbols read consistently.
 */
class ConditionResolver {
  private byName = new Map<string, { base: ClinicalCondition; index: number }>();
  private available = new Map<string, ClinicalCondition>();
  private paletteIdx = 0;

  constructor(available: ClinicalCondition[]) {
    for (const c of available) this.available.set(c.name.trim().toLowerCase(), c);
  }

  resolve(names: string[]): ClinicalCondition[] {
    const result: ClinicalCondition[] = [];
    const usedQuadrants = new Set<number>();
    const seen = new Set<string>();

    for (const raw of names) {
      const name = raw.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);

      const entry = this.lookup(key, name);
      const condition: ClinicalCondition = { ...entry.base };
      delete condition.quadrant;

      const preferred = (entry.index % 4) + 1;
      const quadrant = [0, 1, 2, 3].map(o => ((preferred - 1 + o) % 4) + 1).find(q => !usedQuadrants.has(q));
      if (quadrant !== undefined) {
        usedQuadrants.add(quadrant);
        condition.quadrant = quadrant as 1 | 2 | 3 | 4;
      }
      result.push(condition);
    }
    return result;
  }

  private lookup(key: string, name: string) {
    let entry = this.byName.get(key);
    if (!entry) {
      const known = this.available.get(key);
      const base: ClinicalCondition = known
        ? { ...known }
        : { id: generateId('condition'), name, color: this.nextColor() };
      entry = { base, index: this.byName.size };
      this.byName.set(key, entry);
    }
    return entry;
  }

  private nextColor(): string {
    const taken = new Set([...this.available.values()].map(c => c.color.toLowerCase()));
    for (let i = 0; i < CONDITION_PALETTE.length; i++) {
      const color = CONDITION_PALETTE[(this.paletteIdx + i) % CONDITION_PALETTE.length];
      if (!taken.has(color)) {
        this.paletteIdx += i + 1;
        return color;
      }
    }
    return CONDITION_PALETTE[this.paletteIdx++ % CONDITION_PALETTE.length];
  }
}

interface HalfGroup<T> {
  otherParent?: IntakeRelative;
  couple?: IntakeCoupleExtra;
  items: T[];
  persons: Person[];
  other?: Person;
}
