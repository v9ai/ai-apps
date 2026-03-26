import { resumeStatus } from "./resume-status";
import { askAboutResume } from "./ask-about-resume";
import { uploadResume } from "./upload-resume";

export const resumeResolvers = {
  Query: {
    resumeStatus,
    askAboutResume,
  },

  Mutation: {
    uploadResume,

    async rateResumeAnswer(
      _parent: any,
      args: { traceId: string; helpful: boolean },
      context: any,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      return false;
    },

    async ingestResumeParse(
      _parent: any,
      args: { email: string; job_id: string; filename: string },
      context: any,
    ) {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }
      // Stub — pipeline not connected
      return {
        success: true,
        status: "COMPLETE",
        job_id: args.job_id,
        resume_id: null,
        chunks_stored: null,
      };
    },
  },
};
