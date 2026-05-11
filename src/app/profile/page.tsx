"use client";

import { useState, useEffect, useRef } from "react";

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", location: "",
    linkedin: "", github: "", website: "", summary: "", photo: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          location: data.location || "",
          linkedin: data.linkedin || "",
          github: data.github || "",
          website: data.website || "",
          summary: data.summary || "",
          photo: data.photo || "",
        });
      })
      .catch((err) => {
        console.error("加载个人信息失败:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="text-gray-400 text-sm">加载中...</div>;

  const fields = [
    { key: "name", label: "姓名", placeholder: "你的全名", required: true },
    { key: "email", label: "邮箱", placeholder: "example@email.com" },
    { key: "phone", label: "手机号", placeholder: "138-xxxx-xxxx" },
    { key: "location", label: "所在城市", placeholder: "北京" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/yourprofile" },
    { key: "github", label: "GitHub", placeholder: "github.com/yourname" },
    { key: "website", label: "个人网站", placeholder: "https://yoursite.com" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">个人信息</h1>
      <p className="text-gray-500 mb-8">这些信息会出现在每份简历的顶部</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* ── Photo upload ── */}
        <div className="flex items-start gap-5 pb-5 border-b border-gray-100">
          <div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="relative w-[72px] h-[90px] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors bg-gray-50 flex flex-col items-center justify-center cursor-pointer group"
              title="点击上传证件照"
            >
              {form.photo ? (
                <>
                  <img src={form.photo} alt="证件照" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs">更换</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-2xl text-gray-300 leading-none mb-1">+</span>
                  <span className="text-xs text-gray-400">上传照片</span>
                </>
              )}
            </button>
            {form.photo && (
              <button
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, photo: "" }));
                  if (photoInputRef.current) photoInputRef.current.value = "";
                }}
                className="mt-1.5 text-xs text-red-400 hover:text-red-600 w-full text-center"
              >
                移除
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="pt-1">
            <p className="text-sm font-medium text-gray-700 mb-1">证件照</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              将自动显示在每份简历的右上角。<br />
              建议使用白底或蓝底正面照，<br />
              JPG / PNG 格式均可。
            </p>
          </div>
        </div>

        {/* ── Text fields ── */}
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "name" ? "col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {f.label}
                {f.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type="text"
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            个人简介
            <span className="text-xs text-gray-400 font-normal ml-1">（2-3句话，简洁介绍自己）</span>
          </label>
          <textarea
            value={form.summary}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            placeholder="拥有X年XX领域经验，擅长XXX，热衷于XXX..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !form.name}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : saved ? "✓ 已保存" : "保存信息"}
        </button>
      </div>
    </div>
  );
}
