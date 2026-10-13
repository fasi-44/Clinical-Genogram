export type Gender = 'male' | 'female' | 'unknown';

export type PersonType =
  | 'standard'
  | 'adopted'
  | 'foster'
  | 'pregnancy'
  | 'miscarriage'
  | 'abortion'
  | 'stillbirth'
  | 'pet';

/** Built-in icons drawn inside a condition's quarter */
export type ConditionIconName = 'heart' | 'drop' | 'ribbon' | 'mind' | 'lungs' | 'glass' | 'pill' | 'bolt';

export interface ClinicalCondition {
  id: string;
  name: string;
  color: string;
  description?: string;
  quadrant?: 1 | 2 | 3 | 4;
  /** Icon to draw in the quarter; when omitted it is picked from the name (or the first letter is used) */
  icon?: ConditionIconName;
}

export interface Person {
  id: string;
  fullName?: string;
  gender: Gender;
  type: PersonType;
  dateOfBirth?: string;
  dateOfDeath?: string;
  /** Age in years (living persons). Used when the exact date of birth is unknown. */
  age?: number;
  /** Age in years at death. Used when the exact date of death is unknown. */
  ageAtDeath?: number;
  isDeceased: boolean;
  isProband: boolean;
  /** Structural stand-in created so the tree connects (e.g. an unknown grandparent). */
  isPlaceholder?: boolean;
  conditions: ClinicalCondition[];
  notes?: string;
  x?: number;
  y?: number;
  generation?: number;
  twinGroupId?: string;
  isIdenticalTwin?: boolean;
}
