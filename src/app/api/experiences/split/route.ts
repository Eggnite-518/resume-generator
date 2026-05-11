import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourceId, title, description, type } = body as {
    sourceId: string;
    title: string;
    description: string;
    type: string;
  };

  const prompt = `你是一个简历整理助手。用户有一条经历记录，内容混合了多项技能或经历，请将其拆分为多条独立、清晰的经历条目。

## 原记录
标题：${title}
类型：${type}
描述：
${description}

## 拆分规则
- 按照不同的能力维度、技能类别或经历类型分别拆分
- 每条记录应该是独立、完整的一类能力或经历
- 技能类可以按：产品工具能力、技术能力、AI相关经验、语言能力、行业经验等维度拆分
- 每条的 description 用要点格式（•开头），保留原有的具体细节
- tags 提取该条目的关键词

请返回 JSON 格式：
{
  "items": [
    {
      "type": "skill|work|education|project|award|other",
      "title": "该类能力的简短标题（如：产品工具能力、技术开发能力、AI应用经验）",
      "description": "• 具体内容1\\n• 具体内容2",
      "tags": ["关键词1", "关键词2"]
    }
  ]
}

只返回 JSON，不要有其他内容。`;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    { json: true }
  );

  let parsed: { items: Array<{ type: string; title: string; description: string; tags: string[] }> };
  try {
    parsed = JSON.parse(result);
  } catch {
    return NextResponse.json({ error: "AI 拆分失败，请重试" }, { status: 500 });
  }

  if (!parsed.items?.length) {
    return NextResponse.json({ error: "AI 未能识别出可拆分的内容" }, { status: 400 });
  }

  // Create new split records
  const created = await Promise.all(
    parsed.items.map((item) =>
      prisma.experience.create({
        data: {
          type: item.type || "skill",
          title: item.title,
          description: item.description || "",
          tags: JSON.stringify(item.tags || []),
        },
      })
    )
  );

  // Delete original record
  await prisma.experience.delete({ where: { id: sourceId } });

  return NextResponse.json({
    success: true,
    count: created.length,
    items: created.map((e) => ({ ...e, tags: JSON.parse(e.tags) })),
  });
}
