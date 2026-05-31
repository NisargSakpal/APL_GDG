import * as cheerio from "cheerio";

export interface MatchState {
  innings: 1 | 2;
  over: number;
  ball: number;
  score: number;
  wickets: number;
  battingTeam: string;
  bowlingTeam: string;
  striker: { name: string; runs: number; balls: number };
  nonStriker: { name: string; runs: number; balls: number };
  currentBowler: { name: string; overs: number; runs: number; wickets: number };
  bowlersRemaining: Array<{ name: string; oversUsed: number; maxOvers: number }>;
  pitchConditions: string; // turning, flat, green, two-paced
  dewFactor: "None" | "Light" | "Heavy";
  venue: string;
  target?: number; // required for 2nd innings
  requiredRunRate?: number; // required for 2nd innings
  impactPlayerAvailable: boolean;
  powerplayContext: "Powerplay" | "Middle Overs" | "Death Overs";
}

// 1. Tool to get Venue Weather & Stats Profile
export async function getVenueWeatherAndStats(venue: string) {
  const normalizedVenue = venue.toLowerCase();
  
  // Standard profiles for major IPL Stadiums
  const venueProfiles: Record<string, {
    averageFirstInnings: number;
    averageSecondInnings: number;
    spinBias: string; // "High", "Medium", "Low"
    paceBias: string; // "High", "Medium", "Low"
    pitchDescription: string;
    weather: { temp: string; humidity: string; dewRisk: "None" | "Light" | "Heavy" }
  }> = {
    wankhede: {
      averageFirstInnings: 172,
      averageSecondInnings: 165,
      spinBias: "Low",
      paceBias: "High",
      pitchDescription: "Flat pitch, red soil, excellent bounce, short boundaries. Highly favorable for pacers early on, but a batsman's paradise. Chasing is heavily preferred.",
      weather: { temp: "30°C", humidity: "82%", dewRisk: "Heavy" }
    },
    chidambaram: {
      averageFirstInnings: 158,
      averageSecondInnings: 148,
      spinBias: "High",
      paceBias: "Medium",
      pitchDescription: "Dry, dusty surface. Grip, turn, and slow bounce. Spinners dominate the middle overs. Defending is usually easier unless heavy dew falls.",
      weather: { temp: "32°C", humidity: "76%", dewRisk: "Heavy" }
    },
    eden_gardens: {
      averageFirstInnings: 175,
      averageSecondInnings: 168,
      spinBias: "Medium",
      paceBias: "High",
      pitchDescription: "True bounce and fast outfield. Batters enjoy the ball coming onto the bat. Pacers with good variations do well, spinners get occasional grip.",
      weather: { temp: "29°C", humidity: "85%", dewRisk: "Heavy" }
    },
    narendra_modi: {
      averageFirstInnings: 168,
      averageSecondInnings: 160,
      spinBias: "Medium",
      paceBias: "High",
      pitchDescription: "Huge boundaries, mixture of red and black soil pitches. Black soil offers slow turn, red soil offers bounce. High speed outfield.",
      weather: { temp: "35°C", humidity: "45%", dewRisk: "Light" }
    },
    chinnaswamy: {
      averageFirstInnings: 188,
      averageSecondInnings: 180,
      spinBias: "Low",
      paceBias: "Low",
      pitchDescription: "Very short boundaries, high altitude, flat deck. Absolute batting paradise. Even 200+ scores are not safe. Spinners are usually defensive here.",
      weather: { temp: "26°C", humidity: "50%", dewRisk: "None" }
    }
  };

  let profile = venueProfiles.wankhede; // default fallback
  let matchedVenueKey = "wankhede";

  for (const key in venueProfiles) {
    if (normalizedVenue.includes(key) || key.replace("_", " ").includes(normalizedVenue)) {
      profile = venueProfiles[key];
      matchedVenueKey = key;
      break;
    }
  }

  return {
    venueName: venue,
    matchedProfile: matchedVenueKey,
    ...profile,
    timestamp: new Date().toISOString()
  };
}

