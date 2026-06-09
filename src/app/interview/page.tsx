"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ResumeContent } from "@/types";

const JOB_ROLE_PRESETS = [
  "产品经理", "前端开发工程师", "后端开发工程师", "数据分析师",
  "UI/UX 设计师", "算法工程师", "运营经理", "市场营销",
  "HR / 招聘", "销售", "数据工程师", "测试工程师",
];

interface SessionItem {
  id: string;
  jobRole: string;
  phase: string;
  questionsCount: number;
  totalScore: number | null;
  recommendation: string | null;
  createdAt: string;
}

interface ResumeListItem {
  id: string;
  title: string;
  jdPreview: string;
  createdAt: string;
}

function resumeContentToText(content: ResumeContent): string {
  const lines: string[] = [];
  const p = content.personalInfo;
  if (p.name) lines.push(p.name);
  const contacts = [p.email, p.phone, p.location].filter(Boolean).join(" | ");
  if (contacts) lines.push(contacts);
  if (p.summary) { lines.push(""); lines.push(p.summary); }
  for (const section of content.sections ?? []) {
    lines.push(""); lines.push(section.title);
    for (const item of section.items ?? []) {
      const parts = [item.title, item.subtitle].filter(Boolean);
      lines.push(parts.join(" | "));
      if (item.dateRange) lines.push(item.dateRange);
      for (const b of item.bullets ?? []) lines.push(`• ${b}`);
    }
  }
  return lines.join("\n");
}

type ResumeTab = "paste" | "upload" | "existing";

