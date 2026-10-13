import {
  GenogramData,
  IntakeChild,
  IntakeCoupleExtra,
  IntakeForm,
  IntakePartner,
  IntakeRelative,
  IntakeSibling,
  Person,
  Relationship,
} from '../types';

export interface TreeToIntakeResult {
  intake: IntakeForm;
  /** Ids of everyone the questionnaire represents (the rest are kept as they are on update) */
  placedIds: Set<string>;
  /** Placed people who appear only as someone's partner (not as a blood relative) */
  partnerOnlyIds: Set<string>;
}

/**
 * Read a genogram back into questionnaire answers, seen from `probandId`.
 *
 * Every entry's `key` is the person's id, so rebuilding keeps ids stable.
 * People who appear in two roles (a cousin who is also the patient's wife)
 * are entered once, where they belong by blood, and linked from the other
 * place. Details the questionnaire doesn't show travel in `extra` and
 * `coupleExtra`. People outside the questionnaire's reach (great-grandparents,
 * grandparents' other relatives, in-laws' families) are not placed; the
 * caller keeps them unchanged.
 */
export function intakeFromTree(data: GenogramData, probandId: string): TreeToIntakeResult {
  const byId = new Map(data.persons.map(p => [p.id, p]));
  const couples = data.relationships.filter(r => r.type !== 'child' && byId.has(r.person1Id) && byId.has(r.person2Id));
  const parentCoupleOf = (id: string) => couples.find(r => r.childrenIds.includes(id));
  const couplesOf = (id: string) => couples.filter(r => r.person1Id === id || r.person2Id === id);
  const other = (r: Relationship, id: string) => byId.get(r.person1Id === id ? r.person2Id : r.person1Id)!;
  const children = (r: Relationship) => r.childrenIds.map(id => byId.get(id)).filter((p): p is Person => !!p);
  const maleFirst = (r: Relationship): [Person, Person] => {
    const a = byId.get(r.person1Id)!;
    const b = byId.get(r.person2Id)!;
    return a.gender === 'female' && b.gender === 'male' ? [b, a] : [a, b];
  };

  const placed = new Set<string>();
  const partnerOnly = new Set<string>();
  const emitted = new Set<string>();
  const place = (p: Person) => placed.add(p.id);

  const proband = byId.get(probandId);
  if (!proband) throw new Error(`Patient ${probandId} is not on the tree`);

  // ---------------------------------------------------------------
  // Blood relatives with a fixed place in the questionnaire
  // ---------------------------------------------------------------
  const intake: IntakeForm = { patient: relative(proband), siblings: [], partners: [], grandparents: {} };
  place(proband);

  const parents = parentCoupleOf(proband.id);
  let father: Person | undefined;
  let mother: Person | undefined;
  const siblingPersons: Person[] = [];
  const auntEntries: { person: Person; entry: IntakeChild }[] = [];

  if (parents) {
    emitted.add(parents.id);
    [father, mother] = maleFirst(parents);
    intake.father = relative(father);
    intake.mother = relative(mother);
    place(father);
    place(mother);
    intake.parentsRelationship = parents.type;
    const manual = manualConsanguinity(parents);
    if (manual.answer) intake.parentsConsanguinity = manual.answer;
    intake.parentsCoupleExtra = coupleExtra(parents, manual.keep);

    // Full siblings, then half siblings through either parent's other couples
    for (const s of children(parents)) {
      if (s.id === proband.id) continue;
      intake.siblings!.push(sibling(s, 'both'));
      siblingPersons.push(s);
    }
    const halfVia = (parent: Person, parentage: 'father' | 'mother') => {
      for (const r of couplesOf(parent.id)) {
        if (r.id === parents.id) continue;
        if (r.childrenIds.length === 0) continue;
        emitted.add(r.id);
        const otherParent = other(r, parent.id);
        place(otherParent);
        for (const s of children(r)) {
          const entry = sibling(s, parentage);
          entry.otherParent = relative(otherParent);
          entry.otherParentCouple = { ...coupleExtra(r, manualConsanguinity(r).keep), type: r.type };
          intake.siblings!.push(entry);
          siblingPersons.push(s);
        }
      }
    };
    halfVia(father, 'father');
    halfVia(mother, 'mother');

    // Grandparents and aunts/uncles (full and half) on each side
    const side = (parent: Person, gfKey: 'paternalGrandfather' | 'maternalGrandfather', gmKey: 'paternalGrandmother' | 'maternalGrandmother') => {
      const gp = parentCoupleOf(parent.id);
      const aunts: IntakeChild[] = [];
      if (!gp) return aunts;
      emitted.add(gp.id);
      const [gf, gm] = maleFirst(gp);
      intake.grandparents![gfKey] = relative(gf);
      intake.grandparents![gmKey] = relative(gm);
      place(gf);
      place(gm);
      const addAunt = (a: Person, parentage: 'both' | 'father' | 'mother', via?: Relationship, grandparent?: Person) => {
        const entry: IntakeChild = { ...relative(a), ...(a.type !== 'standard' ? { type: a.type } : {}) };
        if (parentage !== 'both') entry.parentage = parentage;
        if (via && grandparent) {
          const otherParent = other(via, grandparent.id);
          place(otherParent);
          entry.otherParent = relative(otherParent);
          entry.otherParentCouple = { ...coupleExtra(via, manualConsanguinity(via).keep), type: via.type };
        }
        aunts.push(entry);
        auntEntries.push({ person: a, entry });
        place(a);
      };
      for (const a of children(gp)) if (a.id !== parent.id) addAunt(a, 'both');
      for (const [grandparent, parentage] of [[gf, 'father'], [gm, 'mother']] as const) {
        for (const r of couplesOf(grandparent.id)) {
          if (r.id === gp.id || r.childrenIds.length === 0) continue;
          emitted.add(r.id);
          for (const a of children(r)) addAunt(a, parentage, r, grandparent);
        }
      }
      return aunts;
    };
    intake.paternalAuntsUncles = side(father, 'paternalGrandfather', 'paternalGrandmother');
    intake.maternalAuntsUncles = side(mother, 'maternalGrandfather', 'maternalGrandmother');
  }

  // Everyone who will be entered as a blood relative somewhere: the people
  // above plus all their descendants. Partners who are in this set are linked.
  const blood = new Set(placed);
  const stack = [...placed].filter(id => id !== father?.id && id !== mother?.id && !isGrandparent(id));
  while (stack.length) {
    const id = stack.pop()!;
    for (const r of couplesOf(id)) {
      for (const c of r.childrenIds) {
        if (!blood.has(c) && byId.has(c)) {
          blood.add(c);
          stack.push(c);
        }
      }
    }
  }
  function isGrandparent(id: string) {
    const g = intake.grandparents ?? {};
    return [g.paternalGrandfather, g.paternalGrandmother, g.maternalGrandfather, g.maternalGrandmother].some(x => x?.key === id);
  }

  // ---------------------------------------------------------------
  // Partners and their children, recursively (patient first, so a couple
  // between two blood relatives is entered from the patient's side)
  // ---------------------------------------------------------------
  const links: { entry: IntakePartner; person: Person }[] = [];

  const partnersFor = (person: Person): IntakePartner[] => {
    const out: IntakePartner[] = [];
    for (const r of couplesOf(person.id)) {
      if (emitted.has(r.id)) continue;
      emitted.add(r.id);
      const partner = other(r, person.id);
      const manual = manualConsanguinity(r);
      let entry: IntakePartner;
      if (blood.has(partner.id) && partner.id !== person.id) {
        entry = { linkedRelativeKey: partner.id };
        links.push({ entry, person: partner });
      } else {
        entry = { ...relative(partner) };
        place(partner);
        partnerOnly.add(partner.id);
        if (manual.answer) entry.consanguinity = manual.answer;
      }
      entry.relationshipType = r.type;
      entry.coupleExtra = coupleExtra(r, manual.keep);
      entry.children = children(r).map(c => child(c));
      out.push(entry);
    }
    return out;
  };

  function child(c: Person): IntakeChild {
    place(c);
    const entry: IntakeChild = { ...relative(c) };
    if (c.type !== 'standard') entry.type = c.type;
    const partners = partnersFor(c);
    if (partners.length) entry.partners = partners;
    return entry;
  }

  function sibling(s: Person, parentage: 'both' | 'father' | 'mother'): IntakeSibling {
    place(s);
    const entry: IntakeSibling = { ...relative(s) };
    if (parentage !== 'both') entry.parentage = parentage;
    if (s.twinGroupId && s.twinGroupId === proband!.twinGroupId) entry.twin = s.isIdenticalTwin ? 'identical' : 'fraternal';
    return entry;
  }

  intake.partners = partnersFor(proband);
  intake.siblings!.forEach((entry, i) => {
    const partners = partnersFor(siblingPersons[i]);
    if (partners.length) entry.partners = partners;
  });
  for (const { person, entry } of auntEntries) {
    const partners = partnersFor(person);
    if (partners.length) entry.partners = partners;
  }

  // A link only works if the linked person was entered somewhere; otherwise
  // enter them right here instead
  for (const { entry, person } of links) {
    if (!placed.has(person.id)) {
      delete entry.linkedRelativeKey;
      Object.assign(entry, relative(person));
      place(person);
    }
  }

  return { intake, placedIds: placed, partnerOnlyIds: partnerOnly };

  // ---------------------------------------------------------------
  // Field mapping
  // ---------------------------------------------------------------
  function relative(p: Person): IntakeRelative {
    const r: IntakeRelative = { key: p.id, gender: p.gender };
    if (p.fullName) r.fullName = p.fullName;
    if (p.isPlaceholder && !p.fullName) r.unknown = true;
    r.status = p.isDeceased ? 'deceased' : 'alive';
    if (p.age !== undefined) r.age = p.age;
    if (p.ageAtDeath !== undefined) r.ageAtDeath = p.ageAtDeath;
    if (p.conditions?.length) r.conditions = p.conditions.map(c => c.name);
    if (p.notes) r.notes = p.notes;
    const extra: IntakeRelative['extra'] = {};
    if (p.dateOfBirth) extra.dateOfBirth = p.dateOfBirth;
    if (p.dateOfDeath) extra.dateOfDeath = p.dateOfDeath;
    if (p.type !== 'standard') extra.type = p.type;
    if (p.twinGroupId) extra.twinGroupId = p.twinGroupId;
    if (p.isIdenticalTwin) extra.isIdenticalTwin = p.isIdenticalTwin;
    if (p.isPlaceholder) extra.isPlaceholder = true;
    if (Object.keys(extra).length) r.extra = extra;
    return r;
  }
}

