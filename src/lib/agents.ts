import { GoogleGenAI } from "@google/genai";
import { MatchState, getVenueWeatherAndStats, calculateWinProbability } from "./tools";

// Helper to get Gemini client lazily, avoiding build-time warnings
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure it in your .env.local file.");
  }
  return new GoogleGenAI({ apiKey });
}

export interface Fielder {
  name: string;
  x: number; // -100 (extreme left/leg side) to 100 (extreme right/off side)
  y: number; // -100 (deep down ground/bowler) to 100 (behind keeper)
  description: string;
}

export interface AgentMessage {
  agentName: string;
  roleName: string;
  content: string;
  timestamp: string;
}

export interface DebateResult {
  matchState: MatchState;
  venueInfo: any;
  winProbabilityBefore: any;
  winProbabilityAfter: any;
  dataGuruReport: string;
  initialPlan: {
    decision: string;
    explanation: string;
    fielders: Fielder[];
  };
  dissent: {
    criticism: string;
    alternativeProposal: string;
  };
  finalDecision: {
    decision: string;
    explanation: string;
    fielders: Fielder[];
    confidenceScore: number; // 0 - 100
  };
  commentary: string;
  debateHistory: AgentMessage[];
}

// Helper to extract MatchState from raw HTML/Text scraped from Cricbuzz/ESPN
export async function extractMatchStateFromText(rawText: string, title: string): Promise<MatchState> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Please set it in your .env.local file.");
  }

  const prompt = `You are a cricket data extraction expert. Below is the raw text scraped from a live cricket match webpage (Title: "${title}"). 
Extract the current live state of the match into the requested JSON schema.
If some fields (like non-striker runs, bowler overs, or remaining bowlers) are missing, make a reasonable estimate based on the text context, or leave them empty/default.
If this is the 1st innings, do NOT include target or requiredRunRate. If it is the 2nd innings, target and requiredRunRate are MANDATORY.
Determine if the match is in Powerplay (overs 1-6), Middle Overs (7-15), or Death Overs (16-20).

Raw Text Content:
${rawText.substring(0, 6000)}`;

  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You extract structured cricket scoreboard data from raw scraped text. Be extremely accurate.",
      responseSchema: {
        type: "OBJECT",
        properties: {
          innings: { type: "INTEGER", description: "1 or 2" },
          over: { type: "INTEGER", description: "Completed overs (e.g. 14 for 14.2)" },
          ball: { type: "INTEGER", description: "Current ball of the over (0 to 6)" },
          score: { type: "INTEGER", description: "Current batting team runs" },
          wickets: { type: "INTEGER", description: "Current wickets fallen" },
          battingTeam: { type: "STRING" },
          bowlingTeam: { type: "STRING" },
          striker: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              runs: { type: "INTEGER" },
              balls: { type: "INTEGER" }
            },
            required: ["name"]
          },
          nonStriker: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              runs: { type: "INTEGER" },
              balls: { type: "INTEGER" }
            },
            required: ["name"]
          },
          currentBowler: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              overs: { type: "NUMBER" },
              runs: { type: "INTEGER" },
              wickets: { type: "INTEGER" }
            },
            required: ["name"]
          },
          bowlersRemaining: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                oversUsed: { type: "NUMBER" },
                maxOvers: { type: "INTEGER" }
              },
              required: ["name", "oversUsed"]
            }
          },
          pitchConditions: { type: "STRING", description: "turning, flat, two-paced, or green" },
          dewFactor: { type: "STRING", description: "None, Light, or Heavy" },
          venue: { type: "STRING" },
          target: { type: "INTEGER" },
          requiredRunRate: { type: "NUMBER" },
          impactPlayerAvailable: { type: "BOOLEAN" },
          powerplayContext: { type: "STRING", description: "Powerplay, Middle Overs, or Death Overs" }
        },
        required: ["innings", "over", "ball", "score", "wickets", "battingTeam", "bowlingTeam", "striker", "nonStriker", "currentBowler", "venue"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini extraction failed to return content.");
  }
  
  const parsed = JSON.parse(text);
  // Ensure default values are clean
  return {
    innings: parsed.innings === 2 ? 2 : 1,
    over: parsed.over || 0,
    ball: parsed.ball || 0,
    score: parsed.score || 0,
    wickets: parsed.wickets || 0,
    battingTeam: parsed.battingTeam || "Batting Team",
    bowlingTeam: parsed.bowlingTeam || "Bowling Team",
    striker: parsed.striker || { name: "Batsman 1", runs: 0, balls: 0 },
    nonStriker: parsed.nonStriker || { name: "Batsman 2", runs: 0, balls: 0 },
    currentBowler: parsed.currentBowler || { name: "Bowler", overs: 0, runs: 0, wickets: 0 },
    bowlersRemaining: parsed.bowlersRemaining || [],
    pitchConditions: parsed.pitchConditions || "flat",
    dewFactor: parsed.dewFactor || "None",
    venue: parsed.venue || "Wankhede",
    target: parsed.target,
    requiredRunRate: parsed.requiredRunRate,
    impactPlayerAvailable: parsed.impactPlayerAvailable ?? true,
    powerplayContext: parsed.powerplayContext || "Middle Overs"
  };
}

