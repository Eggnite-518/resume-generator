import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/parsers";

// POST /api/interview/parse-resume
// 仅解析文件并返回纯文本，不写入数据库

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(buffer, file.type, file.name);

    if (!text.trim()) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    return NextResponse.json({ text: text.slice(0, 12000) });
  } catch (err) {
    return NextResponse.json(
      { error: `解析失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 400 }
    );
  }
}
