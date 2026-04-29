import type { MedicalLetterResolvers } from "./../types.generated";
import { appBaseUrl } from "@/app/lib/app-url";

export const MedicalLetter: MedicalLetterResolvers = {
  fileUrl: (parent) => `${appBaseUrl()}/api/healthcare/medical-letter-file/${parent.id}`,
};
