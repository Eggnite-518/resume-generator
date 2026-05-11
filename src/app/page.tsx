import Link from "next/link";
import { prisma } from "@/lib/db";
import { EXPERIENCE_TYPE_LABELS } from "@/types";

export default async function DashboardPage() {
  const [expCount, resumeCount, recentResumes, expByType] = await Promise.all([
    prisma.experience.count(),
    prisma.resume.count(),
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, template: true, createdAt: true },
    }),
    prisma.experience.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  const typeMap = Object.fromEntries(expByType.map((e) => [e.type, e._count._all]));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-gray-500 mt-1">欢迎使用简历快速生成器</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-3xl font-bold text-blue-600">{expCount}</div>
          <div className="text-sm text-gray-500 mt-1">经历条目</div>
          <Link href="/experiences" className="text-xs text-blue-500 hover:underline mt-2 block">
            管理经历库 →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-3xl font-bold text-green-600">{resumeCount}</div>
          <div className="text-sm text-gray-500 mt-1">已生成简历</div>
          <Link href="/resumes" className="text-xs text-blue-500 hover:underline mt-2 block">
            查看历史 →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-3xl font-bold text-purple-600">
            {Object.keys(typeMap).length}
          </div>
          <div className="text-sm text-gray-500 mt-1">经历类型</div>
          <Link href="/experiences/new" className="text-xs text-blue-500 hover:underline mt-2 block">
            添加经历 →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="space-y-3">
            <Link
              href="/experiences/new"
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <span className="text-xl">📝</span>
              <div>
                <div className="text-sm font-medium text-blue-700">添加新经历</div>
                <div className="text-xs text-blue-500">自由输入、文件导入或 AI 引导</div>
              </div>
            </Link>
            <Link
              href="/generate"
              className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
            >
              <span className="text-xl">✨</span>
              <div>
                <div className="text-sm font-medium text-green-700">生成新简历</div>
                <div className="text-xs text-green-500">粘贴 JD，AI 自动匹配经历</div>
              </div>
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <span className="text-xl">👤</span>
              <div>
                <div className="text-sm font-medium text-purple-700">完善个人信息</div>
                <div className="text-xs text-purple-500">姓名、联系方式会出现在简历中</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Experience breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">经历库构成</h2>
          {expCount === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">还没有任何经历</p>
              <Link href="/experiences/new" className="text-xs text-blue-500 hover:underline mt-1 block">
                立即添加
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(typeMap).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-20">
                    {EXPERIENCE_TYPE_LABELS[type as keyof typeof EXPERIENCE_TYPE_LABELS] || type}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / expCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Resumes */}
      {recentResumes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近生成的简历</h2>
            <Link href="/resumes" className="text-sm text-blue-500 hover:underline">
              查看全部
            </Link>
          </div>
          <div className="space-y-2">
            {recentResumes.map((r) => (
              <Link
                key={r.id}
                href={`/resumes/${r.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-400">
                      模板：{r.template} · {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
