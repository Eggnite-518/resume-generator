"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";

type ChatMessage = { role: "user" | "assistant"; content: string };

// ── 快捷指令按钮 ──────────────────────────────────────────────────────────────
const QUICK_CMDS = [
  { label: "跳过", cmd: "跳过", icon: "⏭️" },
  { label: "提示", cmd: "提示", icon: "💡" },
  { label: "加难", cmd: "加难", icon: "🔥" },
  { label: "简单点", cmd: "简单点", icon: "😌" },
  { label: "详解", cmd: "详解", icon: "📖" },
  { label: "结束面试", cmd: "结束面试", icon: "🏁" },
];

// ── 渲染 AI 消息内容（支持评分卡特殊格式） ────────────────────────────────────
function MessageContent({ content, isScorecard }: { content: string; isScorecard: boolean }) {
  if (isScorecard) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
        <pre className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {content}
        </pre>
      </div>
    );
  }

  // 渲染带有格式标记的 AI 消息（✅ ⚠️ 💡 📊 等）
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // 评分行 - 突出显示
        if (line.startsWith("📊")) {
          return (
            <div key={i} className="bg-white/80 rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-700 border border-indigo-100">
              {line}
            </div>
          );
        }
        // 亮点行
        if (line.startsWith("✅")) {
          return <p key={i} className="text-sm text-green-700 leading-relaxed">{line}</p>;
        }
        // 改进点
        if (line.startsWith("⚠️")) {
          return <p key={i} className="text-sm text-orange-700 leading-relaxed">{line}</p>;
        }
        // 参考要点
        if (line.startsWith("💡")) {
          return <p key={i} className="text-sm text-blue-700 leading-relaxed">{line}</p>;
        }
        // 空行
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm text-gray-800 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);

  const [jobRole, setJobRole] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<"tech" | "complete">("tech");
  const [scorecard, setScorecard] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 加载 session
  useEffect(() => {
    fetch(`/api/interview/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setJobRole(data.jobRole ?? "");
        setPhase(data.phase === "complete" ? "complete" : "tech");

        // 从 `questions` 字段恢复对话历史
        const history: ChatMessage[] = Array.isArray(data.questions)
          ? data.questions
          : [];
        setMessages(history);

        if (data.finalReport) {
          setScorecard(data.finalReport);
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoadingSession(false));
  }, [sessionId]);

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || loading) return;
    const userMsg = msg.trim();
    setInput("");

    // 乐观更新 UI
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userMessage: userMsg }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setMessages((prev) => prev.slice(0, -1)); // 回滚乐观更新
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

      if (data.isComplete) {
        setPhase("complete");
        if (data.scorecard) setScorecard(data.scorecard);
      }
    } catch {
      setError("网络错误，请重试");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // 判断某条 AI 消息是否包含评分卡
  const isScorecardMsg = (content: string) =>
    content.includes("[SCORECARD_START]") || content.includes("📋 面试评估报告");

  // 清理消息中的 SCORECARD 标记
  const cleanContent = (content: string) =>
    content.replace(/\[SCORECARD_START\]/g, "").replace(/\[SCORECARD_END\]/g, "").trim();

  if (loadingSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 animate-pulse">
        <div className="h-7 bg-gray-100 rounded w-1/3" />
        <div className="h-[520px] bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/interview" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">🎯 {jobRole}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {phase === "complete" ? "面试已完成 · 查看报告" : "面试进行中 · Enter 发送，Shift+Enter 换行"}
          </p>
        </div>
        {phase === "complete" && (
          <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">已完成</span>
        )}
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {/* 聊天窗口 */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
        style={{ height: "calc(100vh - 14rem)", minHeight: "500px" }}>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-sm">正在加载面试...</p>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end items-start gap-2">
                  <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    👤
                  </div>
                </div>
              );
            }

            const isCard = isScorecardMsg(msg.content);
            const displayContent = cleanContent(msg.content);

            return (
              <div key={i} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs shrink-0 mt-0.5">
                  🤖
                </div>
                <div className={`max-w-[88%] ${isCard ? "w-full" : "bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3"}`}>
                  <MessageContent content={displayContent} isScorecard={isCard} />
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs shrink-0">
                🤖
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 输入区域 */}
        {phase === "tech" && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            {/* 快捷指令 */}
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_CMDS.map((c) => (
                <button key={c.cmd} onClick={() => sendMessage(c.cmd)} disabled={loading}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors whitespace-nowrap">
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* 文字输入 */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的回答... (Enter 发送，Shift+Enter 换行)"
                rows={3}
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
              />
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0 self-end">
                发送
              </button>
            </div>
          </div>
        )}

        {/* 面试结束状态 */}
        {phase === "complete" && (
          <div className="border-t border-gray-100 px-5 py-4 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <span>✅</span>
                <span className="text-sm font-medium">面试已完成，报告已生成</span>
              </div>
              <Link href="/interview"
                className="text-sm text-blue-600 hover:underline">
                开始新面试 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
