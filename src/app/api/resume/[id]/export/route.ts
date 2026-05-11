import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDocxBuffer } from "@/lib/docx-generator";
import type { ResumeContent } from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = JSON.parse(resume.content) as ResumeContent;
  const template = resume.template as "classic" | "modern" | "compact";

  const buffer = await generateDocxBuffer(content, template);
  const filename = `${resume.title || "resume"}.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
