export type RelationshipType =
  | 'marriage'
  | 'separation'
  | 'legal-separation'
  | 'divorce'
  | 'engagement'
  | 'cohabitation'
  | 'cohabitation-separation'
  | 'cohabitation-legal-separation'
  | 'cohabitation-divorce'
  | 'casual'
  | 'committed'
  | 'temporary'
  | 'casual-separation'
  | 'committed-separation'
  | 'temporary-separation'
  | 'love-affair'
  | 'nullity'
  | 'child';

export type ConsanguinityType =
  | 'none'
  | 'first-degree'
  | 'second-degree'
  | 'third-degree'
  | 'distant';

/**
 * How two partners are related by blood, in the terms clinicians record.
 * `consanguinity` holds the matching genetic degree.
 */
export type ConsanguinityRelation =
  | 'first-cousins'
  | 'first-cousins-once-removed'
  | 'second-cousins'
  | 'uncle-niece'
  | 'aunt-nephew'
  | 'other'
  | 'unknown';

export interface Relationship {
  id: string;
  type: RelationshipType;
  person1Id: string;
  person2Id: string;
  childrenIds: string[];
  consanguinity: ConsanguinityType;
  /** Plain-language blood relationship between the partners, when known */
  consanguinityRelation?: ConsanguinityRelation;
  /**
   * Who set the consanguinity: true = worked out from the tree (kept up to
   * date as the family changes), false = set by a person (never overwritten).
   * Left out on older data, where any recorded value counts as set by a person.
   */
  consanguinityAuto?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
}
