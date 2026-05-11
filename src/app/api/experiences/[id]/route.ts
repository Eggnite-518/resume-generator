import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const exp = await prisma.experience.findUnique({ where: { id } });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...exp, tags: JSON.parse(exp.tags) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { type, title, organization, projectName, startDate, endDate, description, tags } = body;

  const exp = await prisma.experience.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title }),
      ...(organization !== undefined && { organization }),
      ...(projectName !== undefined && { projectName: projectName || null }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(description !== undefined && { description }),
      ...(tags !== undefined && { tags: JSON.stringify(tags) }),
    },
  });
  return NextResponse.json({ ...exp, tags: JSON.parse(exp.tags) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.experience.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
