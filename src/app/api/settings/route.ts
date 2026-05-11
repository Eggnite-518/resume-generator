import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  if (map.api_key) {
    map.api_key_masked = map.api_key.slice(0, 8) + "..." + map.api_key.slice(-4);
    delete map.api_key;
  }
  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { api_key, base_url, model, vision_model } = body;

  const upserts = [];
  if (api_key !== undefined && api_key !== "") {
    upserts.push(
      prisma.setting.upsert({ where: { key: "api_key" }, update: { value: api_key }, create: { key: "api_key", value: api_key } })
    );
  }
  if (base_url !== undefined) {
    upserts.push(
      prisma.setting.upsert({ where: { key: "base_url" }, update: { value: base_url }, create: { key: "base_url", value: base_url } })
    );
  }
  if (model !== undefined) {
    upserts.push(
      prisma.setting.upsert({ where: { key: "model" }, update: { value: model }, create: { key: "model", value: model } })
    );
  }
  if (vision_model !== undefined) {
    upserts.push(
      prisma.setting.upsert({ where: { key: "vision_model" }, update: { value: vision_model }, create: { key: "vision_model", value: vision_model } })
    );
  }

  await prisma.$transaction(upserts);
  return NextResponse.json({ success: true });
}
