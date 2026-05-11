"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AiGuideChat from "@/components/experience/AiGuideChat";

type Mode = "freetext" | "import" | "ai-guide";

export default function NewExperiencePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("freetext");

  // Free text mode
  const [rawInput, setRawInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState("");

  // Import mode
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [importError, setImportError] = useState("");

  const handleParseText = async () => {
    if (!rawInput.trim()) return;
    setParsing(true);
    setParseError("");
    setParsed(null);
    const res = await fetch("/api/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput }),
    });
    const data = await res.json();
    setParsing(false);
    if (!res.ok) {
      setParseError(data.error || "解析失败");
      return;
    }
    setParsed({ count: data.count, items: data.parsed || [] });
    router.refresh();
  };

  const handleSaveParsed = () => {
    router.push("/experiences");
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setImportError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/experiences/import", { method: "POST", body: formData });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setImportError(data.error || "导入失败");
      return;
    }
    setImportResult({ count: data.count });
    setFile(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">添加经历</h1>
      <p className="text-gray-500 mb-8">选择一种方式添加到你的经历库</p>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { id: "freetext" as Mode, label: "自由文本", desc: "随便写，AI 来整理", icon: "✍️" },
          { id: "import" as Mode, label: "文件导入", desc: "上传 PDF / Word", icon: "📁" },
          { id: "ai-guide" as Mode, label: "AI 引导", desc: "问答式补全经历", icon: "🤖" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              mode === m.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="font-medium text-gray-900 text-sm">{m.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Free text mode */}
      {mode === "freetext" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">随便写，AI 来整理</h2>
          <p className="text-sm text-gray-500 mb-4">
            用自然语言描述你的经历，不用考虑格式，AI 会自动解析成结构化的条目。
          </p>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={`示例：
我在字节跳动做了两年后端工程师，主要负责推荐系统的开发，用 Go 语言开发了核心的召回模块，把 CTR 提升了 15%，服务的日活用户超过 5000 万。之前也做过算法方向，用 Python 训练了个性化推荐模型。`}
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {parseError && (
            <div className="mt-3 text-sm text-red-500 bg-red-50 rounded-lg p-3">{parseError}</div>
          )}
          {parsed && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-700 mb-1">
                ✓ AI 解析成功，已保存 {(parsed as { count: number; items: Array<{ title: string }> }).count} 条记录
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(parsed as { count: number; items: Array<{ title: string }> }).items.map((item, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleParseText}
              disabled={parsing || !rawInput.trim()}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {parsing ? "AI 解析中..." : "AI 解析并保存"}
            </button>
            {parsed && (
              <button
                onClick={handleSaveParsed}
                className="px-6 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                查看经历库
              </button>
            )}
          </div>
        </div>
      )}

      {/* Import mode */}
      {mode === "import" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">上传已有简历</h2>
          <p className="text-sm text-gray-500 mb-4">
            支持 PDF、Word (.docx) 格式。AI 会自动识别并拆分为多条经历条目。
          </p>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => document.getElementById("file-input")?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="text-4xl mb-3">📄</div>
            {file ? (
              <div>
                <div className="font-medium text-gray-900 text-sm">{file.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm text-gray-600">点击选择文件或拖拽到此处</div>
                <div className="text-xs text-gray-400 mt-1">支持 PDF、Word、TXT</div>
              </div>
            )}
          </div>

          {importError && (
            <div className="mt-3 text-sm text-red-500 bg-red-50 rounded-lg p-3">{importError}</div>
          )}
          {importResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm font-medium text-green-700">
                ✓ 成功导入 {importResult.count} 条经历
              </div>
              <button
                onClick={() => router.push("/experiences")}
                className="text-xs text-green-600 hover:underline mt-1 block"
              >
                查看经历库 →
              </button>
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={importing || !file}
            className="w-full mt-4 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importing ? "AI 解析中，请稍候..." : "开始导入"}
          </button>
        </div>
      )}

      {/* AI Guide mode */}
      {mode === "ai-guide" && <AiGuideChat />}
    </div>
  );
}
