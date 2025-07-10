declare module "@/data/icd-10.json" {
  interface ICD10Diagnosis {
    code: string;
    description: string;
  }

  const icd10Data: ICD10Diagnosis[];
  export default icd10Data;
} 