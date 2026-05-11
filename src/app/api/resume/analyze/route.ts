import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import { parseTags } from "@/lib/utils";

export interface CoreCompetency {
  id: string;
  name: string;
  requirement: string;
  level: "必须" | "加分";
  matchedExpIds: string[];
  coverage: "covered" | "partial" | "missing";
  matchReason: string; // 匹配依据：从经历的哪些内容判断出覆盖了此能力
  guideQuestions: string[];
}

export interface ExpOptimized {
  expId: string;
  optimizedDescription: string;
  coveredCompetencyIds: string[];
}

export interface AnalysisResult {
  overallScore: number;
  competencies: CoreCompetency[];
  expOptimized: ExpOptimized[];
}

const toArr = (v: unknown): string[] =>
  Array.isArray(v) ? (v as string[]) : typeof v === "string" && v ? [v] : [];

function normalizeCompetency(c: Record<string, unknown>): CoreCompetency {
  return {
    id: String(c.id || ""),
    name: String(c.name || ""),
    requirement: String(c.requirement || ""),
    level: c.level === "加分" ? "加分" : "必须",
    matchedExpIds: toArr(c.matchedExpIds),
    coverage: ["covered", "partial", "missing"].includes(String(c.coverage))
      ? (c.coverage as CoreCompetency["coverage"])
      : "missing",
    matchReason: String(c.matchReason || ""),
    guideQuestions: toArr(c.guideQuestions),
  };
}

// ── Stage 1: Decompose JD into competency dimensions (~5-8s) ──────────────────
async function stageDecompose(jdText: string): Promise<{ competencies: CoreCompetency[] }> {
  const prompt = `你是一名资深职业顾问。请从以下岗位JD中提炼核心能力维度。

## 岗位 JD
${jdText}

请将JD中所有的要求逐条提炼为能力维度，不得遗漏任何一条要求。

## 提炼规则
- **不限条数**，JD 里有多少要求就提炼多少条，通常 5-10 条
- **不得合并**：不同类型的要求（如「技能」和「行业背景」）必须单独列出
- **必须包含以下类型**（只要JD中有提及）：
  - 专业技能（产品/设计/研发等）
  - 行业背景与领域知识（如「了解教育行业」「有医疗行业经验」）
  - 工具使用经验（Figma、Axure等）
  - 软性能力（沟通、跨部门协作等）
  - 经历/背景要求（如「有ToB产品经验」「使用过某类产品」）
  - 加分项（明确标注为「优先」「加分」「优秀」的要求）
- level：JD 中明确说「优先」「加分」「plus」的填「加分」，其余均填「必须」

返回如下JSON（只返回JSON，不要有其他文字）：
{
  "competencies": [
    {
      "id": "comp_1",
      "name": "产品规划与需求管理",
      "requirement": "能独立完成需求调研、PRD撰写和优先级管理",
      "level": "必须"
    },
    {
      "id": "comp_2",
      "name": "教育行业背景",
      "requirement": "对教育行业有一定了解，或有教育类产品的使用/研究经历",
      "level": "加分"
    }
  ]
}`;

  const result = await chatCompletion([{ role: "user", content: prompt }], { json: true });
  const parsed = JSON.parse(result);
  const competencies: CoreCompetency[] = (parsed.competencies || []).map(
    (c: Record<string, unknown>) => ({
      ...normalizeCompetency(c),
      matchedExpIds: [],
      coverage: "missing" as const,
      matchReason: "",
      guideQuestions: [],
    })
  );
  return { competencies };
}

