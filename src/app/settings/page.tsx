"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("qwen-max");
  const [visionModel, setVisionModel] = useState("qwen-vl-max");
  const [masked, setMasked] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setMasked(data.api_key_masked || "");
        setBaseUrl(data.base_url || "");
        setModel(data.model || "qwen-max");
        setVisionModel(data.vision_model || "qwen-vl-max");
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey || undefined,
        base_url: baseUrl,
        model,
        vision_model: visionModel,
      }),
    });
    setSaving(false);
    setSaved(true);
    if (apiKey) {
      setMasked(apiKey.slice(0, 8) + "..." + apiKey.slice(-4));
      setApiKey("");
    }
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">设置</h1>
      <p className="text-gray-500 mb-8">配置 AI 服务，API Key 存储在本地数据库中</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
            {masked && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                当前：{masked}
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-... 留空则保持不变"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            支持 OpenAI、DeepSeek、通义千问等兼容 OpenAI 格式的接口
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Base URL
            <span className="ml-1 text-xs text-gray-400 font-normal">（使用 OpenAI 官方可留空）</span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { label: "DeepSeek", url: "https://api.deepseek.com/v1" },
              { label: "通义千问", url: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
              { label: "OpenAI 官方", url: "" },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setBaseUrl(preset.url)}
                className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {["gpt-4o", "gpt-4o-mini", "deepseek-chat", "qwen-max", "qwen-plus"].map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  model === m
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            视觉模型
            <span className="ml-1 text-xs text-gray-400 font-normal">（用于图片识别 JD，需支持图片输入）</span>
          </label>
          <input
            type="text"
            value={visionModel}
            onChange={(e) => setVisionModel(e.target.value)}
            placeholder="qwen-vl-max"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { label: "qwen-vl-max（千问）", value: "qwen-vl-max" },
              { label: "gpt-4o（OpenAI）", value: "gpt-4o" },
              { label: "gpt-4o-mini（OpenAI）", value: "gpt-4o-mini" },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setVisionModel(m.value)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  visionModel === m.value
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            DeepSeek 暂不支持图片输入，建议使用千问视觉或 OpenAI 的模型
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : saved ? "✓ 已保存" : "保存设置"}
        </button>
      </div>
    </div>
  );
}
