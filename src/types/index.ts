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