// ── Stage 2: Match experiences and generate optimized descriptions (~30-60s) ──
async function stageMatch(
  jdText: string,
  competencies: CoreCompetency[],
  expListText: string
): Promise<AnalysisResult> {
  const compList = competencies
    .map((c) => `id:${c.id} | ${c.name}（${c.level}）: ${c.requirement}`)
    .join("\n");

  const prompt = `你是一名资深职业顾问。请对照经历库，分析候选人对各核心能力的覆盖情况，并生成优化后的经历描述。

## 岗位 JD
${jdText}

## 已提炼的核心能力维度
${compList}

## 候选人经历库
${expListText}

请返回如下JSON（只返回JSON，不要有其他文字）：
{
  "competencies": [
    {
      "id": "comp_1",
      "matchedExpIds": ["经历id1"],
      "coverage": "covered",
      "matchReason": "在「产品经理@杭州私默科技」的描述中，明确提到「撰写8000+字结构化PRD，定义3大模块20+功能点并完成优先级排序」，直接证明了需求管理和文档能力。",
      "guideQuestions": []
    },
    {
      "id": "comp_2",
      "matchedExpIds": ["经历id1"],
      "coverage": "partial",
      "matchReason": "经历描述中提到「建立数据看板」和「用户满意度达90%」，有数据意识和结果导向，但未说明具体分析方法或决策过程。",
      "guideQuestions": ["你在产品决策中具体用过哪些数据分析方法？", "能举一个用数据推翻直觉判断的案例吗？"]
    },
    {
      "id": "comp_3",
      "matchedExpIds": [],
      "coverage": "missing",
      "matchReason": "经历库中所有描述均未提及ToB客户服务、企业级产品交付或相关场景，无法判断为覆盖。",
      "guideQuestions": ["你有没有服务企业客户的项目经历，哪怕是内部工具或外包项目？"]
    }
  ],
  "expOptimized": [
    {
      "expId": "经历id1",
      "coveredCompetencyIds": ["comp_1", "comp_2"],
      "optimizedDescription": "• 负责XX产品需求规划与PRD撰写，将零散需求结构化，覆盖3大模块20+核心功能\\n• 建立数据看板，用户满意度提升至90%"
    }
  ]
}

## 要求

### coverage 判断规则（严格执行）
- **covered**：经历描述中有**明确的原文**（具体事件、成果、工具、行业名称等）能直接证明该能力，不得基于职位名称或行业推断
- **partial**：经历中有相关线索但不充分，或只能间接推断
- **missing**：经历库中找不到任何能直接引用的具体内容，**必须填 missing，不得脑补或推断**

### matchReason 写法规则（严格执行）
- **必须引用经历原文**：用「」括号摘录经历描述中支持判断的具体词句，格式：「原文片段」
- **covered 示例**："在「产品经理@杭州私默科技」的描述中，明确提到「撰写8000+字结构化PRD，定义3大模块20+功能点」，直接证明需求管理和文档能力。"
- **partial 示例**："经历中提到「建立数据看板」和「用户满意度90%」，有数据意识，但未说明具体分析方法。"
- **missing 示例**："经历库中所有描述均未提及教育行业相关工作或产品使用经历，无法判断为覆盖。"
- ❌ **禁止**：matchReason 直接改写 JD 要求句（如"在XX领域有实际工作经验"）作为匹配依据——这不是证据

### 其他要求
- guideQuestions：partial时2-3个，missing时1-2个，covered时为[]，问题要具体可回答
- optimizedDescription：结合JD关键词重写，每条经历只写2-3个bullet，每个bullet是**一句完整的话**，结构为「行动动词+做了什么，背景规模/方法，量化结果」，bullet之间用\\n分隔，格式为"• 内容"。不要把一段描述拆成多个碎句，每个bullet必须同时包含行动和结果两个要素，优先保留量化数据。示例："• 主导掌上工作日志全生命周期管理，撰写8000+字PRD定义20+功能点，上线后用户满意度达90%。"`;

  const result = await chatCompletion([{ role: "user", content: prompt }], { json: true });
  const parsed = JSON.parse(result);

  // Merge match results back into full competency objects
  const matchMap: Record<string, Partial<CoreCompetency>> = {};
  for (const c of parsed.competencies || []) {
    matchMap[String(c.id)] = {
      matchedExpIds: toArr(c.matchedExpIds),
      coverage: ["covered", "partial", "missing"].includes(String(c.coverage))
        ? (c.coverage as CoreCompetency["coverage"])
        : "missing",
      matchReason: String(c.matchReason || ""),
      guideQuestions: toArr(c.guideQuestions),
    };
  }

  const mergedCompetencies = competencies.map((comp) => ({
    ...comp,
    ...(matchMap[comp.id] || {}),
  }));

  // Calculate score deterministically from coverage results:
  // - covered must-have: 100pts, covered bonus: 60pts
  // - partial must-have: 50pts, partial bonus: 30pts
  // - missing: 0pts
  let totalWeight = 0;
  let earnedScore = 0;
  for (const c of mergedCompetencies) {
    const isMust = c.level === "必须";
    const weight = isMust ? 2 : 1;
    totalWeight += weight * 100;
    if (c.coverage === "covered") earnedScore += weight * 100;
    else if (c.coverage === "partial") earnedScore += weight * 50;
  }
  const overallScore = totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 0;

  return {
    overallScore,
    competencies: mergedCompetencies,
    expOptimized: (parsed.expOptimized || []).map((e: Record<string, unknown>) => ({
      expId: String(e.expId || ""),
      optimizedDescription: String(e.optimizedDescription || ""),
      coveredCompetencyIds: toArr(e.coveredCompetencyIds),
    })),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jdText, stage, competencies: incomingComps } = body as {
    jdText: string;
    stage?: "decompose" | "match";
    competencies?: CoreCompetency[];
  };

  if (!jdText?.trim()) {
    return NextResponse.json({ error: "请提供岗位 JD" }, { status: 400 });
  }

  try {
    // Stage 1: just decompose JD into competency dimensions
    if (stage === "decompose") {
      const result = await stageDecompose(jdText);
      return NextResponse.json(result);
    }

    // Stage 2: match experiences + generate optimized descriptions
    // (also handles legacy single-call with no stage param)
    const experiences = await prisma.experience.findMany({ orderBy: { createdAt: "desc" } });
    if (experiences.length === 0) {
      return NextResponse.json({ error: "经历库为空" }, { status: 400 });
    }

    const expListText = experiences
      .map((e) => {
        const tags = parseTags(e.tags);
        const proj = (e as typeof e & { projectName?: string | null }).projectName;
        return `id:${e.id} | 类型:${e.type} | 标题:${e.title}${e.organization ? ` @ ${e.organization}` : ""}${proj ? ` [${proj}]` : ""}
描述：${e.description || "（无描述）"}
标签：${tags.join("、") || "无"}`;
      })
      .join("\n\n---\n\n");

    // If competencies were passed in (two-stage flow), use them; otherwise run decompose first
    let comps = incomingComps;
    if (!comps?.length) {
      const decomposed = await stageDecompose(jdText);
      comps = decomposed.competencies;
    }

    const analysis = await stageMatch(jdText, comps, expListText);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: "AI 分析失败，请重试" }, { status: 500 });
  }
}
