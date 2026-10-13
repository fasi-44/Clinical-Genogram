import { Gender, Person, PersonType } from './nodes';
import { ConsanguinityRelation, Relationship, RelationshipType } from './relationships';

/** Couple details the questionnaire doesn't show, carried through when editing an existing tree */
export type IntakeCoupleExtra = Partial<
  Pick<Relationship, 'id' | 'type' | 'startDate' | 'endDate' | 'notes' | 'consanguinity' | 'consanguinityRelation' | 'consanguinityAuto'>
>;

/** Answer to "are they related by blood?" */
export type IntakeConsanguinity = 'none' | ConsanguinityRelation;

export type VitalStatus = 'alive' | 'deceased' | 'unknown';

/** Which parents a sibling shares with the patient. */
export type SiblingParentage = 'both' | 'mother' | 'father';

export type TwinType = 'none' | 'fraternal' | 'identical';

/**
 * One relative as captured by the intake questionnaire. All fields are
 * optional so partially known relatives can still be recorded.
 */
export interface IntakeRelative {
  /** Stable id assigned by the questionnaire so other answers can refer to this relative */
  key?: string;
  fullName?: string;
  gender?: Gender;
  /** The relative exists but nothing else is known; rendered as a placeholder. */
  unknown?: boolean;
  status?: VitalStatus;
  age?: number;
  ageAtDeath?: number;
  causeOfDeath?: string;
  /** Condition names; resolved to ClinicalCondition objects by the builder. */
  conditions?: string[];
  notes?: string;
  /** Person details the questionnaire doesn't show, carried through when editing an existing tree */
  extra?: Partial<Pick<Person, 'dateOfBirth' | 'dateOfDeath' | 'type' | 'twinGroupId' | 'isIdenticalTwin' | 'isPlaceholder'>>;
}

export interface IntakeSibling extends IntakeRelative {
  parentage?: SiblingParentage;
  /** Twin of the patient. */
  twin?: TwinType;
  /** The sibling's partners and their children (the patient's nephews and nieces) */
  partners?: IntakePartner[];
  /** Half siblings: the parent they don't share with the patient, when known */
  otherParent?: IntakeRelative;
  otherParentCouple?: IntakeCoupleExtra;
}

export interface IntakeChild extends IntakeRelative {
  type?: PersonType;
  /**
   * Aunts and uncles only: which of the patient's grandparents (on that side)
   * they share with the patient's parent. 'father' = grandfather only,
   * 'mother' = grandmother only (a half aunt or uncle). Default 'both'.
   */
  parentage?: SiblingParentage;
  /** Half aunts and uncles: their other parent (not the patient's grandparent), when known */
  otherParent?: IntakeRelative;
  otherParentCouple?: IntakeCoupleExtra;
  /** The child's own partners and their children (grandchildren, great-grandchildren, ...) */
  partners?: IntakePartner[];
}

export interface IntakePartner extends IntakeRelative {
  relationshipType?: RelationshipType;
  /** Blood relationship to the person they partner (ignored when linked to a relative in the tree) */
  consanguinity?: IntakeConsanguinity;
  /**
   * `key` of a relative already in the questionnaire (e.g. a cousin) who is
   * this partner. The partner's own fields are then ignored and the blood
   * relationship is worked out from the tree.
   */
  linkedRelativeKey?: string;
  coupleExtra?: IntakeCoupleExtra;
  children?: IntakeChild[];
}

export interface IntakeGrandparents {
  maternalGrandmother?: IntakeRelative;
  maternalGrandfather?: IntakeRelative;
  paternalGrandmother?: IntakeRelative;
  paternalGrandfather?: IntakeRelative;
}

/**
 * Answers from the guided family-history questionnaire. Every relative is
 * described relative to the patient (proband). A relative left `undefined`
 * was not asked about / skipped.
 */
export interface IntakeForm {
  patient: IntakeRelative;
  father?: IntakeRelative;
  mother?: IntakeRelative;
  parentsRelationship?: RelationshipType;
  /** Whether the patient's parents are related by blood */
  parentsConsanguinity?: IntakeConsanguinity;
  parentsCoupleExtra?: IntakeCoupleExtra;
  siblings?: IntakeSibling[];
  partners?: IntakePartner[];
  grandparents?: IntakeGrandparents;
  /** Father's brothers and sisters; their partners' children are paternal cousins */
  paternalAuntsUncles?: IntakeChild[];
  /** Mother's brothers and sisters; their partners' children are maternal cousins */
  maternalAuntsUncles?: IntakeChild[];
}