// 4. Main Multi-Agent Loop
export async function runMultiAgentDebate(matchState: MatchState): Promise<DebateResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Please configure it in your .env.local file.");
  }

  const debateHistory: AgentMessage[] = [];

  // Step 1: Stats Analyst (Data Guru) gathers data (Tool Calling)
  const venueInfo = await getVenueWeatherAndStats(matchState.venue);
  const winProbabilityBefore = calculateWinProbability(matchState);

  // Incorporate tool details into match state if needed
  matchState.dewFactor = venueInfo.weather.dewRisk;
  
  const dataGuruPrompt = `Review the following cricket match state:
\`\`\`json
${JSON.stringify(matchState, null, 2)}
\`\`\`

Venue Historical Stats & Weather (Fetched via tool):
\`\`\`json
${JSON.stringify(venueInfo, null, 2)}
\`\`\`

Win Probability Model (Calculated via tool):
\`\`\`json
${JSON.stringify(winProbabilityBefore, null, 2)}
\`\`\`

Provide a detailed data report. Focus on match-ups (e.g. striker batting hand vs current bowler type), pitch behavior, how dew will impact the ball, and boundary lengths at the venue. Keep it objective, statistics-driven, and highly analytical.`;

  const dataGuruResponse = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: dataGuruPrompt,
    config: {
      systemInstruction: "You are the Stats Analyst (Data Guru). Analyze the statistics, venue profile, weather, and matchups. Provide an objective data report. Avoid fluff."
    }
  });

  const dataGuruReport = dataGuruResponse.text || "No data analysis generated.";
  debateHistory.push({
    agentName: "Data Guru",
    roleName: "Stats Analyst",
    content: dataGuruReport,
    timestamp: new Date().toISOString()
  });

  // Step 2: Strategist (Captain Cool) proposes the initial plan
  const strategistPrompt = `Review the match state and the Data Guru's report.
  
Match State:
\`\`\`json
${JSON.stringify(matchState, null, 2)}
\`\`\`

Data Guru Report:
${dataGuruReport}

Formulate your initial Captain's Plan. Decide:
1. The immediate next action (e.g., who bowls the next over, field setup changes, whether to take the strategic timeout, or bring in an Impact Player).
2. The strategic reasoning in authentic cricket captain terminology.
3. Recommend a field setup of 7-9 fielders (excluding bowler and keeper). Provide coordinate mappings for each fielder where:
   - x is between -100 (extreme leg side) and 100 (extreme off side) for a Right-Handed Batter.
   - y is between -100 (straight down the ground/long-off/on) and 100 (directly behind keeper/third man/fine leg).
   - Provide a description of what that fielder's job is.

Format your output in a structured JSON block matching this schema:
{
  "decision": "string (The core next step)",
  "explanation": "string (Why this decision is made, in cricket captain language)",
  "fielders": [
    { "name": "string (e.g. Slip, Deep Mid-Wicket, Cover, etc.)", "x": number, "y": number, "description": "string" }
  ]
}`;

  const strategistResponse = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash", // Use flash as fallback for free tier quota compatibility
    contents: strategistPrompt,
    config: {
      systemInstruction: "You are the Captain (Strategist). You make tactical decisions like MSD, Rohit Sharma, or Hardik Pandya. You must return a valid JSON object following the specified schema.",
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          decision: { type: "STRING" },
          explanation: { type: "STRING" },
          fielders: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                x: { type: "NUMBER" },
                y: { type: "NUMBER" },
                description: { type: "STRING" }
              },
              required: ["name", "x", "y", "description"]
            }
          }
        },
        required: ["decision", "explanation", "fielders"]
      }
    }
  });

  const initialPlanText = strategistResponse.text || "{}";
  const initialPlan = JSON.parse(initialPlanText);
  
  debateHistory.push({
    agentName: "Captain Cool",
    roleName: "Strategist",
    content: `Proposed Decision: ${initialPlan.decision}\n\nExplanation: ${initialPlan.explanation}`,
    timestamp: new Date().toISOString()
  });

  // Step 3: Devil's Advocate (The Dissenter) challenges the Captain's plan
  const devilsAdvocatePrompt = `You are the Devil's Advocate (The Dissenter) in the IPL captaincy team.
You must critically challenge the Captain's proposed plan, find its flaws, and advocate for an alternative.

Match State:
\`\`\`json
${JSON.stringify(matchState, null, 2)}
\`\`\`

Data Guru Report:
${dataGuruReport}

Captain's Proposed Plan:
${JSON.stringify(initialPlan, null, 2)}

Identify at least two major risks with the Captain's plan (e.g., short boundary vulnerability, dew making the ball slippery, batsman matching up extremely well against the proposed bowler, or bowler's confidence under pressure).
Propose a concrete alternative plan (e.g., a different bowler, different field setup, or saving the bowler for death overs). Keep your tone direct, cricketing, and provocative.`;

  const devilsAdvocateResponse = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: devilsAdvocatePrompt,
    config: {
      systemInstruction: "You are the Devil's Advocate. Your job is to poke holes in the captain's plan and propose a viable, high-risk/high-reward or safer alternative. Be sharp and use cricket terminology."
    }
  });

  const dissentText = devilsAdvocateResponse.text || "No dissent generated.";
  debateHistory.push({
    agentName: "The Dissenter",
    roleName: "Devil's Advocate",
    content: dissentText,
    timestamp: new Date().toISOString()
  });

  // Extract key points of criticism & alternative for easier parsing
  const dissentSummaryResponse = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Parse this dissenting opinion text and summarize it into two fields: "criticism" and "alternativeProposal".
