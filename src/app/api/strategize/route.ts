import { NextRequest, NextResponse } from "next/server";
import { scrapeLiveMatch } from "@/lib/tools";
import { extractMatchStateFromText, runMultiAgentDebate } from "@/lib/agents";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, manualState } = body;

    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is missing in your environment setup.",
          setupRequired: true,
          message: "Please open `.env.local` in the root folder, add your Google Gemini API key: `GEMINI_API_KEY=your_key_here`, and restart the dev server."
        },
        { status: 400 }
      );
    }

    let matchState = manualState;

    // If URL is provided, scrape and extract state
    if (url) {
      const scrapeResult = await scrapeLiveMatch(url);
      if (!scrapeResult.success || !scrapeResult.scrapedData) {
        return NextResponse.json(
          { error: `Scraping failed: ${scrapeResult.error || "Unknown error"}` },
          { status: 400 }
        );
      }

      try {
        matchState = await extractMatchStateFromText(
          scrapeResult.scrapedData.rawText,
          scrapeResult.scrapedData.title
        );
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to extract match state from URL: ${err.message || err}` },
          { status: 500 }
        );
      }
    }

    if (!matchState) {
      return NextResponse.json(
        { error: "No match state provided. Please enter details manually or paste a live URL." },
        { status: 400 }
      );
    }

    // Run the multi-agent debate loop
    const debateResult = await runMultiAgentDebate(matchState);

    return NextResponse.json({ success: true, ...debateResult });
  } catch (error: any) {
    console.error("API error in strategize route:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred during tactical simulation" },
      { status: 500 }
    );
  }
}
