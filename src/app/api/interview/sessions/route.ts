import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type {
  InterviewSessionData,
  HrAnalysis,
  InterviewQuestion,
  InterviewAnswer,
  QuestionScore,
  InterviewReport,
  InterviewPhase,
} from "@/types";

function deserializeSession(session: {
  id: string;
  jobRole: string;
  resumeText: string;
  jdText: string;
  phase: string;
  hrAnalysis: string;
  questions: string;
  answers: string;
  scores: string;
  finalReport: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InterviewSessionData {
  const safeParse = <T>(raw: string, fallback: T): T => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    id: session.id,
    jobRole: session.jobRole,
    resumeText: session.resumeText,
    jdText: session.jdText,
    phase: session.phase as InterviewPhase,
    hrAnalysis: safeParse<HrAnalysis | null>(session.hrAnalysis, null),
    questions: safeParse<InterviewQuestion[]>(session.questions, []),
    answers: safeParse<InterviewAnswer[]>(session.answers, []),
    scores: safeParse<QuestionScore[]>(session.scores, []),
    finalReport: session.finalReport ? safeParse<InterviewReport | null>(session.finalReport, null) : null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// GET /api/interview/sessions — 获取全部面试记录（列表，不含完整文本）
export async function GET() {
  const sessions = await prisma.interviewSession.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jobRole: true,
      phase: true,
      questions: true,
      scores: true,
      finalReport: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const list = sessions.map((s) => {
    const safeParse = <T>(raw: string, fallback: T): T => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    const questions = safeParse<InterviewQuestion[]>(s.questions, []);
    const scores = safeParse<QuestionScore[]>(s.scores, []);
    const report = s.finalReport ? safeParse<InterviewReport | null>(s.finalReport, null) : null;

    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((sum, sc) => sum + sc.score, 0) / scores.length) * 10)
        : null;

    return {
      id: s.id,
      jobRole: s.jobRole,
      phase: s.phase as InterviewPhase,
      questionsCount: questions.length,
      answeredCount: scores.length,
      avgScore,
      totalScore: report?.totalScore ?? null,
      recommendation: report?.recommendation ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(list);
}

// DELETE /api/interview/sessions?id=xxx — 删除一条面试记录
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  await prisma.interviewSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
