import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      template: true,
      createdAt: true,
      updatedAt: true,
      jdText: true,
    },
  });
  return NextResponse.json(
    resumes.map((r) => ({
      ...r,
      jdPreview: r.jdText.slice(0, 100),
      jdText: undefined,
    }))
  );
}
