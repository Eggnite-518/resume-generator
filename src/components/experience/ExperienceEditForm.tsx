"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPERIENCE_TYPE_LABELS, type ExperienceData, type ExperienceType } from "@/types";
import { parseTags } from "@/lib/utils";

const TYPES_WITHOUT_DATE = ["skill", "award"];
const TYPES_WITHOUT_ORG = ["skill"];

export default function ExperienceEditForm({ experience }: { experience: ExperienceData }) {
  const router = useRouter();

  const normalizedTags = parseTags(experience.tags);

  const [form, setForm] = useState({
    type: experience.type,
    title: experience.title,
    organization: experience.organization || "",
    projectName: experience.projectName || "",
    startDate: experience.startDate || "",
    endDate: experience.endDate || "",
    description: experience.description,
    tags: normalizedTags.join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splitResult, setSplitResult] = useState<{ count: number } | null>(null);
  const [splitError, setSplitError] = useState("");

  const hideDate = TYPES_WITHOUT_DATE.includes(form.type);
  const hideOrg = TYPES_WITHOUT_ORG.includes(form.type);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/experiences/${experience.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setSaving(false);
    router.push("/experiences");
    router.refresh();
  };

  const handleSplit = async () => {
    if (!form.description.trim()) return;
    setSplitting(true);
    setSplitError("");

    // Ask AI to split this entry into multiple experiences
    const res = await fetch("/api/experiences/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: experience.id,
        title: form.title,
        description: form.description,
        type: form.type,
      }),
    });
    const data = await res.json();
    setSplitting(false);
    if (!res.ok) {
      setSplitError(data.error || "拆分失败");
      return;
    }
    setSplitResult({ count: data.count });
  };

  return (
    <div className="space-y-5">
      {/* Split result banner */}
      {splitResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-sm font-medium text-green-700 mb-1">
            ✓ AI 已将此条经历拆分为 {splitResult.count} 条独立记录
          </div>
          <p className="text-xs text-green-600 mb-3">
            原记录已删除，新记录已保存到经历库。
          </p>
          <button
            onClick={() => router.push("/experiences")}
            className="text-sm text-green-700 font-medium hover:underline"
          >
            查看经历库 →
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">经历类型</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ExperienceType }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(EXPERIENCE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">标题 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="职位名称 / 项目名称 / 学位"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!hideOrg && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">机构/公司/学校</label>
            <input
              type="text"
              value={form.organization}
              onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
              placeholder="字节跳动 / 北京大学"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {form.type === "work" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              所属项目
              <span className="ml-1.5 text-gray-400 font-normal text-xs">（选填）</span>
            </label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => setForm((p) => ({ ...p, projectName: e.target.value }))}
              placeholder="如：Pandora-掌上工作日志系统"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {!hideDate && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">开始时间</label>
              <input
                type="text"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                placeholder="2021-03"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">结束时间</label>
              <input
                type="text"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                placeholder="2024-01 或 至今"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">详细描述</label>
            {form.description.length > 100 && (
              <button
                onClick={handleSplit}
                disabled={splitting || !!splitResult}
                className="text-xs px-3 py-1 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 disabled:opacity-50 transition-colors font-medium"
              >
                {splitting ? "AI 拆分中..." : "✨ AI 拆分为多条"}
              </button>
            )}
          </div>
          {splitError && (
            <div className="mb-2 text-xs text-red-500 bg-red-50 rounded-lg p-2">{splitError}</div>
          )}
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={10}
            placeholder="• 负责...
• 使用...技术，实现...
• 成果：提升了...%"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono leading-relaxed"
          />
          <p className="text-xs text-gray-400 mt-1">
            每条要点单独一行，以「•」开头。如混合了多类内容，点击「AI 拆分为多条」自动分拆
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !form.title || !!splitResult}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={() => router.push("/experiences")}
            className="px-6 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
