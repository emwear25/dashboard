import icd10Data from "@/data/icd-10.json";

interface ICD10Diagnosis {
  code: string;
  description: string;
}

/**
 * Get diagnosis description by ICD-10 code
 * @param code ICD-10 code (e.g., "A00.0")
 * @returns The diagnosis description or null if not found
 */
export function getDiagnosisDescription(code: string): string | null {
  const diagnosis = (icd10Data as ICD10Diagnosis[]).find(
    (d) => d.code === code
  );
  return diagnosis ? diagnosis.description : null;
}

/**
 * Format diagnosis for display
 * If the input is an ICD-10 code, returns "CODE - Description"
 * If not found in ICD-10 data, returns the input as-is
 * @param diagnosis Either an ICD-10 code or free text diagnosis
 * @returns Formatted diagnosis string
 */
export function formatDiagnosisForDisplay(diagnosis: string): string {
  if (!diagnosis) return "";

  // Try to find the diagnosis in ICD-10 data
  const icd10Entry = (icd10Data as ICD10Diagnosis[]).find(
    (d) => d.code === diagnosis
  );

  if (icd10Entry) {
    return `${icd10Entry.code} - ${icd10Entry.description}`;
  }

  // If it's already in "CODE - Description" format, return as-is
  if (diagnosis.includes(" - ")) {
    return diagnosis;
  }

  // Otherwise, return the original diagnosis (might be free text)
  return diagnosis;
}

/**
 * Extract ICD-10 code from formatted diagnosis string
 * @param formattedDiagnosis String in format "CODE - Description"
 * @returns Just the ICD-10 code part
 */
export function extractICD10Code(formattedDiagnosis: string): string {
  if (!formattedDiagnosis) return "";

  // If it contains " - ", extract the code part
  if (formattedDiagnosis.includes(" - ")) {
    return formattedDiagnosis.split(" - ")[0];
  }

  // Otherwise return as-is (might already be just a code)
  return formattedDiagnosis;
}

/**
 * Check if a string is a valid ICD-10 code format
 * @param code String to check
 * @returns True if it matches ICD-10 code pattern
 */
export function isValidICD10Code(code: string): boolean {
  if (!code) return false;
  
  // Basic ICD-10 code pattern: Letter followed by digits and optional decimal
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,2})?$/;
  return icd10Pattern.test(code);
}

/**
 * Search ICD-10 diagnoses by query
 * @param query Search term
 * @param limit Maximum number of results (default: 50)
 * @returns Array of matching diagnoses
 */
export function searchICD10Diagnoses(
  query: string,
  limit: number = 50
): ICD10Diagnosis[] {
  if (!query || query.length < 2) {
    return [];
  }

  const lowercaseQuery = query.toLowerCase();
  return (icd10Data as ICD10Diagnosis[])
    .filter(
      (diagnosis) =>
        diagnosis.code.toLowerCase().includes(lowercaseQuery) ||
        diagnosis.description.toLowerCase().includes(lowercaseQuery)
    )
    .slice(0, limit);
} 