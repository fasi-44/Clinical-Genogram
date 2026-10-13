import { GenogramData } from '../types';
import { validateGenogramData, ValidationResult } from './json-schema';
import { migratePerson } from './migrate';

export interface ImportResult {
  data: GenogramData | null;
  validation: ValidationResult;
  migrated: boolean;
}

/**
 * Parses a JSON string into a GenogramData object.
 * Applies version migration for older formats and fills in
 * default values for optional fields before validation.
 */
export function importFromJson(jsonString: string): ImportResult {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      data: null,
      validation: { valid: false, errors: ['Invalid JSON format'] },
      migrated: false,
    };
  }

  // Version migration
  let migrated = false;
  if (!parsed.version) {
    parsed.version = '1.0.0';
    migrated = true;
  }

  // Ensure default fields on persons
  if (Array.isArray(parsed.persons)) {
    parsed.persons = parsed.persons.map((p: any) => migratePerson({
      isDeceased: false,
      isProband: false,
      conditions: [],
      type: 'standard',
      ...p,
    }));
  }

  // Ensure default fields on relationships
  if (Array.isArray(parsed.relationships)) {
    parsed.relationships = parsed.relationships.map((r: any) => ({
      childrenIds: [],
      consanguinity: 'none',
      ...r,
    }));
  }

  const validation = validateGenogramData(parsed);

  return {
    data: validation.valid ? (parsed as GenogramData) : null,
    validation,
    migrated,
  };
}

/**
 * Reads a File object (e.g. from an <input type="file">) and
 * imports its contents as GenogramData.
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  return importFromJson(text);
}
