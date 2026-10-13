import { GenogramData } from '../types';
import { validateGenogramData } from './json-schema';

/**
 * Exports GenogramData to a JSON Blob, with validation results.
 */
export function exportToJson(data: GenogramData): { blob: Blob; valid: boolean; errors: string[] } {
  const validation = validateGenogramData(data);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  return { blob, valid: validation.valid, errors: validation.errors };
}

/**
 * Exports GenogramData as a JSON file and triggers a browser download.
 */
export function downloadJson(data: GenogramData, filename = 'genogram.json'): void {
  const { blob } = exportToJson(data);
  triggerDownload(blob, filename);
}

/**
 * Utility: trigger a file download from a Blob.
 * Appends a temporary anchor to the body so the click works across all browsers,
 * and delays URL revocation so the download has time to start.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Remove element and revoke after a short delay so the download initiates
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
