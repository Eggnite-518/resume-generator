import Link from "next/link";
import { prisma } from "@/lib/db";
import ExperienceList from "@/components/experience/ExperienceList";
import { EXPERIENCE_TYPE_LABELS, type ExperienceType } from "@/types";

export default async function ExperiencesPage() {
  const experiences = await prisma.experience.findMany({
    orderBy: { createdAt: "desc" },
  });

  const exps = experiences.map((e) => ({
    ...e,
    type: e.type as import("@/types").ExperienceType,
    tags: JSON.parse(e.tags) as string[],
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">经历库</h1>
          <p className="text-gray-500 mt-1">共 {exps.length} 条经历，生成简历时 AI 会从这里匹配</p>
        </div>
        <Link
          href="/experiences/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 添加经历
        </Link>
      </div>

      {exps.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">经历库还是空的</h2>
          <p className="text-gray-400 text-sm mb-6">
            添加你的工作经历、项目经历、教育背景等，AI 会帮你匹配岗位
          </p>
          <Link
            href="/experiences/new"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            添加第一条经历
          </Link>
        </div>
      ) : (
        <ExperienceList experiences={exps} />
      )}
    </div>
  );
}
