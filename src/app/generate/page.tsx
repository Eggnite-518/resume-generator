"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CoreCompetency, ExpOptimized, AnalysisResult } from "@/app/api/resume/analyze/route";

const TEMPLATES = [
  { id: "classic", label: "经典", desc: "单栏黑白，传统风格" },
  { id: "modern", label: "现代", desc: "左侧深色栏 + 右侧主内容" },
  { id: "compact", label: "紧凑", desc: "高密度，适合内容多" },
];

type Step = "jd" | "analyze" | "generate";
type AnalyzePhase = "idle" | "decomposing" | "matching" | "done";
type OcrPhase = "idle" | "scanning" | "cleaning" | "done";

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded ${className}`} />
  );
}

// ── Coverage badge ────────────────────────────────────────────────────────────
function CoverageBadge({ coverage, loading }: { coverage: CoreCompetency["coverage"]; loading?: boolean }) {
  if (loading)
    return <span className="inline-flex items-center text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">匹配中...</span>;
  if (coverage === "covered")
    return <span className="inline-flex items-center text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5">已覆盖</span>;
  if (coverage === "partial")
    return <span className="inline-flex items-center text-xs font-semibold text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-full px-2.5 py-0.5">部分覆盖</span>;
  return <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2.5 py-0.5">未覆盖</span>;
}

function coverageIcon(c: CoreCompetency["coverage"], loading?: boolean) {
  if (loading) return "⏳";
  if (c === "covered") return "✅";
  if (c === "partial") return "⚠️";
  return "❌";
}

// ── Competency Card ───────────────────────────────────────────────────────────
function CompetencyCard({
  competency,
  loading,
  expMap,
  jdText,
  onSupplementDone,
}: {
  competency: CoreCompetency;
  loading?: boolean;
  expMap: Record<string, { title: string; organization?: string }>;
  jdText: string;
  onSupplementDone: (expId: string, desc: string) => void;
}) {
  const [expanded, setExpanded] = useState(!loading && competency.coverage !== "covered");
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }>>(
    competency.guideQuestions.map((q) => ({ question: q, answer: "" }))
  );
  const [supplementing, setSupplementing] = useState(false);
  const [supplementDone, setSupplementDone] = useState(false);

  // Sync answers when guide questions arrive after matching
  useEffect(() => {
    setAnswers(competency.guideQuestions.map((q) => ({ question: q, answer: "" })));
    if (!loading && competency.coverage !== "covered") setExpanded(true);
  }, [competency.guideQuestions, competency.coverage, loading]);

  const handleSupplement = async () => {
    const filled = answers.filter((a) => a.answer.trim());
    if (filled.length === 0 || !competency.matchedExpIds[0]) return;
    setSupplementing(true);
    const res = await fetch(`/api/experiences/${competency.matchedExpIds[0]}/supplement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jdText,
        answers: filled,
        competencyName: competency.name,
        competencyRequirement: competency.requirement,
      }),
    });
    const data = await res.json();
    setSupplementing(false);
    if (res.ok) {
      onSupplementDone(competency.matchedExpIds[0], data.optimizedDescription);
      setSupplementDone(true);
    }
  };

  const borderColor = loading
    ? "border-gray-200 bg-gray-50/50"
    : competency.coverage === "covered"
    ? "border-green-200 bg-green-50/30"
    : competency.coverage === "partial"
    ? "border-yellow-200 bg-yellow-50/30"
    : "border-red-200 bg-red-50/30";

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${borderColor}`}>
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/60 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="text-base mt-0.5 shrink-0">{coverageIcon(competency.coverage, loading)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{competency.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${competency.level === "必须" ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
              {competency.level}
            </span>
            <CoverageBadge coverage={competency.coverage} loading={loading} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{competency.requirement}</p>
          {!loading && competency.matchedExpIds.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              来自：{competency.matchedExpIds.map((id) => expMap[id]?.title || id).join("、")}
            </p>
          )}
          {loading && <Shimmer className="h-3 w-40 mt-1.5" />}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-white/80 bg-white/70 px-4 py-3 space-y-3">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">JD 原文要求</span>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{competency.requirement}</p>
          </div>

          {/* Match reason */}
          {!loading && competency.matchReason && (
            <div className={`rounded-lg px-3 py-2.5 ${
              competency.coverage === "covered"
                ? "bg-green-50 border border-green-100"
                : competency.coverage === "partial"
                ? "bg-yellow-50 border border-yellow-100"
                : "bg-red-50 border border-red-100"
            }`}>
              <span className="text-xs font-semibold text-gray-600 block mb-1">匹配依据</span>
              <p className="text-xs text-gray-700 leading-relaxed">{competency.matchReason}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-3/4" />
            </div>
          )}

          {!loading && !supplementDone && answers.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-blue-700">
                {competency.coverage === "missing"
                  ? "经历库暂无此能力记录，补充后 AI 将优化相关经历描述"
                  : "回答以下问题，AI 将进一步优化匹配此能力的经历描述"}
              </p>
              {answers.map((item, i) => (
                <div key={i}>
                  <label className="text-xs text-gray-700 font-medium block mb-1">{item.question}</label>
                  <input
                    type="text"
                    value={item.answer}
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = { ...next[i], answer: e.target.value };
                      setAnswers(next);
                    }}
                    placeholder="请输入..."
                    className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              ))}
              <button
                onClick={handleSupplement}
                disabled={supplementing || answers.every((a) => !a.answer.trim())}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {supplementing ? "AI 优化中..." : "提交补充，优化描述"}
              </button>
            </div>
          )}

          {supplementDone && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <span>✓</span><span>已根据补充信息重新优化对应经历描述</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Exp Optimized Card ────────────────────────────────────────────────────────
function ExpOptimizedCard({
  opt,
  expInfo,
  competencies,
  onDescChange,
}: {
  opt: ExpOptimized & { currentDesc: string };
  expInfo?: { title: string; organization?: string };
  competencies: CoreCompetency[];
  onDescChange: (desc: string) => void;
}) {
  const coveredNames = opt.coveredCompetencyIds
    .map((cid) => competencies.find((c) => c.id === cid)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{expInfo?.title || opt.expId}</span>
          {expInfo?.organization && <span className="text-xs text-gray-400">@ {expInfo.organization}</span>}
        </div>
        {coveredNames.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {coveredNames.map((n) => (
              <span key={n} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2 py-0.5">{n}</span>
            ))}
          </div>
        )}
      </div>
      <textarea
        value={opt.currentDesc}
        onChange={(e) => onDescChange(e.target.value)}
        rows={6}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
      <p className="text-xs text-gray-400">可直接编辑，生成简历时将使用此版本</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("jd");
  const [jdText, setJdText] = useState("");
  const [template, setTemplate] = useState("classic");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);

  // OCR state
  const [ocrPhase, setOcrPhase] = useState<OcrPhase>("idle");
  const [ocrPct, setOcrPct] = useState(0);

  // Analysis state
  const [analyzePhase, setAnalyzePhase] = useState<AnalyzePhase>("idle");
  const [analyzePct, setAnalyzePct] = useState(0);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [partialComps, setPartialComps] = useState<CoreCompetency[]>([]); // from decompose
  const [expMap, setExpMap] = useState<Record<string, { title: string; organization?: string }>>({});
  const [optimizedDescs, setOptimizedDescs] = useState<Record<string, string>>({});

  const [generating, setGenerating] = useState(false);

  // ── Image upload: two-stage OCR → clean ──
  const handleImageUpload = async (file: File) => {
    setError("");
    setOcrPhase("scanning");
    setOcrPct(10);

    const formData = new FormData();
    formData.append("image", file);

    // Stage 1: OCR
    const ocrRes = await fetch("/api/jd/ocr", { method: "POST", body: formData });
    const ocrData = await ocrRes.json();

    if (!ocrRes.ok) {
      setOcrPhase("idle");
      setOcrPct(0);
      setError(ocrData.error || "图片识别失败");
      return;
    }

    // Show raw text immediately
    setJdText(ocrData.rawText);
    setOcrPct(55);
    setOcrPhase("cleaning");

    // Stage 2: Clean
    const cleanRes = await fetch("/api/jd/clean", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: ocrData.rawText }),
    });
    const cleanData = await cleanRes.json();

    setOcrPct(100);
    setOcrPhase("done");

    if (cleanRes.ok && cleanData.text) {
      setJdText(cleanData.text);
    }

    // Reset after a moment
    setTimeout(() => { setOcrPhase("idle"); setOcrPct(0); }, 1500);
  };

  // ── Analysis: decompose → match ──
  const handleAnalyze = async () => {
    if (!jdText.trim()) { setError("请先输入岗位 JD"); return; }
    setError("");
    setAnalyzePhase("decomposing");
    setAnalyzePct(5);
    setPartialComps([]);
    setAnalysis(null);

    // Fetch experience list in parallel with decompose
    const [expRes, decomposeRes] = await Promise.all([
      fetch("/api/experiences"),
      fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, stage: "decompose" }),
      }),
    ]);

    const exps: Array<{ id: string; title: string; organization?: string }> = await expRes.json();
    const decomposeData = await decomposeRes.json();

    if (!decomposeRes.ok) {
      setAnalyzePhase("idle");
      setError(decomposeData.error || "分析失败，请重试");
      return;
    }

    const map = Object.fromEntries(exps.map((e) => [e.id, { title: e.title, organization: e.organization }]));
    setExpMap(map);
    setPartialComps(decomposeData.competencies || []);
    setAnalyzePct(40);
    setAnalyzePhase("matching");
    setStep("analyze"); // show skeleton immediately

    // Stage 2: match
    const matchRes = await fetch("/api/resume/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdText, stage: "match", competencies: decomposeData.competencies }),
    });
    const matchData: AnalysisResult & { error?: string } = await matchRes.json();

    setAnalyzePct(100);
    setAnalyzePhase("done");

    if (!matchRes.ok) {
      setError(matchData.error || "匹配分析失败，请重试");
      return;
    }

    // Init optimized descs
    const descMap: Record<string, string> = {};
    for (const opt of matchData.expOptimized || []) {
      descMap[opt.expId] = opt.optimizedDescription;
    }
    setOptimizedDescs(descMap);
    setAnalysis(matchData);
    setPartialComps([]);

    setTimeout(() => { setAnalyzePhase("idle"); setAnalyzePct(0); }, 800);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    const res = await fetch("/api/resume/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdText, template, title: title || undefined, optimizedDescs }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) { setError(data.error || "生成失败，请重试"); return; }
    router.push(`/resumes/${data.id}`);
  };

  // Derived
  const isAnalyzing = analyzePhase === "decomposing" || analyzePhase === "matching";
  const displayComps = analysis?.competencies ?? partialComps;
  const matchingInProgress = analyzePhase === "matching";
  const coveredCount = analysis?.competencies.filter((c) => c.coverage === "covered").length ?? 0;
  const totalCount = analysis?.competencies.length ?? 0;
  const missingRequired = analysis?.competencies.filter((c) => c.coverage === "missing" && c.level === "必须") ?? [];

  const enrichedOpts = (analysis?.expOptimized ?? []).map((opt) => ({
    ...opt,
    currentDesc: optimizedDescs[opt.expId] ?? opt.optimizedDescription,
  }));

  const ocrStatusText: Record<OcrPhase, string> = {
    idle: "",
    scanning: "图片文字识别中（约 15 秒）...",
    cleaning: "提炼 JD 关键内容中...",
    done: "识别完成 ✓",
  };

  const analyzeStatusText: Record<AnalyzePhase, string> = {
    idle: "",
    decomposing: "拆解岗位核心能力维度中（约 5 秒）...",
    matching: "匹配经历库，生成优化描述中（约 30 秒）...",
    done: "",
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["jd", "analyze", "generate"] as Step[]).map((s, i) => {
          const labels = ["输入 JD", "能力匹配分析", "生成简历"];
          const active = step === s;
          const done = (s === "jd" && (step === "analyze" || step === "generate")) || (s === "analyze" && step === "generate");
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 text-sm font-medium ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-green-100 text-green-700" : active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                  {done ? "✓" : i + 1}
                </span>
                {labels[i]}
              </div>
              {i < 2 && <span className="text-gray-300 text-sm">→</span>}
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
        {/* ── Step 1: JD Input ── */}
        <div className={`bg-white rounded-xl border border-gray-200 p-6 ${step !== "jd" && !isAnalyzing ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">① 岗位 JD</h2>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${ocrPhase !== "idle" ? "text-gray-400 pointer-events-none" : "text-blue-600 hover:text-blue-800"}`}>
              <input
                ref={imageRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
              />
              <span>📷</span>
              <span>{ocrPhase === "idle" ? "上传截图识别" : ocrStatusText[ocrPhase]}</span>
            </label>
          </div>

          {/* OCR progress bar */}
          {ocrPhase !== "idle" && (
            <div className="mb-3 space-y-1.5">
              <ProgressBar pct={ocrPct} />
              <p className={`text-xs font-medium ${ocrPhase === "done" ? "text-green-600" : "text-blue-600"}`}>
                {ocrStatusText[ocrPhase]}
              </p>
            </div>
          )}

          <textarea
            value={jdText}
            onChange={(e) => { setJdText(e.target.value); if (step !== "jd") { setStep("jd"); setAnalysis(null); setPartialComps([]); } }}
            placeholder={`粘贴岗位描述，例如：\n\n职位：产品经理\n公司：XX 科技\n要求：\n• 3年以上产品经验\n• 有 ToB 产品落地经验\n• 熟悉数据分析方法`}
            rows={10}
            className={`w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-opacity ${ocrPhase === "cleaning" ? "opacity-60" : ""}`}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{jdText.length} 字</span>
            {jdText && <button onClick={() => setJdText("")} className="text-xs text-gray-400 hover:text-gray-600">清空</button>}
          </div>
        </div>

        {/* Analyze button (only shown on JD step) */}
        {step === "jd" && (
          <>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jdText.trim()}
              className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-base font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? "分析中..." : "🔍 分析经历与JD的匹配度"}
            </button>
          </>
        )}

        {/* ── Step 2: Analysis ── */}
        {step === "analyze" && (
          <div className="space-y-5">
            {/* Analyze progress bar */}
            {isAnalyzing && (
              <div className="bg-white rounded-xl border border-indigo-100 p-4 space-y-2">
                <ProgressBar pct={analyzePct} />
                <p className="text-xs font-medium text-indigo-600">{analyzeStatusText[analyzePhase]}</p>
              </div>
            )}

            {/* Summary banner (shown once match is done) */}
            {analysis && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-indigo-900">JD 能力维度分析完成</p>
                    <p className="text-xs text-indigo-600 mt-0.5">已覆盖 {coveredCount}/{totalCount} 个核心能力</p>
                  </div>
                  <div className="text-right">
                <div className="text-3xl font-bold text-indigo-700">{analysis.overallScore}</div>
                <div className="text-xs text-indigo-500">匹配度（必须项双倍权重）</div>
                  </div>
                </div>
                {missingRequired.length > 0 && (
                  <div className="mt-2 bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-red-600 mb-1">必须项中尚未覆盖：</p>
                    <p className="text-xs text-red-500">{missingRequired.map((c) => c.name).join("、")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Competency list (skeleton while matching) */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">② JD 核心能力维度</h2>
              <p className="text-xs text-gray-500 mb-3">
                {matchingInProgress
                  ? "已识别能力维度，正在匹配经历库..."
                  : "点击展开查看匹配详情。部分覆盖/未覆盖项可回答 AI 问题进一步优化。"}
              </p>
              <div className="space-y-2">
                {displayComps.map((comp) => (
                  <CompetencyCard
                    key={comp.id}
                    competency={comp}
                    loading={matchingInProgress}
                    expMap={expMap}
                    jdText={jdText}
                    onSupplementDone={(expId, desc) =>
                      setOptimizedDescs((prev) => ({ ...prev, [expId]: desc }))
                    }
                  />
                ))}
              </div>
            </div>

            {/* Optimized descriptions (only after match done) */}
            {analysis && enrichedOpts.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">经历优化描述</h2>
                <p className="text-xs text-gray-500 mb-3">AI 已根据 JD 关键词重写以下经历描述，可直接编辑，生成简历时使用此版本。</p>
                <div className="space-y-3">
                  {enrichedOpts.map((opt) => (
                    <ExpOptimizedCard
                      key={opt.expId}
                      opt={opt}
                      expInfo={expMap[opt.expId]}
                      competencies={analysis.competencies}
                      onDescChange={(desc) => setOptimizedDescs((prev) => ({ ...prev, [opt.expId]: desc }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isAnalyzing && (
              <button onClick={() => { setStep("jd"); setAnalysis(null); setPartialComps([]); }} className="text-sm text-gray-500 hover:text-gray-700">
                ← 重新输入 JD
              </button>
            )}
          </div>
        )}

        {/* ── Step 3: Template & Generate ── */}
        {(step === "analyze" || step === "generate") && !isAnalyzing && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">③ 简历模板</h2>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${template === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">
                简历名称<span className="text-xs text-gray-400 font-normal ml-1">（可选）</span>
              </h2>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：字节跳动-产品经理"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-base font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generating ? "AI 正在生成简历..." : "✨ 生成简历"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
