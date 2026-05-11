export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();
  if (
    mimeType === "application/pdf" ||
    ext === "pdf"
  ) {
    return extractTextFromPDF(buffer);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return extractTextFromDocx(buffer);
  }
  if (mimeType === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }
  throw new Error(`不支持的文件类型: ${mimeType}`);
}
