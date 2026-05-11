import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { jdText, answers, competencyName, competencyRequirement } = body as {
    jdText: string;
    answers: Array<{ question: string; answer: string }>;
    competencyName?: string;
    competencyRequirement?: string;
  };

  const exp = await prisma.experience.findUnique({ where: { id } });
  if (!exp) return NextResponse.json({ error: "经历不存在" }, { status: 404 });

  const answersText = answers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const competencyContext = competencyName
    ? `\n## 重点优化的能力维度\n能力名称：${competencyName}\nJD要求：${competencyRequirement || ""}\n请在优化描述中重点体现这一能力维度的证明。\n`
    : "";

  const prompt = `你是一名资深 HR 和职业顾问。请根据候选人提供的补充信息，重新优化这条经历的描述，使其更好地匹配岗位 JD。
${competencyContext}
## 岗位 JD（核心要求）
${jdText}

## 原始经历
类型：${exp.type}
标题：${exp.title}${exp.organization ? `\n公司：${exp.organization}` : ""}
原始描述：
${exp.description || "（无描述）"}

## 候选人补充回答
${answersText}

请完成以下任务，返回JSON：
{
  "optimizedDescription": "整合原始描述和补充信息，重新改写的完整描述。每条要点单独一行，格式为'• 内容'，用动词开头，结合JD关键词，保留并突出所有量化数据",
  "score": 85,
  "scoreReason": "结合补充信息后的匹配度和评分依据，1-2句"
}

要求：
- optimizedDescription 必须融入候选人的补充回答，不能丢弃任何有价值的信息
- 优先突出与JD要求直接相关的内容
- 保持真实，不要捏造数据
- 只返回JSON`;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    { json: true }
  );

  let parsed: { optimizedDescription: string; score: number; scoreReason: string };
  try {
    parsed = JSON.parse(result);
  } catch {
    return NextResponse.json({ error: "AI 处理失败，请重试" }, { status: 500 });
  }

  return NextResponse.json({
    optimizedDescription: parsed.optimizedDescription || "",
    score: parsed.score ?? 0,
    scoreReason: parsed.scoreReason || "",
  });
}
