import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ExperienceEditForm from "@/components/experience/ExperienceEditForm";

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exp = await prisma.experience.findUnique({ where: { id } });
  if (!exp) notFound();

  const data = {
    ...exp,
    type: exp.type as import("@/types").ExperienceType,
    tags: JSON.parse(exp.tags) as string[],
    createdAt: exp.createdAt.toISOString(),
    updatedAt: exp.updatedAt.toISOString(),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">编辑经历</h1>
      <p className="text-gray-500 mb-8">{data.title}</p>
      <ExperienceEditForm experience={data} />
    </div>
  );
}
