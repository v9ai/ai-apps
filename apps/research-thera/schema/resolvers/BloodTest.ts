import type { BloodTestResolvers } from "./../types.generated";
import { appBaseUrl } from "@/app/lib/app-url";

export const BloodTest: BloodTestResolvers = {
  fileUrl: (parent) => `${appBaseUrl()}/api/healthcare/blood-test-file/${parent.id}`,
};
