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
    finalReport: session.finalReport
      ? safeParse<InterviewReport | null>(session.finalReport, null)
      : null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// GET /api/interview/sessions/[id] — 获取单个 Session 完整详情
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await prisma.interviewSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "Session 不存在" }, { status: 404 });
  }

  return NextResponse.json(deserializeSession(session));
}
