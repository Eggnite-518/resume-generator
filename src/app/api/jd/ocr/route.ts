import { NextRequest, NextResponse } from "next/server";
import { extractTextFromImage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const image = formData.get("image") as File | null;
  if (!image) return NextResponse.json({ error: "请上传图片" }, { status: 400 });

  const buffer = Buffer.from(await image.arrayBuffer());
  const base64 = buffer.toString("base64");

  try {
    const rawText = await extractTextFromImage(base64, image.type || "image/jpeg");
    return NextResponse.json({ rawText });
  } catch (err) {
    return NextResponse.json(
      { error: `图片识别失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
