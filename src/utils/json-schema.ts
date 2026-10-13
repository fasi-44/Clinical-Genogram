export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Lightweight runtime validator for GenogramData objects.
 * No external dependencies (no ajv) - performs structural and
 * cross-reference validation entirely at runtime.
 */
export function validateGenogramData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  // Check version
  if (typeof obj.version !== 'string') {
    errors.push('Missing or invalid "version" field');
  }

  // Check persons array
  if (!Array.isArray(obj.persons)) {
    errors.push('Missing or invalid "persons" array');
  } else {
    (obj.persons as any[]).forEach((p: any, i: number) => {
      if (!p.id || typeof p.id !== 'string') {
        errors.push(`Person[${i}]: missing or invalid "id"`);
      }
      if (!['male', 'female', 'unknown'].includes(p.gender)) {
        errors.push(`Person[${i}]: invalid "gender"`);
      }
      if (typeof p.isDeceased !== 'boolean') {
        errors.push(`Person[${i}]: missing "isDeceased"`);
      }
      for (const field of ['age', 'ageAtDeath']) {
        if (p[field] !== undefined && (typeof p[field] !== 'number' || p[field] < 0)) {
          errors.push(`Person[${i}]: invalid "${field}"`);
        }
      }
    });
  }

  // Check relationships array
  if (!Array.isArray(obj.relationships)) {
    errors.push('Missing or invalid "relationships" array');
  } else {
    (obj.relationships as any[]).forEach((r: any, i: number) => {
      if (!r.id || typeof r.id !== 'string') {
        errors.push(`Relationship[${i}]: missing or invalid "id"`);
      }
      if (!r.type || typeof r.type !== 'string') {
        errors.push(`Relationship[${i}]: missing or invalid "type"`);
      }
      if (!r.person1Id || typeof r.person1Id !== 'string') {
        errors.push(`Relationship[${i}]: missing "person1Id"`);
      }
      if (!r.person2Id || typeof r.person2Id !== 'string') {
        errors.push(`Relationship[${i}]: missing "person2Id"`);
      }
    });
  }

  // Cross-reference: all relationship person IDs must exist in persons
  if (Array.isArray(obj.persons) && Array.isArray(obj.relationships)) {
    const personIds = new Set((obj.persons as any[]).map((p: any) => p.id));
    (obj.relationships as any[]).forEach((r: any, i: number) => {
      if (r.person1Id && !personIds.has(r.person1Id)) {
        errors.push(`Relationship[${i}]: person1Id "${r.person1Id}" not found`);
      }
      if (r.person2Id && !personIds.has(r.person2Id)) {
        errors.push(`Relationship[${i}]: person2Id "${r.person2Id}" not found`);
      }
      if (Array.isArray(r.childrenIds)) {
        r.childrenIds.forEach((cid: string) => {
          if (!personIds.has(cid)) {
            errors.push(`Relationship[${i}]: childId "${cid}" not found`);
          }
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
