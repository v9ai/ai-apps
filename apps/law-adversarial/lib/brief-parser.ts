import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
import mammoth from "mammoth";

export async function parseBrief(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error(`Unsupported file type: ${file.name}. Only PDF and DOCX are supported.`);
}
