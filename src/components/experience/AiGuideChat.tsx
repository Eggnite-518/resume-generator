"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceData } from "@/types";
import { EXPERIENCE_TYPE_LABELS } from "@/types";

interface Message {
  role: "assistant" | "user";
  content: string;
}

export default function AiGuideChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [savedExp, setSavedExp] = useState<ExperienceData | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startChat = async () => {
    setStarted(true);
    setLoading(true);
    const res = await fetch("/api/experiences/ai-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });
    const data = await res.json();
    setMessages([{ role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  const sendMessage = async (finalize = false) => {
    if (!input.trim() && !finalize) return;
    const userMsg = finalize ? "（用户请求生成）" : input;
    const newMessages: Message[] = finalize
      ? messages
      : [...messages, { role: "user", content: userMsg }];

    if (!finalize) {
      setMessages(newMessages);
      setInput("");
    }
    setLoading(true);

    const res = await fetch("/api/experiences/ai-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, finalize }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.complete && data.experience) {
      setComplete(true);
      setSavedExp(data.experience as ExperienceData);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } else {
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    }
  };

  if (!started) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4">🤖</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">AI 引导式补充经历</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
          AI 会通过几轮问答，引导你把一段经历描述得更加完整，自动提炼量化成果，最后生成一条高质量的经历条目。
        </p>
        <button
          onClick={startChat}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          开始对话
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col" style={{ height: "520px" }}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-medium text-gray-900 text-sm">AI 简历助手</span>
          <span className="text-xs text-gray-400 ml-auto">
            {complete ? "✓ 已完成" : `${messages.filter((m) => m.role === "user").length} 轮对话`}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Saved experience preview */}
      {complete && savedExp && (
        <div className="mx-4 mb-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="text-sm font-medium text-green-700 mb-2">✓ 已保存到经历库</div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">{savedExp.title}</span>
            {savedExp.organization && ` @ ${savedExp.organization}`}
            <span className="ml-2 text-xs text-gray-400">
              {EXPERIENCE_TYPE_LABELS[savedExp.type] || savedExp.type}
            </span>
          </div>
          {savedExp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {savedExp.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => router.push("/experiences")}
              className="text-xs text-green-700 hover:underline"
            >
              查看经历库 →
            </button>
            <button
              onClick={() => {
                setComplete(false);
                setSavedExp(null);
                setMessages([]);
                setStarted(false);
              }}
              className="text-xs text-gray-500 hover:underline ml-2"
            >
              再添加一条
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      {!complete && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="输入回复，按 Enter 发送..."
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              发送
            </button>
            {messages.length >= 4 && (
              <button
                onClick={() => sendMessage(true)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                生成经历
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
