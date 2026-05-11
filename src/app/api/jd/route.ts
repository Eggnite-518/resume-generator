import { NextRequest, NextResponse } from "next/server";
import { extractTextFromImage, chatCompletion } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const image = formData.get("image") as File | null;
  if (!image) return NextResponse.json({ error: "请上传图片" }, { status: 400 });

  const buffer = Buffer.from(await image.arrayBuffer());
  const base64 = buffer.toString("base64");

  try {
    const rawText = await extractTextFromImage(base64, image.type || "image/jpeg");

    // Clean and extract only JD-relevant content
    const cleanText = await chatCompletion([
      {
        role: "user",
        content: `以下是从图片中 OCR 识别出的文字，请提取其中与岗位招聘直接相关的内容，去除无关信息。

## 需要保留的内容
- 岗位名称 / 职位
- 工作职责 / 岗位职责
- 任职要求 / 岗位要求
- 技能要求
- 加分项 / 优先考虑
- 薪资范围（如有）
- 团队/业务背景（如有）

## 需要去除的内容
- 公司地址、工作地点详细描述
- 联系方式（邮箱、电话、微信）
- 福利待遇（五险一金、餐补等）
- 招聘流程说明
- 公司宣传/介绍（除非直接说明岗位背景）
- 广告性语言、无关装饰文字

## 原始文字
${rawText}

请直接输出清洗后的 JD 内容，保持结构清晰，不要添加任何解释或前缀。`,
      },
    ]);

    return NextResponse.json({ text: cleanText || rawText });
  } catch (err) {
    return NextResponse.json(
      { error: `图片识别失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
