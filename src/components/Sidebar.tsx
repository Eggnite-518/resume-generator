"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "仪表盘", icon: "🏠" },
  { href: "/profile", label: "个人信息", icon: "👤" },
  { href: "/experiences", label: "经历库", icon: "📚" },
  { href: "/generate", label: "生成简历", icon: "✨" },
  { href: "/resumes", label: "历史简历", icon: "📄" },
  { href: "/settings", label: "设置", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-10">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">简历快速生成器</h1>
        <p className="text-xs text-gray-500 mt-1">AI 驱动，精准匹配 JD</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          数据存储在本地，安全可控
        </p>
      </div>
    </aside>
  );
}
