import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let profile = await prisma.profile.findFirst();
  if (!profile) {
    profile = await prisma.profile.create({ data: { name: "" } });
  }
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, location, linkedin, github, website, summary, photo } = body;

  let profile = await prisma.profile.findFirst();
  if (!profile) {
    profile = await prisma.profile.create({
      data: { name: name || "", email, phone, location, linkedin, github, website, summary, photo },
    });
  } else {
    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        name: name ?? profile.name,
        email,
        phone,
        location,
        linkedin,
        github,
        website,
        summary,
        ...(photo !== undefined && { photo: photo || null }),
      },
    });
  }
  return NextResponse.json(profile);
}
