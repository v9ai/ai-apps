import type { FamilyDocumentResolvers } from "./../types.generated";
import { appBaseUrl } from "@/app/lib/app-url";

export const FamilyDocument: FamilyDocumentResolvers = {
  fileUrl: (parent) =>
    parent.filePath
      ? `${appBaseUrl()}/api/healthcare/family-document-file/${parent.id}`
      : null,
};
