import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ResumeEditor from "@/components/resume/ResumeEditor";
import type { ResumeContent } from "@/types";

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [resume, profile] = await Promise.all([
    prisma.resume.findUnique({ where: { id } }),
    prisma.profile.findFirst(),
  ]);
  if (!resume) notFound();

  const content = JSON.parse(resume.content) as ResumeContent;

  // Always inject photo fresh from profile (photo is NOT stored in resume content)
  if (profile?.photo) {
    content.personalInfo.photo = profile.photo;
  }

  const data = {
    id: resume.id,
    title: resume.title,
    jdText: resume.jdText,
    content,
    template: resume.template as "classic" | "modern" | "compact",
    usedExpIds: JSON.parse(resume.usedExpIds) as string[],
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };

  return <ResumeEditor initialData={data} />;
}
