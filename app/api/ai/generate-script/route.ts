import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { trendName, trendContext } = await req.json();

  // This uses Gemini 2.0 Flash for speed and cost-efficiency
  const result = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: z.object({
      hook: z.string().describe("A high-retention opening line for a short-form video"),
      scriptBody: z.string().describe("The main content of the script avoiding 'cringe' corporate speak"),
      visualCues: z.array(z.string()).describe("Descriptions of what should be on screen"),
      callToAction: z.string(),
      authenticityTips: z.string().describe("Why this script works for Gen Z"),
    }),
    prompt: `Act as a Gen Z creative director. 
             Create a 15-second TikTok/Reel script for the trend: "${trendName}".
             Context: ${trendContext}. 
             Ensure the tone is authentic, effortless, and stays away from over-explaining.`,
  });

  return Response.json(result.object);
}