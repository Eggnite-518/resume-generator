import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import type { ResumeContent } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { instruction, content } = body as { instruction: string; content: ResumeContent };

  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentContent = content || (JSON.parse(resume.content) as ResumeContent);

  const prompt = `你是一个简历优化助手。请根据用户的指令对简历内容进行修改。

## 当前简历内容（JSON）
${JSON.stringify(currentContent, null, 2)}

## 用户指令
${instruction}

## 要求
- 按照用户指令修改对应部分
- 保持整体JSON结构不变
- 只修改需要修改的内容，其余保持原样
- 直接返回修改后的完整JSON，不要包含任何解释

返回格式与输入相同的JSON结构。`;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    { json: true }
  );

  let newContent: ResumeContent;
  try {
    newContent = JSON.parse(result);
  } catch {
    return NextResponse.json({ error: "AI 修改失败，请重试" }, { status: 500 });
  }

  await prisma.resume.update({
    where: { id },
    data: { content: JSON.stringify(newContent) },
  });

  return NextResponse.json({ content: newContent });
}
