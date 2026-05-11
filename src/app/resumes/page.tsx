import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ResumesPage() {
  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, template: true, createdAt: true, jdText: true },
  });

  const TEMPLATE_LABELS: Record<string, string> = {
    classic: "经典",
    modern: "现代",
    compact: "紧凑",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">历史简历</h1>
          <p className="text-gray-500 mt-1">共 {resumes.length} 份简历</p>
        </div>
        <Link
          href="/generate"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 生成新简历
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">还没有生成过简历</h2>
          <p className="text-gray-400 text-sm mb-6">粘贴岗位 JD，AI 自动帮你生成匹配的简历</p>
          <Link
            href="/generate"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            生成第一份简历
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {resumes.map((r) => (
            <Link
              key={r.id}
              href={`/resumes/${r.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all flex items-center gap-4"
            >
              <div className="text-3xl shrink-0">📄</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{r.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {TEMPLATE_LABELS[r.template] || r.template}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-1">
                  {r.jdText.slice(0, 80)}...
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                </div>
                <div className="text-xs text-blue-500 mt-1">查看 →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
