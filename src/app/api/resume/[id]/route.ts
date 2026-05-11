import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...resume,
    content: JSON.parse(resume.content),
    usedExpIds: JSON.parse(resume.usedExpIds),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { title, content, template } = body;

  const resume = await prisma.resume.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content: JSON.stringify(content) }),
      ...(template !== undefined && { template }),
    },
  });
  return NextResponse.json({
    ...resume,
    content: JSON.parse(resume.content),
    usedExpIds: JSON.parse(resume.usedExpIds),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.resume.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
