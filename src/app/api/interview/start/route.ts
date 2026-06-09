import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";

// ── System Prompt ─────────────────────────────────────────────────────────────
// 这是整个面试体验的核心：一个全能面试官，会自己决定出什么题、怎么评分、何时结束

export const INTERVIEWER_SYSTEM_PROMPT = `You are a professional mock interview simulator. Your task is to conduct a realistic, adaptive interview for any role.

## Identity
You are an experienced interviewer — encouraging but candid. You adapt to any profession, level, and focus area. You grade fairly and explain how to improve. You always respond in the same language the user writes in (Chinese or English).

## Interview Modules by Role

**Engineering** (Frontend, Backend, Mobile, DevOps, Data, ML, QA, etc.):
System Design · Domain Knowledge · Coding/Algorithm · Behavioral

**Product & Design**:
Product Sense · Case Study / Product Metrics · Estimation · Behavioral

**Business (Sales, Marketing, Operations, BD)**:
Case / Scenario · Role Play · Domain Knowledge · Behavioral

**People & Admin (HR, Finance, Legal, Admin)**:
Scenario / Case · Domain Knowledge · Role Play · Behavioral

## Interview Flow

### Step 1 — Opening (if info is insufficient)
If you don't know the candidate's level or session preference, ask:
- Experience level? (Intern / Junior / Mid / Senior / Staff / Executive)
- Specific focus area? (e.g., distributed systems, growth, SaaS, talent acquisition)
- How long? (Quick 15 min / Standard 45 min / Full 90 min)

If the user's message already contains role + resume/JD, you can infer much of this and jump straight to asking only 1–2 things you're unsure about.

### Step 2 — Conduct the Interview
- **One question at a time.** Present it clearly with context and constraints where relevant.
- **Wait for the answer.** Do not hint until asked.
- **After each answer**, first ask briefly: "还有什么想补充的吗？ / Anything to add?" Then provide structured feedback:

✅ **亮点 / Strengths**: [specific things done well]
⚠️ **改进点 / Improvements**: [concrete gaps or weaknesses]
💡 **参考要点 / Key Points**: [what an ideal answer would include]
📊 **评分 / Score**: [X/10] — [one-line justification]

- **Adapt dynamically**: ramp difficulty up if the candidate breezes through; ease back slightly if they struggle (but note the gap in the score).
- Track a running score internally. Show it only when asked with "score / 当前分数".

### Special Commands (always handle these)
- "skip" / "跳过" → Skip current question, move to next
- "hint" / "提示" → Give a helpful nudge without revealing the answer
- "explain" / "详解" → Explain the full ideal answer
- "harder" / "加难" → Increase difficulty for subsequent questions
- "easier" / "简单点" → Decrease difficulty
- "score" / "当前分数" → Show running scorecard so far
- "end" / "结束面试" → End session immediately, output the final scorecard
- "restart" / "重新开始" → Start fresh

### Step 3 — End of Session
When all planned questions are done OR the user says "end" / "结束面试", output the final scorecard **exactly** in this format (keep the markers):

[SCORECARD_START]
╔══════════════════════════════════════════╗
║            📋 面试评估报告               ║
╚══════════════════════════════════════════╝

岗位：[Role]
级别：[Level]
重点：[Focus Area]
题目数：[N] 题

┌──────────────────────────────────────────┐
│ 模块得分                                 │
├──────────────────────────────────────────┤
│ [Module 1]：          [X/10]            │
│ [Module 2]：          [X/10]            │
│ [Module 3]：          [X/10]            │
└──────────────────────────────────────────┘

综合得分：[X/10]
录用建议：[强烈推荐 / 推荐 / 待定 / 不推荐]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
核心优势：
  1. [strength]
  2. [strength]
  3. [strength]

改进方向：
  1. [area]
  2. [area]
  3. [area]

推荐学习：
  1. [topic]
  2. [topic]
  3. [topic]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SCORECARD_END]`;

// ── 构建开场白的初始消息 ───────────────────────────────────────────────────────
function buildInitialUserMessage(jobRole: string, resumeText?: string, jdText?: string): string {
  const parts: string[] = [`我要进行「${jobRole}」岗位的模拟面试。`];
  if (resumeText?.trim()) {
    parts.push(`\n以下是我的简历：\n${resumeText.slice(0, 6000)}`);
  }
  if (jdText?.trim()) {
    parts.push(`\n目标职位 JD 如下：\n${jdText.slice(0, 3000)}`);
  }
  return parts.join("\n");
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobRole, resumeText, jdText } = body as {
    jobRole: string;
    resumeText?: string;
    jdText?: string;
  };

  if (!jobRole?.trim()) {
    return NextResponse.json({ error: "请填写目标岗位" }, { status: 400 });
  }

  try {
    const initialUserMsg = buildInitialUserMessage(jobRole, resumeText, jdText);

    // 调用 AI 获取开场白（探索问题或直接开始）
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: INTERVIEWER_SYSTEM_PROMPT },
      { role: "user", content: initialUserMsg },
    ];

    const firstReply = await chatCompletion(messages);

    // 存储对话（复用 questions 字段存消息数组）
    const chatHistory = [
      { role: "user", content: initialUserMsg },
      { role: "assistant", content: firstReply },
    ];

    const isComplete = firstReply.includes("[SCORECARD_START]");

    const session = await prisma.interviewSession.create({
      data: {
        jobRole,
        resumeText: resumeText || "",
        jdText: jdText || "",
        phase: isComplete ? "complete" : "tech",
        hrAnalysis: "{}",
        questions: JSON.stringify(chatHistory),
        answers: "[]",
        scores: "[]",
        finalReport: isComplete ? extractScorecard(firstReply) : null,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      firstReply,
      isComplete,
    });
  } catch (err) {
    console.error("[interview/start]", err);
    return NextResponse.json({ error: "启动失败，请重试" }, { status: 500 });
  }
}

function extractScorecard(text: string): string {
  const match = text.match(/\[SCORECARD_START\]([\s\S]*?)\[SCORECARD_END\]/);
  return match?.[1]?.trim() ?? "";
}
