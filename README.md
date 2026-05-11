# 简历快速生成器

AI 驱动的本地简历生成工具。上传经历库，粘贴 JD，一键生成匹配的 Word 简历。

## 快速开始

### 1. 启动

```bash
npm run dev
```

然后在浏览器打开 http://localhost:3000

### 2. 配置 API Key

访问 **设置** 页面，填写你的 API Key。

支持：
- OpenAI（gpt-4o 等）
- DeepSeek（https://api.deepseek.com/v1）
- 通义千问（https://dashscope.aliyuncs.com/compatible-mode/v1）
- 任何兼容 OpenAI 格式的接口

### 3. 使用流程

1. **个人信息** - 填写姓名、联系方式（会出现在简历顶部）
2. **经历库** - 添加你的所有经历（工作/项目/教育/技能）
3. **生成简历** - 粘贴岗位 JD，AI 自动匹配并生成
4. **编辑导出** - 在线编辑，或用 AI 微调，满意后导出 Word

## 功能

### 经历库录入
- **自由文本**：随便写，AI 自动整理成结构化条目
- **文件导入**：上传已有的 PDF / Word 简历，AI 拆分提取
- **AI 引导**：AI 对话引导你把经历说清楚，自动补全

### JD 输入
- 直接粘贴文本
- 上传截图，AI 识别文字（需要 Vision 能力的模型）

### 简历生成
- AI 从经历库中挑选最匹配的 2-3 条经历
- 根据 JD 关键词调整描述语言
- 支持三套 Word 模板：经典 / 现代 / 紧凑

### 编辑与导出
- 网页内直接编辑所有字段
- AI 对话微调（「让第一段更简洁」「补充量化数据」）
- 一键导出 `.docx`，支持 Word / WPS 打开编辑

## 数据存储

所有数据存储在本地 `prisma/dev.db`（SQLite 文件），无需网络，隐私安全。

## 技术栈

- Next.js 16 (App Router)
- Prisma + SQLite
- OpenAI SDK
- docx（Word 生成）
- pdf-parse + mammoth（文件解析）
- Tailwind CSS
