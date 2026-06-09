import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import { INTERVIEWER_SYSTEM_PROMPT } from "../start/route";

type ChatMessage = { role: "user" | "assistant"; content: string };

function extractScorecard(text: string): string {
  const match = text.match(/\[SCORECARD_START\]([\s\S]*?)\[SCORECARD_END\]/);
  return match?.[1]?.trim() ?? "";
}

// POST /api/interview/chat
// body: { sessionId, userMessage }
// 每次用户发送消息，将消息追加到对话历史，调用 AI，返回回复

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, userMessage } = body as {
    sessionId: string;
    userMessage: string;
  };

  if (!sessionId || !userMessage?.trim()) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "面试 Session 不存在" }, { status: 404 });
  }
  if (session.phase === "complete") {
    return NextResponse.json({ error: "面试已结束" }, { status: 400 });
  }

  let history: ChatMessage[] = [];
  try {
    history = JSON.parse(session.questions) as ChatMessage[];
  } catch {
    history = [];
  }

  // 追加用户消息
  const updatedHistory: ChatMessage[] = [...history, { role: "user", content: userMessage }];

  // 构建完整上下文：系统 Prompt + 全部对话历史
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: INTERVIEWER_SYSTEM_PROMPT },
    ...updatedHistory,
  ];

  try {
    const reply = await chatCompletion(messages);

    const finalHistory: ChatMessage[] = [...updatedHistory, { role: "assistant", content: reply }];

    const isComplete = reply.includes("[SCORECARD_START]");
    const scorecard = isComplete ? extractScorecard(reply) : undefined;

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        questions: JSON.stringify(finalHistory),
        phase: isComplete ? "complete" : "tech",
        ...(scorecard ? { finalReport: scorecard } : {}),
      },
    });

    return NextResponse.json({ reply, isComplete, scorecard });
  } catch (err) {
    console.error("[interview/chat]", err);
    return NextResponse.json({ error: "AI 回复失败，请重试" }, { status: 500 });
  }
}
