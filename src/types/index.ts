export type ExperienceType = "work" | "education" | "project" | "skill" | "award" | "other";

export interface ExperienceData {
  id: string;
  type: ExperienceType;
  title: string;
  organization?: string | null;
  projectName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description: string;
  tags: string[];
  rawInput?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  summary?: string | null;
}

export interface ResumeContent {
  personalInfo: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    summary?: string;
    photo?: string; // base64 data URL
  };
  sections: ResumeSection[];
}

export interface ResumeSection {
  id: string;
  type: ExperienceType | "custom";
  title: string;
  items: ResumeSectionItem[];
}

export interface ResumeSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  projectName?: string;
  dateRange?: string;
  bullets: string[];
}

export interface ResumeData {
  id: string;
  title: string;
  jdText: string;
  content: ResumeContent;
  template: "classic" | "modern" | "compact";
  usedExpIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const EXPERIENCE_TYPE_LABELS: Record<ExperienceType, string> = {
  work: "工作经历",
  education: "教育背景",
  project: "项目经历",
  skill: "技能特长",
  award: "荣誉奖项",
  other: "其他",
};

// ── Interview Types ────────────────────────────────────────────────────────────

export type InterviewPhase = "hr" | "tech" | "complete";

export type QuestionType = "behavioral" | "technical" | "scenario" | "situational";

export interface GapItem {
  area: string;       // 漏洞所属维度，如"量化成果"
  issue: string;      // 具体问题描述
  severity: "high" | "medium" | "low";
}

export interface HrAnalysis {
  strengths: string[];       // 简历亮点（2-4条）
  gaps: GapItem[];           // 简历漏洞
  riskAreas: string[];       // 面试官预计重点挑战的领域
  overallImpression: string; // 对候选人的整体印象（1-2句）
}

export interface InterviewQuestion {
  id: string;
  order: number;
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  focusArea: string;   // 考察维度，如"跨部门协作能力"
  question: string;    // 面试题正文
  intent: string;      // 出题意图（面试官视角，不展示给用户）
  followUps: string[]; // 可能的追问
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  answeredAt: string;
}

export interface StarAnalysis {
  situation: boolean; // 是否描述了背景/情境
  task: boolean;      // 是否说明了任务/目标
  action: boolean;    // 是否描述了具体行动
  result: boolean;    // 是否给出了量化结果
}

export interface QuestionScore {
  questionId: string;
  score: number; // 1-10
  dimensions: {
    completeness: number; // 答题完整性 1-10
    depth: number;        // 深度与专业性 1-10
    clarity: number;      // 表达清晰度 1-10
    relevance: number;    // 与岗位相关性 1-10
  };
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  starAnalysis: StarAnalysis;
}

export interface ImprovementItem {
  area: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

export interface InterviewReport {
  totalScore: number; // 综合分 1-100
  recommendation: "strong_hire" | "hire" | "maybe" | "no_hire";
  summary: string;
  dimensionScores: {
    technicalDepth: number;    // 专业深度
    expressionClarity: number; // 表达清晰度
    problemSolving: number;    // 问题解决能力
    cultureFit: number;        // 岗位契合度
  };
  topStrengths: string[];
  topWeaknesses: string[];
  improvementPlan: ImprovementItem[];
  nextSteps: string[];
}

export interface InterviewSessionData {
  id: string;
  jobRole: string;
  resumeText: string;
  jdText: string;
  phase: InterviewPhase;
  hrAnalysis: HrAnalysis | null;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  scores: QuestionScore[];
  finalReport: InterviewReport | null;
  createdAt: string;
  updatedAt: string;
}
