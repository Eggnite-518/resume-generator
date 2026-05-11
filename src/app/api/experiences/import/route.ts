import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import { extractTextFromFile } from "@/lib/parsers";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "请上传文件" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    text = await extractTextFromFile(buffer, file.type, file.name);
  } catch (err) {
    return NextResponse.json(
      { error: `文件解析失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 400 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "文件内容为空，无法解析" }, { status: 400 });
  }

  const prompt = `你是一个专业的简历解析助手。请将以下简历文本解析为尽可能细粒度的独立经历条目，以JSON格式返回。

简历文本：
${text.slice(0, 8000)}

请返回如下JSON格式：
{
  "experiences": [
    {
      "type": "work|education|project|skill|award|other",
      "title": "该条目的简短标题",
      "organization": "仅填写公司或学校名称，不含项目名，没有则为null",
      "projectName": "仅 work 类填写，任职期间负责的具体产品/项目名称，没有则为null",
      "startDate": "开始时间如2020-03，技能类为null",
      "endDate": "结束时间如2023-06或至今，技能类为null",
      "description": "详细描述，每条要点单独占一行，格式为'• 内容'，各行之间用\\n分隔，保留所有具体数据",
      "tags": ["关键词1", "关键词2"]
    }
  ]
}

## 分类规则（非常重要，严格执行）

### type = "work"（工作经历）
必须同时满足：有明确的公司/雇主名称 + 有职位名称 + 有任职时间段。
❌ 禁止将以下内容归为 work：「有产品完整交付经验」「熟悉XX流程」「具备XX能力」这类能力描述句，它们属于 skill。

### type = "education"（教育背景）
有明确学校名称 + 学历/专业 + 就读时间。

### type = "project"（项目经历）
有明确项目名称，且该项目是作为独立成果描述的（非泛泛能力陈述）。

### type = "skill"（技能特长）⚠️ 最容易出错
凡是以下形式的内容，一律归为 skill，不论出现在简历哪个板块：
- 「熟练使用…」「熟悉…」「具备…能力」「有…经验」「能够…」
- 语言能力（英语CET成绩等）
- 工具软件掌握情况
- 通用行业/业务能力描述
⚠️ skill 类必须按维度拆分为多条，不能合并。常见维度：产品工具能力、技术开发能力、AI/算法经验、数据分析能力、语言能力、行业经验等。

### type = "award"（荣誉奖项）
有具体奖项名称和时间。

---

**通用要求**：
- description 保留原文所有具体信息，不要压缩或省略
- 有量化数据的务必保留（百分比、用户数、时间等）
- skill 类的 startDate / endDate 填 null
- tags 提取该条目最关键的技术词/行业词，3-8个`;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    { json: true }
  );

  let parsed: { experiences: Array<{
    type: string; title: string; organization?: string; projectName?: string;
    startDate?: string; endDate?: string; description: string; tags: string[];
  }> };

  try {
    parsed = JSON.parse(result);
  } catch {
    return NextResponse.json({ error: "AI 解析失败，请重试" }, { status: 500 });
  }

  const created = await Promise.all(
    (parsed.experiences || []).map((e) =>
      prisma.experience.create({
        data: {
          type: e.type || "other",
          title: e.title || "未命名",
          organization: e.organization,
          projectName: e.projectName || null,
          startDate: e.startDate,
          endDate: e.endDate,
          description: e.description || "",
          tags: JSON.stringify(e.tags || []),
          rawInput: text.slice(0, 2000),
        },
      })
    )
  );

  return NextResponse.json({
    success: true,
    count: created.length,
    experiences: created.map((e) => ({ ...e, tags: JSON.parse(e.tags) })),
  });
}
