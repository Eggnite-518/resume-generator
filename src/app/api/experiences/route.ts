import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";

export async function GET() {
  const experiences = await prisma.experience.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    experiences.map((e) => ({ ...e, tags: JSON.parse(e.tags) }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rawInput, type, title, organization, projectName, startDate, endDate, description, tags } = body;

  // If raw input provided, use AI to parse it
  if (rawInput && !title) {
    const prompt = `你是一个简历助手。请将以下用户描述的经历解析为结构化数据，以JSON格式返回。

用户输入：
${rawInput}

## 解析规则
- 如果输入只描述一段经历，返回一条记录；若混合多类内容，拆分为多条
- type = "work" 必须有明确公司名称 + 职位 + 时间，缺一不可
- 「有XX经验」「熟悉XX」「具备XX能力」等能力描述句，一律归为 type = "skill"
- skill 类按能力维度拆分（产品工具、技术能力、AI经验、语言能力等），不能合并为一条
- skill 类的 startDate / endDate 填 null
- work 类如果描述中提到了负责某个具体产品/项目的名称，填入 projectName；没有则为 null

请返回如下JSON格式：
{
  "experiences": [
    {
      "type": "work|education|project|skill|award|other",
      "title": "职位/项目/技能维度名称",
      "organization": "仅填公司或学校名称，不含项目名，没有则为null",
      "projectName": "仅 work 类填写，负责的具体产品/项目名称，没有则为null",
      "startDate": "开始时间如2020-03，技能类为null",
      "endDate": "结束时间或至今，技能类为null",
      "description": "详细描述，每条要点单独一行，格式为'• 内容'，用\\n分隔，保留所有具体细节和量化数据",
      "tags": ["关键词1", "关键词2"]
    }
  ]
}`;

    const result = await chatCompletion(
      [{ role: "user", content: prompt }],
      { json: true }
    );

    let parsed: { experiences?: Array<{
      type: string; title: string; organization?: string; projectName?: string;
      startDate?: string; endDate?: string; description: string; tags: string[];
    }> };
    try {
      parsed = JSON.parse(result);
    } catch {
      return NextResponse.json({ error: "AI 解析失败，请重试" }, { status: 500 });
    }

    const items = parsed.experiences || [];
    if (items.length === 0) {
      return NextResponse.json({ error: "AI 未能解析内容，请重试" }, { status: 500 });
    }

    const created = await Promise.all(
      items.map((item) =>
        prisma.experience.create({
          data: {
            type: item.type || "other",
            title: item.title || "未命名经历",
            organization: item.organization,
            projectName: item.projectName || null,
            startDate: item.startDate,
            endDate: item.endDate,
            description: item.description || "",
            tags: JSON.stringify(item.tags || []),
            rawInput,
          },
        })
      )
    );

    return NextResponse.json({
      count: created.length,
      experiences: created.map((e) => ({ ...e, tags: JSON.parse(e.tags) })),
      parsed: items,
    });
  }

  // Direct structured creation
  const exp = await prisma.experience.create({
    data: {
      type: type || "other",
      title: title || "未命名",
      organization,
      projectName: projectName || null,
      startDate,
      endDate,
      description: description || "",
      tags: JSON.stringify(tags || []),
      rawInput,
    },
  });
  return NextResponse.json({ ...exp, tags: JSON.parse(exp.tags) });
}