/**
 * Consanguinity a person recorded on a couple: as a questionnaire answer when
 * it has a plain-language relation, and kept verbatim otherwise (e.g. a
 * degree with no relation). Automatic values are left for the builder to
 * work out again.
 */
function manualConsanguinity(r: Relationship): { answer?: IntakePartner['consanguinity']; keep: boolean } {
  if (r.consanguinityAuto === true) return { keep: false };
  if (r.consanguinityRelation) return { answer: r.consanguinityRelation, keep: false };
  if (r.consanguinity !== 'none') return { keep: true };
  return { keep: r.consanguinityAuto === false };
}

function coupleExtra(r: Relationship, keepConsanguinity: boolean): IntakeCoupleExtra {
  const extra: IntakeCoupleExtra = { id: r.id };
  if (r.startDate) extra.startDate = r.startDate;
  if (r.endDate) extra.endDate = r.endDate;
  if (r.notes) extra.notes = r.notes;
  if (keepConsanguinity) {
    extra.consanguinity = r.consanguinity;
    if (r.consanguinityRelation) extra.consanguinityRelation = r.consanguinityRelation;
    extra.consanguinityAuto = false;
  }
  return extra;
}

/**
 * After rebuilding from edited answers, put back everything the
 * questionnaire couldn't show: people who were never in it (and the links
 * among them and to the rebuilt family). People who were in the
 * questionnaire but are missing from the rebuilt tree were removed on
 * purpose and stay removed.
 */
