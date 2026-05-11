"use client";

import { useState, useCallback, useEffect, useRef as useRefLocal } from "react";
import { useRouter } from "next/navigation";
import type { ResumeContent, ResumeData, ResumeSection, ResumeSectionItem } from "@/types";
import ResumePreview from "./ResumePreview";

interface Props {
  initialData: ResumeData;
}

export default function ResumeEditor({ initialData }: Props) {
  const router = useRouter();
  /** Split a single bullet string on literal \n or real newlines into multiple bullets */
  const splitBullets = (raw: string[]): string[] =>
    raw.flatMap((b) =>
      b
        .split(/\\n|\n/)
        .map((s) => s.replace(/^[•·\-\*]\s*/, "").trim())
        .filter(Boolean)
    );

  const normalizeContent = (raw: ResumeContent): ResumeContent => ({
    personalInfo: raw.personalInfo || { name: "" },
    sections: (Array.isArray(raw.sections) ? raw.sections : []).map((s) => ({
      ...s,
      items: (Array.isArray(s.items) ? s.items : []).map((item) => ({
        ...item,
        bullets: splitBullets(Array.isArray(item.bullets) ? item.bullets : []),
      })),
    })),
  });

  const [content, setContent] = useState<ResumeContent>(normalizeContent(initialData.content));
  const [title, setTitle] = useState(initialData.title);
  const [template, setTemplate] = useState(initialData.template);
  const [saving, setSaving] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const handleSave = async () => {
    setSaving(true);
    // Strip photo before saving – it's managed by the Profile page and injected at load time
    const { photo: _photo, ...personalInfoWithoutPhoto } = content.personalInfo;
    const contentToSave = { ...content, personalInfo: personalInfoWithoutPhoto };
    await fetch(`/api/resume/${initialData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: contentToSave, template }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePrint = async () => {
    await handleSave();
    setTab("preview");
    setTimeout(() => window.print(), 300);
  };

  const handleRefine = async () => {
    if (!aiInstruction.trim()) return;
    setRefining(true);
    const res = await fetch(`/api/resume/${initialData.id}/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: aiInstruction, content }),
    });
    const data = await res.json();
    setRefining(false);
    if (data.content) {
      setContent(normalizeContent(data.content));
      setAiInstruction("");
    }
  };

  const handleDelete = async () => {
    if (!confirm("确认删除这份简历？")) return;
    setDeleting(true);
    await fetch(`/api/resume/${initialData.id}`, { method: "DELETE" });
    router.push("/resumes");
    router.refresh();
  };

  // ── Content mutations ─────────────────────────────────────────────────────

  const updatePersonalInfo = (key: string, value: string) => {
    setContent((c) => ({
      ...c,
      personalInfo: { ...c.personalInfo, [key]: value },
    }));
  };

  const updateItem = useCallback(
    (sectionId: string, itemId: string, field: string, value: string | string[]) => {
      setContent((c) => ({
        ...c,
        sections: c.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                ),
              }
            : s
        ),
      }));
    },
    []
  );

  const updateBullet = useCallback(
    (sectionId: string, itemId: string, bulletIndex: number, value: string) => {
      setContent((c) => ({
        ...c,
        sections: c.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) => {
                  if (item.id !== itemId) return item;
                  const bullets = [...item.bullets];
                  bullets[bulletIndex] = value;
                  return { ...item, bullets };
                }),
              }
            : s
        ),
      }));
    },
    []
  );

  const addBullet = useCallback((sectionId: string, itemId: string) => {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((item) =>
                item.id === itemId
                  ? { ...item, bullets: [...item.bullets, ""] }
                  : item
              ),
            }
          : s
      ),
    }));
  }, []);

  const removeBullet = useCallback(
    (sectionId: string, itemId: string, bulletIndex: number) => {
      setContent((c) => ({
        ...c,
        sections: c.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) => {
                  if (item.id !== itemId) return item;
                  const bullets = item.bullets.filter((_, i) => i !== bulletIndex);
                  return { ...item, bullets };
                }),
              }
            : s
        ),
      }));
    },
    []
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push("/resumes")}
            className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
          >
            ← 返回
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors min-w-0 flex-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as "classic" | "modern" | "compact")}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="classic">经典</option>
            <option value="modern">现代</option>
            <option value="compact">紧凑</option>
          </select>
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAiPanel
                ? "bg-purple-600 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🤖 AI 微调
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {saved ? "✓ 已保存" : saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={handlePrint}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            打印 / 导出 PDF
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
          >
            删除
          </button>
        </div>
      </div>

      {/* ── Tab switch ── */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit no-print">
        <button
          onClick={() => setTab("edit")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "edit"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          编辑
        </button>
        <button
          onClick={() => setTab("preview")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "preview"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          预览
        </button>
      </div>

      {/* ── Preview Mode ── */}
      {tab === "preview" && (
        <div className="print-area overflow-x-auto pb-8">
          <ResumePreview content={content} template={template} />
        </div>
      )}

      {/* ── Edit Mode ── */}
      {tab === "edit" && (
        <div className="flex gap-6 no-print">
          {/* Main editor */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Personal info card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold mb-4 text-xs uppercase tracking-wide text-gray-500">
                个人信息
              </h2>

              {/* Photo preview (read-only, managed in 个人信息 page) */}
              {content.personalInfo.photo && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <img
                    src={content.personalInfo.photo}
                    alt="证件照"
                    className="w-[54px] h-[68px] object-cover rounded border border-gray-200"
                  />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    证件照已设置，将显示在简历右上角。<br />
                    如需更换请前往「个人信息」页面。
                  </p>
                </div>
              )}

              {/* Text fields grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "name", label: "姓名", full: true },
                  { key: "email", label: "邮箱" },
                  { key: "phone", label: "手机" },
                  { key: "location", label: "城市" },
                  { key: "linkedin", label: "LinkedIn" },
                  { key: "github", label: "GitHub" },
                ].map((f) => (
                  <div key={f.key} className={f.full ? "col-span-2" : ""}>
                    <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                    <input
                      type="text"
                      value={(content.personalInfo as Record<string, string>)[f.key] || ""}
                      onChange={(e) => updatePersonalInfo(f.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">个人简介</label>
                  <textarea
                    value={content.personalInfo.summary || ""}
                    onChange={(e) => updatePersonalInfo("summary", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Sections */}
            {content.sections.map((section) => (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3">
                  {section.title}
                </h2>
                <div className="space-y-6">
                  {section.items.map((item) => (
                    <SectionItemEditor
                      key={item.id}
                      section={section}
                      item={item}
                      onUpdateField={updateItem}
                      onUpdateBullet={updateBullet}
                      onAddBullet={addBullet}
                      onRemoveBullet={removeBullet}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* AI refinement panel */}
          {showAiPanel && (
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-8">
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <span>🤖</span> AI 微调
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  用自然语言告诉 AI 你想修改什么，它会帮你直接更新简历内容
                </p>
                <div className="space-y-2 mb-4">
                  {[
                    "把第一段工作经历写得更简洁",
                    "突出我的技术栈，减少流程性描述",
                    "把所有成果数字化，补充量化指标",
                    "让语言风格更加专业正式",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setAiInstruction(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="描述你想要的修改..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !aiInstruction.trim()}
                  className="w-full mt-3 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {refining ? "AI 修改中..." : "执行修改"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Auto-resize textarea ──────────────────────────────────────────────────────

function AutoResizeTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRefLocal<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={className}
      style={{ resize: "none", overflow: "hidden" }}
    />
  );
}

// ── Section item editor ───────────────────────────────────────────────────────

function SectionItemEditor({
  section,
  item,
  onUpdateField,
  onUpdateBullet,
  onAddBullet,
  onRemoveBullet,
}: {
  section: ResumeSection;
  item: ResumeSectionItem;
  onUpdateField: (sectionId: string, itemId: string, field: string, value: string) => void;
  onUpdateBullet: (sectionId: string, itemId: string, idx: number, value: string) => void;
  onAddBullet: (sectionId: string, itemId: string) => void;
  onRemoveBullet: (sectionId: string, itemId: string, idx: number) => void;
}) {
  // Skills sections don't need company or date fields
  const isSkill = section.type === "skill";

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Title — always shown */}
        <div className="col-span-2">
          <label className="text-xs text-gray-400 mb-1 block">
            {isSkill ? "技能维度" : "职位/项目名称"}
          </label>
          <input
            type="text"
            value={item.title}
            onChange={(e) => onUpdateField(section.id, item.id, "title", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Company + date — hidden for skills */}
        {!isSkill && (
          <>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">公司/机构</label>
              <input
                type="text"
                value={item.subtitle || ""}
                onChange={(e) => onUpdateField(section.id, item.id, "subtitle", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">时间段</label>
              <input
                type="text"
                value={item.dateRange || ""}
                onChange={(e) => onUpdateField(section.id, item.id, "dateRange", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </>
        )}
      </div>

      {/* Bullets */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">
          {isSkill ? "技能描述" : "工作内容/成就"}
        </label>
        <div className="space-y-2">
          {item.bullets.map((bullet, bi) => (
            <div key={bi} className="flex gap-2 items-start">
              <span className="text-gray-400 mt-2.5 text-xs shrink-0">•</span>
              <AutoResizeTextarea
                value={bullet}
                onChange={(e) => onUpdateBullet(section.id, item.id, bi, e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed"
              />
              <button
                onClick={() => onRemoveBullet(section.id, item.id, bi)}
                className="mt-2 text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddBullet(section.id, item.id)}
            className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            + 添加条目
          </button>
        </div>
      </div>
    </div>
  );
}
