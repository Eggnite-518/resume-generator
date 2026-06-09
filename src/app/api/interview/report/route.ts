import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import type {
  InterviewQuestion,
  InterviewAnswer,
  QuestionScore,
  InterviewReport,
  ImprovementItem,
} from "@/types";

// ── Prompt ────────────────────────────────────────────────────────────────────
// Report Agent：基于全部问答记录，生成综合面试评估报告

const REPORT_SYSTEM_PROMPT = `你是一名资深的人才测评顾问，负责对整场面试进行全面总结和评估。
你的报告需要：客观公正、有据可依、可操作性强。

## 综合评分维度
- technicalDepth（专业深度）：对岗位核心技能的理解和实践深度
- expressionClarity（表达清晰度）：整场面试的逻辑性、结构性和表达流畅度
- problemSolving（问题解决能力）：面对复杂场景时的分析和决策思路
- cultureFit（岗位契合度）：价值观、工作风格与岗位要求的匹配度

## 录用建议标准
- strong_hire：各维度均优秀，建议优先录用
- hire：整体符合要求，建议录用
- maybe：部分能力达标但有明显短板，需要综合评估
- no_hire：核心能力不足或表现较差，不建议录用`;

function buildReportPrompt(
  jobRole: string,
  jdText: string,
  questions: InterviewQuestion[],
  answers: InterviewAnswer[],
  scores: QuestionScore[]
): string {
  const answerMap = Object.fromEntries(answers.map((a) => [a.questionId, a.answer]));
  const scoreMap = Object.fromEntries(scores.map((s) => [s.questionId, s]));

  const qaDetail = questions
    .map((q) => {
      const s = scoreMap[q.id];
      const a = answerMap[q.id];
      const starStr = s
        ? `S:${s.starAnalysis.situation} T:${s.starAnalysis.task} A:${s.starAnalysis.action} R:${s.starAnalysis.result}`
        : "未评分";
      return `【题${q.order}】${q.focusArea}（难度${q.difficulty}/5）
题目：${q.question}
回答摘要：${a ? a.slice(0, 300) + (a.length > 300 ? "..." : "") : "（未作答）"}
单题得分：${s ? `${s.score}/10（完整性${s.dimensions.completeness} 深度${s.dimensions.depth} 清晰度${s.dimensions.clarity} 相关性${s.dimensions.relevance}）` : "未评分"}
STAR分析：${starStr}`;
    })
    .join("\n\n");

  const avgScore =
    scores.length > 0
      ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
      : "N/A";

  return `请对以下整场面试进行综合评估，生成最终面试报告。

## 应聘岗位：${jobRole}
## 岗位JD
${jdText}

## 面试问答详情（共 ${questions.length} 题，已回答 ${answers.length} 题）
${qaDetail}

## 各题平均分：${avgScore}/10

## 报告生成要求
1. totalScore（综合分1-100）：不要简单取平均，要综合考量回答质量、能力覆盖面、一致性等
2. topStrengths：2-3条，必须引用具体面试表现，不要说空话
3. topWeaknesses：2-3条，诚实指出核心短板，帮助候选人认清差距
4. improvementPlan：3-5条具体可执行的提升建议（area + suggestion + priority）
5. nextSteps：2-3条候选人在求职过程中应该立即去做的事情

返回如下JSON（只返回JSON，不要有其他文字）：
{
  "totalScore": 68,
  "recommendation": "maybe",
  "summary": "候选人具备基础的产品思维，在用户调研和需求管理方面有一定实践经验，但整体回答偏概念化，缺乏量化数据支撑。核心竞争力不够突出，在同等条件的候选人中无明显差异化优势。",
  "dimensionScores": {
    "technicalDepth": 65,
    "expressionClarity": 72,
    "problemSolving": 60,
    "cultureFit": 70
  },
  "topStrengths": [
    "在第2题中给出了具体的用户调研案例，有明确的问题背景和行动步骤，展示了一定的用户同理心",
    "表达逻辑较清晰，能够按照结构化方式组织回答，面试者容易跟随"
  ],
  "topWeaknesses": [
    "6道题中有4道缺乏量化结果（STAR中R缺失），无法判断实际影响和贡献大小",
    "遇到深度追问时开始回避具体细节，说明部分经历存在夸大嫌疑或理解不深",
    "对岗位JD中强调的数据分析能力几乎没有主动提及相关经历"
  ],
  "improvementPlan": [
    {
      "area": "量化表达",
      "suggestion": "回顾每段经历，为每个成就补充至少一个数字（用户数/增长率/时间节省/成本降低等），没有精确数字可以用估算范围",
      "priority": "high"
    },
    {
      "area": "STAR答题结构",
      "suggestion": "练习用STAR结构回答每道行为题，重点强化Result部分。建议准备5个核心案例故事，每个都能回答10种不同维度的问题",
      "priority": "high"
    },
    {
      "area": "数据分析能力证明",
      "suggestion": "补充简历中的数据分析经历，或准备一个具体的数据驱动决策案例，说明用了什么工具、发现了什么洞察、影响了什么决策",
      "priority": "medium"
    }
  ],
  "nextSteps": [
    "整理并完善简历中所有经历的量化数据，确保每条经历都有可衡量的结果",
    "针对目标JD中的高频关键词，准备2-3个能直接回答的具体案例",
    "进行至少3次模拟面试，重点练习被追问时的深度展开能力"
  ]
}`;
}

