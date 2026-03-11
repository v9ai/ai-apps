import { readFile, access } from "fs/promises";
import { join } from "path";
import type { Attachment } from "resend";

export const ResumeConfig = {
  RESUME_PATH: join(process.cwd(), "src", "data", "CV_Vadim_Nicolai.pdf"),
  RESUME_FILENAME: "Vadim_Nicolai_Resume.pdf",
  RESUME_CONTENT_TYPE: "application/pdf",
} as const;

export async function loadResumeAttachment(): Promise<Attachment> {
  const buffer = await readFile(ResumeConfig.RESUME_PATH);
  return {
    content: buffer.toString("base64"),
    filename: ResumeConfig.RESUME_FILENAME,
    contentType: ResumeConfig.RESUME_CONTENT_TYPE,
  };
}

export async function resumeExists(): Promise<boolean> {
  try {
    await access(ResumeConfig.RESUME_PATH);
    return true;
  } catch {
    return false;
  }
}