Text:
${dissentText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          criticism: { type: "STRING" },
          alternativeProposal: { type: "STRING" }
        },
        required: ["criticism", "alternativeProposal"]
      }
    }
  });

  const dissent = JSON.parse(dissentSummaryResponse.text || '{"criticism": "","alternativeProposal":""}');

  // Step 4: Strategist (Captain Cool) defends or revises the plan (Final Call)
  const finalDecisionPrompt = `As the Captain, you have heard the dissenting argument from the Devil's Advocate.

Match State:
\`\`\`json
${JSON.stringify(matchState, null, 2)}
\`\`\`

Dissenting Opinion:
${dissentText}

Initial Plan:
${JSON.stringify(initialPlan, null, 2)}

Now, make the final Captain's Call. You can either:
1. Completely Stick to your initial plan, explaining why the Devil's Advocate's concerns are secondary or how you plan to mitigate them.
2. Compromise/Revise your plan, adopting the alternative bowler/tactic or modifying the field setup.

Provide:
1. The final decision.
2. The final explanation, specifically addressing the Devil's Advocate's points.
3. The final fielders list with coordinates (especially if you revised it).
4. A confidence score (0-100) representing how sure you are about this call succeeding.

Format your output in a structured JSON block matching this schema:
{
  "decision": "string (The final next step)",
  "explanation": "string (Final captain rationale, addressing the dissent)",
  "confidenceScore": number,
  "fielders": [
    { "name": "string", "x": number, "y": number, "description": "string" }
  ]
}`;

  const finalResponse = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash", // Use flash as fallback for free tier quota compatibility
    contents: finalDecisionPrompt,
    config: {
      systemInstruction: "You are the Captain making the final executive call. You must return a valid JSON object following the specified schema.",
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          decision: { type: "STRING" },
          explanation: { type: "STRING" },
          confidenceScore: { type: "INTEGER", description: "0 to 100" },
          fielders: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                x: { type: "NUMBER" },
                y: { type: "NUMBER" },
                description: { type: "STRING" }
              },
              required: ["name", "x", "y", "description"]
            }
          }
        },
        required: ["decision", "explanation", "confidenceScore", "fielders"]
      }
    }
  });

  const finalDecision = JSON.parse(finalResponse.text || "{}");
  debateHistory.push({
    agentName: "Captain Cool",
    roleName: "Strategist (Final Call)",
    content: `Final Decision: ${finalDecision.decision}\n\nConfidence: ${finalDecision.confidenceScore}%\n\nExplanation: ${finalDecision.explanation}`,
    timestamp: new Date().toISOString()
  });

  // Calculate new win probability after final decision
  // We simulate a confidence-based adjustment for the win probability
  const winProbabilityAfter = { ...winProbabilityBefore };
  const battingWin = winProbabilityBefore.battingTeamWinProbability;
  const bowlingWin = winProbabilityBefore.bowlingTeamWinProbability;

  // Let's assume a good captain's decision improves the bowling team's chance if they are bowling,
  // or batting team's chance if they are batting, proportional to confidence.
  const isBowlingTeamUser = true; // Typically user takes the captain's role for the fielding side
  const adjustment = Math.round((finalDecision.confidenceScore / 100) * 5); // Up to +5% change
  
  if (matchState.innings === 1) {
    // Fielding (bowling) team gets boost
    winProbabilityAfter.bowlingTeamWinProbability = Math.min(95, bowlingWin + adjustment);
    winProbabilityAfter.battingTeamWinProbability = 100 - winProbabilityAfter.bowlingTeamWinProbability;
  } else {
    // If user is bowling, boost bowling. If batting, boost batting.
    // Let's default to boosting the user's strategic side (usually the bowling captain role is most strategic)
    winProbabilityAfter.bowlingTeamWinProbability = Math.min(95, bowlingWin + adjustment);
    winProbabilityAfter.battingTeamWinProbability = 100 - winProbabilityAfter.bowlingTeamWinProbability;
  }

  // Step 5: Match Commentator wraps it up for the fans
  const commentatorPrompt = `You are a legendary, hyper-energetic IPL commentator (like Ravi Shastri or Harsha Bhogle). 
You must summarize the intense tactical debate that just happened in the team meeting and explain the Captain's Final Call to the fans.

Match State:
\`\`\`json
${JSON.stringify(matchState, null, 2)}
\`\`\`

Data Guru Report:
${dataGuruReport}

Captain's Initial Idea:
${initialPlan.decision} (${initialPlan.explanation})

Devil's Advocate Challenge:
${dissentText}

Captain's Final Call:
${finalDecision.decision} (${finalDecision.explanation})

Write a dramatic, engaging commentary piece. Explain why this call is brilliant and what the risks are. Use commentary slang! "Tracer bullet", "In the air... and gone!", "Cometh the hour, cometh the man", "Captain Cool strikes again".`;

  const commentatorResponse = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: commentatorPrompt,
    config: {
      systemInstruction: "You are an IPL match commentator. Deliver a high-energy, exciting summary of the tactical decision and the debate that led to it."
    }
  });

  const commentary = commentatorResponse.text || "What a tactical masterclass we have on our hands here!";
  debateHistory.push({
    agentName: "Harsha / Ravi",
    roleName: "Match Commentator",
    content: commentary,
    timestamp: new Date().toISOString()
  });

  return {
    matchState,
    venueInfo,
    winProbabilityBefore,
    winProbabilityAfter,
    dataGuruReport,
    initialPlan,
    dissent,
    finalDecision,
    commentary,
    debateHistory
  };
}
