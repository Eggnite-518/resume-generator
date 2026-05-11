import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";

const SYSTEM_PROMPT = `你是一个专业的简历助手，正在帮助用户整理和完善他们的经历。
你的目标是通过对话引导用户提供足够详细的信息，以便生成一条高质量的简历经历条目。

引导策略：
1. 第一轮：了解经历的基本情况（类型、职位/项目名、所在机构、时间段）
2. 第二轮：了解具体负责的事情和职责
3. 第三轮：挖掘可量化的成果（数字、百分比、规模）
4. 第四轮：了解用到的技术栈或技能

在收集到足够信息后，你需要输出一个特殊标记 [COMPLETE] 并附上JSON格式的结构化经历。

输出格式（仅在信息足够时）：
[COMPLETE]
{
  "type": "work|education|project|skill|award|other",
  "title": "...",
  "organization": "...",
  "startDate": "...",
  "endDate": "...",
  "description": "• 成就1\n• 成就2\n• 成就3",
  "tags": ["技能1", "技能2"]
}

在信息不足时，继续以友好的中文提问，每次只问1-2个关键问题。`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, finalize } = body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    finalize?: boolean;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({
      reply: "你好！我来帮你整理一段经历。请先告诉我这段经历的大概情况，比如：是工作经历、项目经历还是其他？叫什么名字？在哪个公司或机构？",
      complete: false,
    });
  }

  const systemMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (finalize) {
    systemMessages.push({
      role: "system",
      content: "用户已经提供了足够信息，请立即生成完整的经历条目，输出 [COMPLETE] 标记和JSON。",
    });
  }

  const allMessages = [...systemMessages, ...messages];

  const reply = await chatCompletion(allMessages);

  if (reply.includes("[COMPLETE]")) {
    const jsonStr = reply.split("[COMPLETE]")[1]?.trim();
    let parsed = null;
    try {
      parsed = JSON.parse(jsonStr || "");
    } catch {
      // Try to extract JSON from the string
      const match = jsonStr?.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          // ignore
        }
      }
    }

    if (parsed) {
      const exp = await prisma.experience.create({
        data: {
          type: parsed.type || "other",
          title: parsed.title || "未命名",
          organization: parsed.organization,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          description: parsed.description || "",
          tags: JSON.stringify(parsed.tags || []),
        },
      });
      return NextResponse.json({
        reply: "太棒了！我已经帮你整理好这段经历，你可以在下方预览并保存。",
        complete: true,
        experience: { ...exp, tags: JSON.parse(exp.tags) },
      });
    }
  }

  return NextResponse.json({ reply, complete: false });
}
