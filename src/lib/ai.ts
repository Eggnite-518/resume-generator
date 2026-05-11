import OpenAI from "openai";
import { prisma } from "./db";

async function getApiConfig(): Promise<{ apiKey: string; baseURL?: string; model: string; visionModel: string }> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["api_key", "base_url", "model", "vision_model"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    apiKey: map.api_key || "",
    baseURL: map.base_url || undefined,
    model: map.model || "gpt-4o",
    visionModel: map.vision_model || map.model || "gpt-4o",
  };
}

export async function getOpenAIClient() {
  const config = await getApiConfig();
  return {
    client: new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    }),
    model: config.model,
    visionModel: config.visionModel,
  };
}

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: { json?: boolean; stream?: boolean }
): Promise<string> {
  const { client, model } = await getOpenAIClient();

  const response = await client.chat.completions.create({
    model,
    messages,
    response_format: options?.json ? { type: "json_object" } : undefined,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "";
}

export async function extractTextFromImage(base64Image: string, mimeType: string): Promise<string> {
  const { client, visionModel } = await getOpenAIClient();

  const response = await client.chat.completions.create({
    model: visionModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          {
            type: "text",
            text: "请提取图片中的所有文字内容，保持原有格式，不要添加任何解释或额外内容。",
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content || "";
}
