"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXPERIENCE_TYPE_LABELS, type ExperienceData, type ExperienceType } from "@/types";
import { parseTags } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  work: "bg-blue-100 text-blue-700",
  education: "bg-purple-100 text-purple-700",
  project: "bg-green-100 text-green-700",
  skill: "bg-yellow-100 text-yellow-700",
  award: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

export default function ExperienceList({ experiences }: { experiences: ExperienceData[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const types = Array.from(new Set(experiences.map((e) => e.type)));
  const filtered = filter === "all" ? experiences : experiences.filter((e) => e.type === filter);

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除这条经历？")) return;
    setDeleting(id);
    await fetch(`/api/experiences/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-gray-900 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          全部 ({experiences.length})
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === t
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {EXPERIENCE_TYPE_LABELS[t as ExperienceType] || t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((exp) => {
          const tags = parseTags(exp.tags);
          return (
          <div
            key={exp.id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      TYPE_COLORS[exp.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {EXPERIENCE_TYPE_LABELS[exp.type as ExperienceType] || exp.type}
                  </span>
                  {exp.startDate && (
                    <span className="text-xs text-gray-400">
                      {exp.startDate}
                      {exp.endDate ? ` - ${exp.endDate}` : ""}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                {exp.organization && (
                  <p className="text-sm text-gray-500 mt-0.5">{exp.organization}</p>
                )}
                {exp.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/experiences/${exp.id}/edit`}
                  className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  编辑
                </Link>
                <button
                  onClick={() => handleDelete(exp.id)}
                  disabled={deleting === exp.id}
                  className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting === exp.id ? "删除中..." : "删除"}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
