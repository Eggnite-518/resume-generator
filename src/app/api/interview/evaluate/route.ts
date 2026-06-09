import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import type { InterviewQuestion, InterviewAnswer, QuestionScore, StarAnalysis } from "@/types";

// ── Prompt ────────────────────────────────────────────────────────────────────
// Score Agent：对候选人的单题回答进行多维打分和深度点评

const SCORE_SYSTEM_PROMPT = `你是一名经验丰富的面试评估专家，同时具备技术深度和人才评估能力。
你的评分标准严格、客观，不给空洞安慰。

## 评分维度说明
- completeness（完整性）：是否覆盖了问题的各个层面，有没有明显的关键信息遗漏
- depth（深度与专业性）：是否展示了真正的专业理解，而非表面概念
- clarity（表达清晰度）：逻辑是否清晰，结构是否有条理，是否容易理解
- relevance（岗位相关性）：回答内容与目标岗位的匹配程度

## STAR 分析
判断回答是否包含完整的 STAR 结构：
- situation：是否描述了具体的背景/情境
- task：是否说明了任务目标或面临的问题
- action：是否描述了具体的行动和方法（动词+细节）
- result：是否给出了可量化的结果（数字/百分比/规模）

## 严格评分准则
- 8分以上：答案具体、有细节、有数据、逻辑清晰，接近优秀
- 6-7分：基本合格，但缺乏深度或量化数据
- 4-5分：回答较空泛，只有概念没有实例
- 3分以下：严重跑题、逻辑混乱或完全套模板`;

function buildEvaluatePrompt(
  jobRole: string,
  jdText: string,
  question: InterviewQuestion,
  answer: string
): string {
  return `请对以下面试问答进行评分和点评。

## 应聘岗位
${jobRole}

## 岗位JD（评分时参考岗位要求）
${jdText}

## 面试题
**题型**：${question.type} | **难度**：${question.difficulty}/5 | **考察维度**：${question.focusArea}
**题目**：${question.question}
**出题意图**（评分参考，不展示给候选人）：${question.intent}

## 候选人回答
${answer || "（候选人未作答/跳过）"}

## 评分要求
1. 各维度分数（1-10）要与 modelAnswer 的对比来确定，不要浮夸
2. strengths：具体指出回答中真正好的地方（引用原文中的片段），没有就不填
3. improvements：具体指出哪里不足、应该如何改进（给出具体的改进示例）
4. modelAnswer：给出这道题的优秀参考答案，要具体、有数据、有逻辑，长度适中

返回如下JSON（只返回JSON，不要有其他文字）：
{
  "questionId": "${question.id}",
  "score": 6.5,
  "dimensions": {
    "completeness": 7,
    "depth": 6,
    "clarity": 7,
    "relevance": 6
  },
  "strengths": [
    "提到了具体的项目背景（掌上工作日志）和用户规模，有一定的情境描述"
  ],
  "improvements": [
    "只描述了'做了什么'，没有说明'为什么这样做'以及决策过程中的权衡。建议补充：'当时面临的核心挑战是...，我选择这个方案是因为...'",
    "没有量化结果：用户满意度提升多少？具体怎么衡量的？建议说：'通过用户调研NPS从XX提升到XX，核心功能日活提升20%'"
  ],
  "modelAnswer": "在我负责的XX产品中，面临[具体背景]的挑战。当时数据显示[具体数字]，所以我决定[具体行动]。我的方法是[1-2-3步骤]，最终实现了[量化结果]。这个过程中最大的权衡是[深度思考]。",
  "starAnalysis": {
    "situation": true,
    "task": false,
    "action": true,
    "result": false
  }
}`;
}

function parseScore(raw: string, questionId: string): QuestionScore {
  const parsed = JSON.parse(raw);

  const clamp = (v: unknown, min = 1, max = 10): number => {
    const n = Number(v);
    return isNaN(n) ? 5 : Math.max(min, Math.min(max, n));
  };

  const dims = parsed.dimensions || {};
  const starRaw = parsed.starAnalysis || {};
  const starAnalysis: StarAnalysis = {
    situation: Boolean(starRaw.situation),
    task: Boolean(starRaw.task),
    action: Boolean(starRaw.action),
    result: Boolean(starRaw.result),
  };

  return {
    questionId: String(parsed.questionId || questionId),
    score: clamp(parsed.score, 1, 10),
    dimensions: {
      completeness: clamp(dims.completeness),
      depth: clamp(dims.depth),
      clarity: clamp(dims.clarity),
      relevance: clamp(dims.relevance),
    },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
    modelAnswer: String(parsed.modelAnswer || ""),
    starAnalysis,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
// POST /api/interview/evaluate
// body: { sessionId, questionId, answer }

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, questionId, answer } = body as {
    sessionId: string;
    questionId: string;
    answer: string;
  };

  if (!sessionId || !questionId) {
    return NextResponse.json({ error: "缺少 sessionId 或 questionId" }, { status: 400 });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "面试 Session 不存在" }, { status: 404 });
  }

  let questions: InterviewQuestion[] = [];
  let answers: InterviewAnswer[] = [];
  let scores: QuestionScore[] = [];

  try {
    questions = JSON.parse(session.questions) as InterviewQuestion[];
    answers = JSON.parse(session.answers) as InterviewAnswer[];
    scores = JSON.parse(session.scores) as QuestionScore[];
  } catch {
    // keep empty arrays
  }

  const question = questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ error: "题目不存在" }, { status: 404 });
  }

  // 防止重复评分
  if (scores.find((s) => s.questionId === questionId)) {
    const existing = scores.find((s) => s.questionId === questionId)!;
    return NextResponse.json({ score: existing, alreadyScored: true });
  }

  try {
    const prompt = buildEvaluatePrompt(session.jobRole, session.jdText, question, answer);
    const raw = await chatCompletion(
      [
        { role: "system", content: SCORE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { json: true }
    );

    const newScore = parseScore(raw, questionId);

    // 记录答案
    const newAnswer: InterviewAnswer = {
      questionId,
      answer: answer || "",
      answeredAt: new Date().toISOString(),
    };

    const updatedAnswers = [...answers.filter((a) => a.questionId !== questionId), newAnswer];
    const updatedScores = [...scores, newScore];

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        answers: JSON.stringify(updatedAnswers),
        scores: JSON.stringify(updatedScores),
      },
    });

    return NextResponse.json({ score: newScore });
  } catch (err) {
    console.error("[interview/evaluate]", err);
    return NextResponse.json({ error: "评分失败，请重试" }, { status: 500 });
  }
}
