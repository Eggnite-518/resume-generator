import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import type { InterviewQuestion, HrAnalysis, QuestionType } from "@/types";

// ── Prompt ────────────────────────────────────────────────────────────────────
// Tech Expert Agent：根据 JD、简历、HR 分析出题，每次生成一道题

const TECH_SYSTEM_PROMPT = `你是一名顶级科技公司的技术面试官（同时具备专业技术深度和业务判断力），以提问刁钻、追问犀利著称。

你的出题原则：
1. **针对性**：每道题都直击简历中的模糊点或JD要求的核心能力，不出泛泛而谈的问题
2. **深度递进**：从具体案例切入，逐步向背后的思考逻辑和权衡取舍深挖
3. **反套路**：避免能用模板答案应付的问题，要求候选人给出具体细节和数据
4. **STAR陷阱识别**：如果候选人的简历描述缺乏结果，则提问时要求必须给出量化数据

题型分布策略（根据岗位特点调整）：
- behavioral（行为面试题）：考察过去行为，以"请讲一个..."开头
- technical（技术/专业题）：考察专业深度，要求给出具体方法论或技术细节
- scenario（情景题）：给出假设场景，考察判断力和处理思路
- situational（追问型）：针对简历中某个具体经历的深度追问`;

function buildQuestionPrompt(
  jobRole: string,
  jdText: string,
  resumeText: string,
  hrAnalysis: HrAnalysis,
  askedQuestions: InterviewQuestion[],
  totalTarget: number
): string {
  const askedSummary =
    askedQuestions.length === 0
      ? "（还没有问过任何问题，这是第1题）"
      : askedQuestions
          .map((q) => `第${q.order}题（${q.focusArea}）：${q.question}`)
          .join("\n");

  const gapSummary = hrAnalysis.gaps
    .map((g) => `[${g.severity}] ${g.area}：${g.issue}`)
    .join("\n");

  const nextOrder = askedQuestions.length + 1;

  return `你正在面试一名应聘"${jobRole}"的候选人，现在需要出第 ${nextOrder} 题（共计 ${totalTarget} 题）。

## 岗位JD
${jdText}

## 候选人简历
${resumeText}

## HR预审发现的漏洞和风险（重点关注）
${gapSummary}
风险领域：${hrAnalysis.riskAreas.join("；")}

## 已提问的问题（不要重复考察相同维度）
${askedSummary}

## 出题要求
- 第 ${nextOrder} 题应该考察什么维度：请根据JD要求和简历漏洞，选择最值得深挖的角度
- difficulty 评分标准：1=基础概念，2=有一定深度，3=需要实战经验，4=高级，5=极难/陷阱题
- 第 1-2 题可以稍简单（难度2-3）作为破冰，第 3 题起逐步提升难度（3-5）
- followUps：2-3个针对答案的可能追问，用于深挖（面试官备用，不展示给候选人）

返回如下JSON（只返回JSON，不要有其他文字）：
{
  "id": "q_${nextOrder}",
  "order": ${nextOrder},
  "type": "behavioral",
  "difficulty": 3,
  "focusArea": "数据驱动决策",
  "question": "你在简历中提到'建立了数据看板'，请具体描述一下：这个看板解决了什么业务问题？你是如何决定要追踪哪些指标的？上线后有没有因为数据发现推翻过原来的产品决策，举一个具体的例子。",
  "intent": "考察候选人是否真正理解数据驱动而非只是形式上使用数据，简历中该描述缺乏具体场景和决策案例",
  "followUps": [
    "这个看板现在还在用吗？后来有没有迭代？",
    "如果数据指标之间出现矛盾，你如何取舍？",
    "你提到用户满意度90%，这个数据是怎么采集的，样本量多大？"
  ]
}`;
}

function parseQuestion(raw: string, expectedOrder: number): InterviewQuestion {
  const parsed = JSON.parse(raw);
  const validTypes: QuestionType[] = ["behavioral", "technical", "scenario", "situational"];
  const rawDiff = Number(parsed.difficulty);

  return {
    id: String(parsed.id || `q_${expectedOrder}`),
    order: expectedOrder,
    type: validTypes.includes(parsed.type) ? parsed.type : "behavioral",
    difficulty: ([1, 2, 3, 4, 5].includes(rawDiff) ? rawDiff : 3) as InterviewQuestion["difficulty"],
    focusArea: String(parsed.focusArea || "综合能力"),
    question: String(parsed.question || ""),
    intent: String(parsed.intent || ""),
    followUps: Array.isArray(parsed.followUps) ? parsed.followUps.map(String) : [],
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
// POST /api/interview/question
// body: { sessionId, totalTarget? }
// 每次调用生成下一道面试题；若已完成 totalTarget 道题则返回 done:true

const DEFAULT_TOTAL = 6;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, totalTarget = DEFAULT_TOTAL } = body as {
    sessionId: string;
    totalTarget?: number;
  };

  if (!sessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "面试 Session 不存在" }, { status: 404 });
  }
  if (session.phase === "complete") {
    return NextResponse.json({ done: true, message: "面试已结束" });
  }

  let hrAnalysis: HrAnalysis;
  try {
    hrAnalysis = JSON.parse(session.hrAnalysis) as HrAnalysis;
  } catch {
    hrAnalysis = { strengths: [], gaps: [], riskAreas: [], overallImpression: "" };
  }

  let questions: InterviewQuestion[] = [];
  try {
    questions = JSON.parse(session.questions) as InterviewQuestion[];
  } catch {
    questions = [];
  }

  // 已达到目标题数，标记为 tech 完成
  if (questions.length >= totalTarget) {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { phase: "tech" }, // 答完后由 /report 推进到 complete
    });
    return NextResponse.json({ done: true, questionsCount: questions.length });
  }

  try {
    const prompt = buildQuestionPrompt(
      session.jobRole,
      session.jdText,
      session.resumeText,
      hrAnalysis,
      questions,
      totalTarget
    );

    const raw = await chatCompletion(
      [
        { role: "system", content: TECH_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { json: true }
    );

    const newQuestion = parseQuestion(raw, questions.length + 1);
    const updatedQuestions = [...questions, newQuestion];

    // 更新 session，同时将 phase 切换到 tech（如果还在 hr）
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        questions: JSON.stringify(updatedQuestions),
        phase: session.phase === "hr" ? "tech" : session.phase,
      },
    });

    return NextResponse.json({
      question: newQuestion,
      questionsCount: updatedQuestions.length,
      totalTarget,
      done: false,
    });
  } catch (err) {
    console.error("[interview/question]", err);
    return NextResponse.json({ error: "生成面试题失败，请重试" }, { status: 500 });
  }
}