export function mergeKept(
  built: GenogramData,
  original: GenogramData,
  placedIds: Set<string>,
  partnerOnlyIds: Set<string> = new Set(),
): GenogramData {
  const builtIds = new Set(built.persons.map(p => p.id));
  const kept = original.persons.filter(p => !builtIds.has(p.id) && !placedIds.has(p.id));
  const finalIds = new Set([...builtIds, ...kept.map(p => p.id)]);

  // A partner who disappeared only because their card sat inside a removed
  // person's card (e.g. a sister's husband) stays if their own parents are
  // still on the board; they belong to that family too
  const parentsOf = (id: string) => original.relationships.find(r => r.childrenIds.includes(id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of original.persons) {
      if (finalIds.has(p.id) || !partnerOnlyIds.has(p.id)) continue;
      const pr = parentsOf(p.id);
      if (pr && finalIds.has(pr.person1Id) && finalIds.has(pr.person2Id)) {
        kept.push(p);
        finalIds.add(p.id);
        changed = true;
      }
    }
  }

  const pairKey = (r: Relationship) => [r.person1Id, r.person2Id].sort().join('|');
  const builtPairs = new Set(built.relationships.map(pairKey));
  const builtRelIds = new Set(built.relationships.map(r => r.id));
  const hasParents = new Set(built.relationships.flatMap(r => r.childrenIds));

  const keptRels: Relationship[] = [];
  for (const r of original.relationships) {
    if (builtRelIds.has(r.id) || builtPairs.has(pairKey(r))) continue;
    if (!finalIds.has(r.person1Id) || !finalIds.has(r.person2Id)) continue;
    // A child keeps the parents the rebuilt tree gave them
    const childrenIds = r.childrenIds.filter(c => finalIds.has(c) && !hasParents.has(c));
    childrenIds.forEach(c => hasParents.add(c));
    keptRels.push({ ...r, childrenIds });
  }

  return {
    ...built,
    persons: [...built.persons, ...kept.map(p => ({ ...p }))],
    relationships: [...built.relationships, ...keptRels],
  };
}
