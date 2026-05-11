import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import { parseTags } from "@/lib/utils";
import type { ResumeContent, ResumeSectionItem } from "@/types";

const TYPE_TO_TITLE: Record<string, string> = {
  work: "工作经历",
  project: "项目经历",
  education: "教育背景",
  skill: "技能特长",
  award: "荣誉奖项",
  other: "其他经历",
};

function buildFallbackSections(
  selectedExps: Array<{
    id: string; type: string; title: string; organization?: string | null;
    projectName?: string | null; dateRange: string; description: string;
  }>
): ResumeContent["sections"] {
  // Group by type
  const grouped: Record<string, typeof selectedExps> = {};
  for (const exp of selectedExps) {
    if (!grouped[exp.type]) grouped[exp.type] = [];
    grouped[exp.type].push(exp);
  }

  const ORDER = ["work", "project", "education", "skill", "award", "other"];
  const sections: ResumeContent["sections"] = [];

  for (const type of ORDER) {
    if (!grouped[type]?.length) continue;
    sections.push({
      id: `section_${type}`,
      type: type as ResumeContent["sections"][0]["type"],
      title: TYPE_TO_TITLE[type] || type,
      items: grouped[type].map((exp, i): ResumeSectionItem => ({
        id: `item_${type}_${i}`,
        title: exp.title,
        subtitle: exp.organization || undefined,
        projectName: exp.projectName || undefined,
        dateRange: (type === "skill") ? undefined : (exp.dateRange || undefined),
        bullets: exp.description
          ? exp.description
              .split(/\\n|\n/)
              .map((l) => l.replace(/^[•·\-\*]\s*/, "").trim())
              .filter(Boolean)
          : [],
      })),
    });
  }
  return sections;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jdText, template = "classic", title, optimizedDescs } = body as {
    jdText: string;
    template?: string;
    title?: string;
    optimizedDescs?: Record<string, string>; // expId -> AI-optimized description
  };

  if (!jdText?.trim()) {
    return NextResponse.json({ error: "请提供岗位 JD" }, { status: 400 });
  }

  const [profile, experiences] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.experience.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (experiences.length === 0) {
    return NextResponse.json({ error: "经历库为空，请先添加经历" }, { status: 400 });
  }

  const expList = experiences.map((e, i) => ({
    index: i + 1,
    id: e.id,
    type: e.type,
    title: e.title,
    organization: e.organization,
    projectName: e.projectName,
    dateRange: [e.startDate, e.endDate].filter(Boolean).join(" - "),
    // Prefer AI-optimized description if provided from analyze step
    description: optimizedDescs?.[e.id] || e.description,
    tags: parseTags(e.tags),
  }));

  const expListText = expList
    .map(
      (e) =>
        `[${e.index}] ${e.type} | ${e.title}${e.organization ? ` @ ${e.organization}` : ""}${e.projectName ? ` [项目:${e.projectName}]` : ""}${e.dateRange ? ` | ${e.dateRange}` : ""}\n描述：${e.description}`
    )
    .join("\n\n---\n\n");

  // Step 1: Select relevant experiences
  const selectPrompt = `根据以下岗位JD，从经历库中选出最匹配的2-3条经历。

## 岗位JD
${jdText}

## 经历库
${expListText}

请只返回JSON，格式：{"selected": [1, 3]}（数字为经历的编号）`;

  const selectResult = await chatCompletion(
    [{ role: "user", content: selectPrompt }],
    { json: true }
  );

  let selectedIndices: number[] = [];
  try {
    const parsed = JSON.parse(selectResult);
    selectedIndices = parsed.selected || parsed.indices || parsed.usedExpIndices || [];
  } catch {
    selectedIndices = expList.slice(0, 3).map((e) => e.index);
  }

  const selectedExps = selectedIndices
    .map((i) => expList[i - 1])
    .filter(Boolean);

  if (selectedExps.length === 0) {
    selectedExps.push(...expList.slice(0, Math.min(3, expList.length)));
  }

  const usedExpIds = selectedExps.map((e) => e.id);

  // Step 2: Generate formatted resume content for selected experiences
  const selectedText = selectedExps
    .map(
      (e) =>
        `类型:${e.type} | 标题:${e.title}${e.organization ? ` | 公司:${e.organization}` : ""}${(e as typeof e & { projectName?: string | null }).projectName ? ` | 项目名:${(e as typeof e & { projectName?: string | null }).projectName}` : ""}${e.dateRange ? ` | 时间:${e.dateRange}` : ""}\n原始描述：${e.description}`
    )
    .join("\n\n---\n\n");

  const formatPrompt = `你是简历优化专家。请将以下经历改写为简历格式，同时结合岗位JD中的关键词进行优化。

## 岗位JD（关键词参考）
${jdText.slice(0, 500)}

## 需要格式化的经历
${selectedText}

请返回JSON，严格按照以下格式，items数组必须有内容：
{
  "sections": [
    {
      "id": "section_work",
      "type": "work",
      "title": "工作经历",
      "items": [
        {
          "id": "item_1",
          "title": "职位名称",
          "subtitle": "公司名称",
          "projectName": "负责的具体产品/项目名，没有则省略此字段",
          "dateRange": "2021-03 - 2024-01",
          "bullets": [
            "负责XX核心功能的需求规划与PRD撰写，定义20+功能点并完成优先级排序，推动产品按时上线。",
            "搭建用户反馈收集机制，将80+条零散问题转化为标准缺陷任务，缺陷修复率提升至90%以上。"
          ]
        }
      ]
    }
  ]
}

## Bullet 书写规则（核心）
每条经历只写 **2-3 个 bullet**，每个 bullet 是**一句完整的话**，结构为：

> **[行动动词 + 做了什么]**，[背景规模/方法/工具]，**[量化结果/影响]**。

- ✅ 正确示例："主导掌上工作日志系统全生命周期管理，撰写8000+字PRD并定义3大模块20+功能点，产品上线后用户满意度达90%。"
- ❌ 错误示例：把一段描述机械地拆成多个碎句，每句单独成 bullet（"负责需求分析"、"撰写PRD"、"推动落地" 各一条）
- 每个 bullet 必须包含**行动 + 结果**两个要素，结果优先量化（百分比/数量/时间/规模）
- 若原始描述中量化数据不足，可基于描述合理推断，但不得编造无中生有的数字
- bullet 以中文句号结尾，不加「•」前缀（前端会自动添加符号）

## 其他结构要求
- **每条经历必须出现在对应 type 的 section 的 items 中，items 不能为空**
- **project 类型**：title 填项目名称，subtitle 填公司名（无明确雇主则填 null）
- **work 类型**：title 填职位名称，subtitle 填公司名称，若有「项目名」字段则填入 projectName
- **skill 类型**：不需要 dateRange，subtitle 为 null，bullets 简洁列举技能即可
- 只返回JSON，不要有其他文字`;

  const formatResult = await chatCompletion(
    [{ role: "user", content: formatPrompt }],
    { json: true }
  );

  let sections: ResumeContent["sections"] = [];
  try {
    const parsed = JSON.parse(formatResult);
    sections = parsed.sections || [];
  } catch {
    sections = [];
  }

  // Fallback: if AI didn't return proper section items, build directly from raw data
  const hasRealContent = sections.some(
    (s) => Array.isArray(s.items) && s.items.length > 0 && typeof s.items[0] === "object"
  );
  if (!hasRealContent) {
    sections = buildFallbackSections(selectedExps);
  }

  // Photo is NOT stored in resume content – it's injected at render time from Profile
  const content: ResumeContent = {
    personalInfo: {
      name: profile?.name || "",
      email: profile?.email || undefined,
      phone: profile?.phone || undefined,
      location: profile?.location || undefined,
      linkedin: profile?.linkedin || undefined,
      github: profile?.github || undefined,
      website: profile?.website || undefined,
      summary: profile?.summary || undefined,
    },
    sections,
  };

  const resume = await prisma.resume.create({
    data: {
      title: title || `简历 - ${new Date().toLocaleDateString("zh-CN")}`,
      jdText,
      content: JSON.stringify(content),
      template,
      usedExpIds: JSON.stringify(usedExpIds),
    },
  });

  return NextResponse.json({
    ...resume,
    content,
    usedExpIds,
  });
}