export default function InterviewPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [jobRole, setJobRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeTab, setResumeTab] = useState<ResumeTab>("paste");
  const [fileName, setFileName] = useState("");

  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [loadingResumeDetail, setLoadingResumeDetail] = useState(false);

  const [starting, setStarting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const finalRole = jobRole === "__custom__" ? customRole : jobRole;

  useEffect(() => {
    fetch("/api/interview/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (resumeTab !== "existing" || resumes.length > 0) return;
    setLoadingResumes(true);
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => setResumes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingResumes(false));
  }, [resumeTab, resumes.length]);

  const handleFileUpload = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/interview/parse-resume", { method: "POST", body: fd });
    const data = await res.json();
    setParsing(false);
    if (!res.ok) { setError(data.error || "解析失败"); return; }
    setResumeText(data.text);
  };

  const handleSelectResume = async (id: string) => {
    setSelectedResumeId(id);
    setLoadingResumeDetail(true);
    const res = await fetch(`/api/resume/${id}`);
    const data = await res.json();
    setLoadingResumeDetail(false);
    if (!res.ok) { setError("简历加载失败"); return; }
    setResumeText(resumeContentToText(data.content as ResumeContent));
  };

  const handleStart = async () => {
    if (!finalRole.trim()) { setError("请选择或输入目标岗位"); return; }
    setStarting(true);
    setError("");
    const res = await fetch("/api/interview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobRole: finalRole,
        resumeText: resumeText || undefined,
        jdText: jdText || undefined,
      }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) { setError(data.error || "启动失败"); return; }
    router.push(`/interview/${data.sessionId}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await fetch(`/api/interview/sessions?id=${id}`, { method: "DELETE" });
    setSessions((p) => p.filter((s) => s.id !== id));
  };

  const tabs: { id: ResumeTab; label: string }[] = [
    { id: "paste", label: "粘贴文本" },
    { id: "upload", label: "上传文件" },
    { id: "existing", label: "已有简历" },
  ];

  const PHASE_LABEL: Record<string, string> = { hr: "准备中", tech: "进行中", complete: "已完成" };
  const PHASE_ICON: Record<string, string> = { hr: "⏳", tech: "💬", complete: "✅" };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI 模拟面试官</h1>
        <p className="text-gray-500 mt-1">
          支持任意岗位 · 自适应难度 · 即时反馈 · 最终评估报告
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* ── 左：开始新面试 ── */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="font-semibold text-gray-900">开始新的模拟面试</h2>
            </div>

            {/* 岗位 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                目标岗位 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {JOB_ROLE_PRESETS.map((role) => (
                  <button key={role} onClick={() => { setJobRole(role); setCustomRole(""); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      jobRole === role
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    }`}>
                    {role}
                  </button>
                ))}
                <button onClick={() => setJobRole("__custom__")}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    jobRole === "__custom__"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                  }`}>
                  自定义 ✏️
                </button>
              </div>
              {jobRole === "__custom__" && (
                <input type="text" value={customRole} onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="输入任意岗位，如：增长黑客、DevOps 工程师..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>

            {/* JD（可选） */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                岗位 JD
                <span className="text-xs text-gray-400 font-normal ml-1">（可选，提供后面试更有针对性）</span>
              </label>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                placeholder="粘贴岗位描述..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* 简历（可选） */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                简历
                <span className="text-xs text-gray-400 font-normal ml-1">（可选，提供后 AI 会针对简历提问）</span>
              </label>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden mb-3">
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setResumeTab(t.id)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      resumeTab === t.id ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {resumeTab === "paste" && (
                <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)}
                  placeholder="粘贴简历全文..." rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              )}

              {resumeTab === "upload" && (
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                  {parsing ? (
                    <div><div className="text-xl animate-pulse mb-1">📄</div><p className="text-sm text-blue-600">解析中...</p></div>
                  ) : resumeText ? (
                    <div><div className="text-xl mb-1">✅</div><p className="text-sm font-medium text-green-700">{fileName}</p><p className="text-xs text-gray-400 mt-1">点击重新上传</p></div>
                  ) : (
                    <div><div className="text-2xl text-gray-300 mb-1">📎</div><p className="text-sm text-gray-500">点击上传 PDF / DOCX / TXT</p></div>
                  )}
                </div>
              )}

              {resumeTab === "existing" && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {loadingResumes ? (
                    [1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)
                  ) : resumes.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">还没有生成过简历</div>
                  ) : resumes.map((r) => (
                    <button key={r.id} onClick={() => handleSelectResume(r.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
                        selectedResumeId === r.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                      }`}>
                      <span className="text-base">{loadingResumeDetail && selectedResumeId === r.id ? "⏳" : selectedResumeId === r.id ? "✅" : "📄"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400 truncate">{r.jdPreview}</p>
                      </div>
                    </button>
                  ))}
                  {resumeText && resumeTab === "existing" && (
                    <p className="text-xs text-green-600">✓ 已提取 {resumeText.length} 字</p>
                  )}
                </div>
              )}
            </div>

            {/* 提示 */}
            <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">面试中可使用以下指令：</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-blue-600">
                <span>跳过 — 跳过当题</span>
                <span>提示 — 获得提示</span>
                <span>加难 — 提高难度</span>
                <span>详解 — 查看参考答案</span>
                <span>结束面试 — 生成报告</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <button onClick={handleStart}
              disabled={starting || parsing || loadingResumeDetail || !finalRole.trim()}
              className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {starting ? "AI 面试官正在准备中..." : "🎯 开始面试"}
            </button>
          </div>
        </div>

        {/* ── 右：历史记录 ── */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">历史面试记录</h2>
            {loadingSessions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-sm">还没有面试记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id}
                    className="group flex items-start gap-2.5 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/interview/${s.id}`)}>
                    <span className="text-base shrink-0 mt-0.5">{PHASE_ICON[s.phase] ?? "💬"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{s.jobRole}</span>
                        {s.totalScore !== null && (
                          <span className="text-xs text-indigo-600 font-medium shrink-0">{s.totalScore}分</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <span>{PHASE_LABEL[s.phase] ?? s.phase}</span>
                        <span>·</span>
                        <span>{new Date(s.createdAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs shrink-0 transition-opacity">
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