function parseReport(raw: string): InterviewReport {
  const parsed = JSON.parse(raw);
  const clamp = (v: unknown, min = 0, max = 100): number => {
    const n = Number(v);
    return isNaN(n) ? 50 : Math.max(min, Math.min(max, n));
  };
  const validRecs = ["strong_hire", "hire", "maybe", "no_hire"];
  const dims = parsed.dimensionScores || {};

  return {
    totalScore: clamp(parsed.totalScore),
    recommendation: validRecs.includes(String(parsed.recommendation))
      ? (parsed.recommendation as InterviewReport["recommendation"])
      : "maybe",
    summary: String(parsed.summary || ""),
    dimensionScores: {
      technicalDepth: clamp(dims.technicalDepth),
      expressionClarity: clamp(dims.expressionClarity),
      problemSolving: clamp(dims.problemSolving),
      cultureFit: clamp(dims.cultureFit),
    },
    topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths.map(String) : [],
    topWeaknesses: Array.isArray(parsed.topWeaknesses) ? parsed.topWeaknesses.map(String) : [],
    improvementPlan: Array.isArray(parsed.improvementPlan)
      ? parsed.improvementPlan.map(
          (item: Record<string, unknown>): ImprovementItem => ({
            area: String(item.area || ""),
            suggestion: String(item.suggestion || ""),
            priority: ["high", "medium", "low"].includes(String(item.priority))
              ? (item.priority as ImprovementItem["priority"])
              : "medium",
          })
        )
      : [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : [],
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
// POST /api/interview/report
// body: { sessionId }

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId } = body as { sessionId: string };

  if (!sessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "面试 Session 不存在" }, { status: 404 });
  }

  // 如果报告已生成，直接返回缓存结果
  if (session.finalReport) {
    try {
      return NextResponse.json({
        report: JSON.parse(session.finalReport) as InterviewReport,
        cached: true,
      });
    } catch {
      // fall through to regenerate
    }
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

  if (questions.length === 0) {
    return NextResponse.json({ error: "尚无面试记录，无法生成报告" }, { status: 400 });
  }

  try {
    const prompt = buildReportPrompt(session.jobRole, session.jdText, questions, answers, scores);
    const raw = await chatCompletion(
      [
        { role: "system", content: REPORT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { json: true }
    );

    const report = parseReport(raw);

    // 保存报告，推进 session 到 complete
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        finalReport: JSON.stringify(report),
        phase: "complete",
      },
    });

    return NextResponse.json({ report, cached: false });
  } catch (err) {
    console.error("[interview/report]", err);
    return NextResponse.json({ error: "生成报告失败，请重试" }, { status: 500 });
  }
}
