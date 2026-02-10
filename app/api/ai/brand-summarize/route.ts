import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openaiKey = process.env.OPENAI_API_KEY || '';

export async function POST(req: Request) {
    try {
        const { brandData } = await req.json();
        if (!brandData) {
            return NextResponse.json({ error: "Brand data is required" }, { status: 400 });
        }
        if (!openaiKey) return NextResponse.json({ error: "OpenAI API Key missing" }, { status: 500 });

        const openai = new OpenAI({ apiKey: openaiKey });

        const instructions = `
            Task: Generate a high-density, granular "Master Strategic Brief" for the ${brandData.entity_type}. This document will serve as the primary source of truth for downstream AI agents (Trend Radar, Content Producer, Orchestrator).
            
            Context (Raw DNA):
            ${JSON.stringify(brandData, null, 2)}
            
            Objective:
            Create a comprehensive, structured report that distills EVERY field from the data above. Be surgical and precise. Do NOT skip any field — if a field is empty, note it as "Not specified" rather than omitting it.

            Structure the output using this hierarchy:

            1. STRATEGIC CORE:
            - Company/Creator Name and Profile Title.
            - Entity Type: ${brandData.entity_type}
            - Industry/Niche: ${brandData.industry || 'N/A'}
            - Tagline: ${brandData.tagline || 'N/A'}
            - Mission: ${brandData.mission_brief || 'N/A'}
            - Brand Positioning: ${brandData.positioning || 'N/A'} — What unique space does this brand own?
            ${brandData.entity_type === 'creator' ? `
            - Creator Stage: ${brandData.creator_stage || 'N/A'} — Map current growth phase implications.
            - Prime Objectives: Short and long-term goals.
            ` : `
            - Mission & Vision: Core reason for existence and future state.
            - Vision: ${brandData.vision || 'N/A'}
            `}
            - Archetype (The "Soul"): ${brandData.archetype || 'N/A'} — Character type and core values.
            - Brand Values: ${JSON.stringify(brandData.values || [])}
            - Brand Personality Traits: ${JSON.stringify(brandData.personality || [])}

            2. LINGUISTIC DNA (Communication Protocol):
            - Tone of Voice: ${brandData.tone_voice || 'N/A'}
            - Custom Tone Instructions: ${brandData.tone_extra_instructions || 'None'}
            - Voice Traits: ${JSON.stringify(brandData.voice_traits || [])} — Specific adjectives defining the voice.
            - Language Style: ${brandData.language_style || 'N/A'} — Formal, casual, street, academic, etc.
            - Vocabulary (DO Say): ${JSON.stringify(brandData.do_say || [])} — Words/phrases to actively use.
            - Vocabulary (DON'T Say): ${JSON.stringify(brandData.dont_say || [])} — Words/phrases that are forbidden.
            ${brandData.entity_type === 'creator' ? `
            - Humor Style: ${brandData.humor_style || 'N/A'}
            - Catchphrases/Signatures: ${JSON.stringify(brandData.catchphrases || [])}
            ` : ''}
            - Slang Level: ${brandData.slang_level}/5 — How much informal language is acceptable.
            - Emoji Usage: ${brandData.emoji_usage}/3 — How liberally emojis should be used.

            3. AUDIENCE INTELLIGENCE:
            - Target Audience Description: ${brandData.target_audience || 'N/A'}
            - Target Age Groups: ${JSON.stringify(brandData.target_age_groups || [])}
            - Audience Persona Name: ${brandData.persona_name || 'N/A'} — The avatar representing the ideal viewer.
            - Awareness Level: ${brandData.awareness_level || 'N/A'} — How familiar the audience is with the brand/niche.
            - Audience Pain Points: ${JSON.stringify(brandData.pain_points || [])} — What keeps them up at night?
            - Common Objections: ${JSON.stringify(brandData.objections || [])} — Why they might NOT engage.
            - Content They Skip: ${JSON.stringify(brandData.content_they_skip || [])} — Formats/topics the audience ignores.
            Synthesize these into a psychological profile of the ideal viewer.

            4. SAFETY & CONSTRAINTS (NON-NEGOTIABLE):
            ${brandData.entity_type === 'creator' ? `
            - Personal Boundaries: ${JSON.stringify(brandData.personal_boundaries || [])} — Private topics strictly off-limits.
            ` : `
            - Sensitive Topics: ${JSON.stringify(brandData.sensitive_topics || [])} — Topics requiring careful handling.
            `}
            - Banned Topics/Claims: ${JSON.stringify(brandData.banned_topics || [])} — Non-negotiable red lines. NEVER suggest content touching these.
            - Legal Constraints: ${JSON.stringify(brandData.legal_constraints || [])} — Regulatory or legal restrictions on content.
            List these explicitly so downstream agents can enforce them as hard rules.

            5. VISUAL & AESTHETIC IDENTITY:
            - Visual Aesthetic / Mood: ${brandData.visual_aesthetic || 'N/A'}
            ${brandData.entity_type === 'creator' ? `
            - On-Screen Presence: ${brandData.on_screen_presence || 'N/A'} — How they appear on camera.
            ` : ''}
            - Visual References: ${JSON.stringify(brandData.visual_refs || [])} — Inspirational visual styles.
            - Visual No-Gos: ${JSON.stringify(brandData.no_go_visuals || [])} — Visual styles to avoid.

            6. COMPETITIVE LANDSCAPE:
            - Direct Competitors: ${JSON.stringify(brandData.competitors || [])} — Brands/creators in the same space.
            - Preferred Brand Collaboration Types: ${JSON.stringify(brandData.preferred_brand_types || [])}
            - Content Samples Provided: ${(brandData.content_samples || []).length > 0 ? 'Yes — analyze for patterns.' : 'None provided.'}
            - Product/Service Analysis: ${(brandData.product_analysis || []).length > 0 ? 'Yes — extract key product positioning themes.' : 'None provided.'}
            Social Links: ${JSON.stringify(brandData.social_links || {})}

            ${brandData.entity_type === 'creator' ? `
            7. MONETIZATION & OUTPUT (Creator):
            - Content Pillars: ${JSON.stringify(brandData.content_pillars || [])} — Core topics and their objectives.
            - Offers & IP: ${JSON.stringify(brandData.offers || [])} — Active products, services, or monetization hooks.
            ` : ''}

            FINAL REQUIREMENTS:
            - Include detail from EVERY section above. Empty fields should be noted as "Not specified."
            - Use technical, professional, yet character-driven language.
            - This summary will be used by AI agents to filter trends, generate content, and deploy strategies — precision matters.
        `;


        const response = await (openai as any).responses.create({
            model: "gpt-5",
            input: [
                {
                    role: "system",
                    content: "You are the Verity Strategic Architect. Your task is to distill brand DNA into a compressed intelligence summary."
                },
                {
                    role: "user",
                    content: instructions
                }
            ]
        });

        const summary = response.output_text || "";

        return NextResponse.json({ summary });

    } catch (error: any) {
        console.error("BRAND_SUMMARIZE_ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