// 2. Tool to calculate win probability based on live state
export function calculateWinProbability(state: Partial<MatchState>) {
  const score = state.score || 0;
  const wickets = state.wickets || 0;
  const over = state.over || 0;
  const ball = state.ball || 0;
  const innings = state.innings || 1;
  const target = state.target || 0;
  const dewFactor = state.dewFactor || "None";
  const pitchConditions = state.pitchConditions || "flat";

  // Total balls in T20
  const totalBalls = 120;
  const ballsBowled = Math.min(over * 6 + ball, totalBalls);
  const ballsRemaining = totalBalls - ballsBowled;
  const wicketsRemaining = 10 - wickets;

  if (innings === 1) {
    // Innings 1: Win probability is simulated against historical average par scores
    const parScore = pitchConditions.includes("turning") ? 150 : pitchConditions.includes("flat") ? 180 : 165;
    const projectedScore = ballsBowled > 0 ? Math.round((score / ballsBowled) * totalBalls) : parScore;
    
    // Adjust based on wickets remaining
    const wicketImpactFactor = (wicketsRemaining / 10) * 20; // up to +20% if wickets in hand
    
    // Normal T20 par score probability
    let winProb = 50;
    if (projectedScore > parScore) {
      winProb += Math.min(25, ((projectedScore - parScore) / parScore) * 100);
    } else {
      winProb -= Math.min(25, ((parScore - projectedScore) / parScore) * 100);
    }

    winProb += (wicketImpactFactor - 10); // adjust for wickets
    winProb = Math.min(95, Math.max(5, winProb));

    return {
      innings: 1,
      battingTeamWinProbability: Math.round(winProb),
      bowlingTeamWinProbability: Math.round(100 - winProb),
      projectedScore,
      analysis: `Based on a projected score of ${projectedScore} on a ${pitchConditions} pitch, with ${wicketsRemaining} wickets in hand.`
    };
  } else {
    // Innings 2: Target is set
    const runsNeeded = target - score;
    
    if (runsNeeded <= 0) {
      return { innings: 2, battingTeamWinProbability: 100, bowlingTeamWinProbability: 0, analysis: "Match completed. Batting team won." };
    }
    if (wicketsRemaining <= 0 || (ballsRemaining <= 0 && runsNeeded > 0)) {
      return { innings: 2, battingTeamWinProbability: 0, bowlingTeamWinProbability: 100, analysis: "Match completed. Bowling team won." };
    }

    const reqRunRate = (runsNeeded / ballsRemaining) * 6;
    
    // Base probability starts at 50%
    let baseProb = 50;
    
    // Required rate impact
    const rrrGap = reqRunRate - 8.0; // 8.0 is standard par T20 RRR
    baseProb -= rrrGap * 7; // every 1 RRR above 8 drops probability by 7%
    
    // Wickets remaining impact
    baseProb += (wicketsRemaining - 4) * 8; // more wickets = higher chance. 4 wickets left is 'par'.

    // Dew factor impacts fielding team (bowling team) negatively, batting team positively
    if (dewFactor === "Heavy") {
      baseProb += 10;
    } else if (dewFactor === "Light") {
      baseProb += 5;
    }

    // Cap boundaries
    baseProb = Math.min(98, Math.max(2, baseProb));

    return {
      innings: 2,
      battingTeamWinProbability: Math.round(baseProb),
      bowlingTeamWinProbability: Math.round(100 - baseProb),
      runsNeeded,
      ballsRemaining,
      requiredRunRate: Math.round(reqRunRate * 100) / 100,
      analysis: `Batting team needs ${runsNeeded} runs in ${ballsRemaining} balls (RRR: ${reqRunRate.toFixed(2)}) with ${wicketsRemaining} wickets remaining.`
    };
  }
}

// 3. Tool to Scrape Cricbuzz/ESPN Cricinfo HTML
export async function scrapeLiveMatch(url: string): Promise<{
  success: boolean;
  error?: string;
  scrapedData?: {
    title: string;
    rawText: string;
  };
}> {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { success: false, error: "Invalid URL format. Must start with http:// or https://" };
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error! status: ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, images, and other unneeded heavy elements to keep size low
    $("script").remove();
    $("style").remove();
    $("noscript").remove();
    $("svg").remove();
    $("img").remove();

    const title = $("title").text() || "Live Match Scorecard";
    
    // Get text body contents
    let bodyText = $("body").text();

    // Clean up excessive white spaces
    bodyText = bodyText
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim();

    // Limit text length to prevent context window bloat for secondary analysis
    // We only need the core scoreboard contents
    const truncatedText = bodyText.substring(0, 8000);

    return {
      success: true,
      scrapedData: {
        title,
        rawText: truncatedText
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to fetch match URL"
    };
  }
}
