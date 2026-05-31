"use client";

import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Settings, 
  Compass, 
  Activity, 
  HelpCircle, 
  Send, 
  Globe, 
  AlertCircle, 
  Cpu, 
  Sparkles, 
  FileText,
  Volume2,
  Play,
  RotateCcw
} from "lucide-react";
import { CricketPitch } from "@/components/CricketPitch";
import { MatchState, getVenueWeatherAndStats } from "@/lib/tools";
import { DebateResult, Fielder, AgentMessage } from "@/lib/agents";

// Define a default/fallback state
const defaultMatchState: MatchState = {
  innings: 2,
  over: 18,
  ball: 0,
  score: 154,
  wickets: 6,
  battingTeam: "Royal Challengers Bengaluru",
  bowlingTeam: "Chennai Super Kings",
  striker: { name: "Virat Kohli", runs: 78, balls: 48 },
  nonStriker: { name: "Dinesh Karthik", runs: 12, balls: 6 },
  currentBowler: { name: "Matheesha Pathirana", overs: 3, runs: 28, wickets: 2 },
  bowlersRemaining: [
    { name: "Matheesha Pathirana", oversUsed: 3, maxOvers: 4 },
    { name: "Tushar Deshpande", oversUsed: 3, maxOvers: 4 },
    { name: "Ravindra Jadeja", oversUsed: 4, maxOvers: 4 },
    { name: "Shardul Thakur", oversUsed: 2, maxOvers: 4 }
  ],
  pitchConditions: "two-paced",
  dewFactor: "Heavy",
  venue: "Chidambaram Stadium (Chepauk)",
  target: 180,
  requiredRunRate: 13.0,
  impactPlayerAvailable: true,
  powerplayContext: "Death Overs"
};

export default function Home() {
  const [matchState, setMatchState] = useState<MatchState>(defaultMatchState);
  const [cricbuzzUrl, setCricbuzzUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [activeTab, setActiveTab] = useState<"debate" | "analysis" | "field">("debate");
  const [showPitchOverlay, setShowPitchOverlay] = useState(true);

  // Loading step simulation to make it feel alive
  useEffect(() => {
    if (!loading) return;
    const steps = [
      "Connecting to Google Gemini API...",
      "Scraping live match data...",
      "Extracting scoreboard variables...",
      "Consulting Stats Analyst (Data Guru)...",
      "Analyzing batsman vs bowler matchups...",
      "Proposing Captain's Strategy...",
      "Challenging plan with Devil's Advocate...",
      "Debating alternative matchups...",
      "Finalizing Captain's Call...",
      "Synthesizing Commentator voice notes..."
    ];
    
    let currentIdx = 0;
    setLoadingStep(steps[0]);
    
    const interval = setInterval(() => {
      if (currentIdx < steps.length - 1) {
        currentIdx++;
        setLoadingStep(steps[currentIdx]);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [loading]);

  const handleInputChange = (field: keyof MatchState, value: any) => {
    setMatchState((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto calculate required run rate if target, score, over, ball change
      if (updated.innings === 2 && updated.target) {
        const totalBalls = 120;
        const ballsBowled = updated.over * 6 + updated.ball;
        const ballsRemaining = totalBalls - ballsBowled;
        if (ballsRemaining > 0) {
          const runsNeeded = updated.target - updated.score;
          updated.requiredRunRate = Math.round((runsNeeded / ballsRemaining) * 6 * 100) / 100;
        } else {
          updated.requiredRunRate = 0;
        }
      }
      
      return updated;
    });
  };

  const handleStrikerChange = (field: "name" | "runs" | "balls", value: any) => {
    setMatchState((prev) => ({
      ...prev,
      striker: { ...prev.striker, [field]: value }
    }));
  };

  const handleNonStrikerChange = (field: "name" | "runs" | "balls", value: any) => {
    setMatchState((prev) => ({
      ...prev,
      nonStriker: { ...prev.nonStriker, [field]: value }
    }));
  };

  const handleBowlerChange = (field: "name" | "overs" | "runs" | "wickets", value: any) => {
    setMatchState((prev) => ({
      ...prev,
      currentBowler: { ...prev.currentBowler, [field]: value }
    }));
  };

  const handleScrapeAndAnalyze = async () => {
    if (!cricbuzzUrl.trim()) {
      setError("Please paste a valid Cricbuzz or ESPNCricinfo live match URL.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/strategize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cricbuzzUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.setupRequired) {
          setSetupRequired(true);
        }
        throw new Error(data.error || "Tactical debate failed.");
      }

      setResult(data);
      // Update form with scraped match state
      if (data.matchState) {
        setMatchState(data.matchState);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/strategize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualState: matchState })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.setupRequired) {
          setSetupRequired(true);
        }
        throw new Error(data.error || "Tactical debate failed.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (presetName: string) => {
    if (presetName === "chepauk-spin") {
      setMatchState({
        ...defaultMatchState,
        venue: "Chidambaram Stadium (Chepauk)",
        pitchConditions: "turning",
        dewFactor: "None",
        over: 12,
        score: 84,
        wickets: 3,
        battingTeam: "Mumbai Indians",
        bowlingTeam: "Chennai Super Kings",
        striker: { name: "Suryakumar Yadav", runs: 34, balls: 24 },
        nonStriker: { name: "Tilak Varma", runs: 8, balls: 5 },
        currentBowler: { name: "Ravindra Jadeja", overs: 2, runs: 12, wickets: 1 },
        target: 165,
        requiredRunRate: 10.12,
        powerplayContext: "Middle Overs"
      });
    } else if (presetName === "wankhede-chase") {
      setMatchState({
        ...defaultMatchState,
        venue: "Wankhede Stadium",
        pitchConditions: "flat",
        dewFactor: "Heavy",
        over: 19,
        ball: 0,
        score: 192,
        wickets: 5,
        battingTeam: "Gujarat Titans",
        bowlingTeam: "Mumbai Indians",
        striker: { name: "Rahul Tewatia", runs: 28, balls: 11 },
        nonStriker: { name: "Rashid Khan", runs: 14, balls: 5 },
        currentBowler: { name: "Jasprit Bumrah", overs: 3, runs: 22, wickets: 2 },
        target: 205,
        requiredRunRate: 13.0,
        powerplayContext: "Death Overs"
      });
    } else if (presetName === "rcb-runs") {
      setMatchState({
        ...defaultMatchState,
        venue: "M Chinnaswamy Stadium",
        pitchConditions: "flat",
        dewFactor: "Light",
        innings: 1,
        over: 8,
        ball: 2,
        score: 95,
        wickets: 1,
        battingTeam: "Royal Challengers Bengaluru",
        bowlingTeam: "Sunrisers Hyderabad",
        striker: { name: "Virat Kohli", runs: 52, balls: 26 },
        nonStriker: { name: "Rajat Patidar", runs: 18, balls: 8 },
        currentBowler: { name: "Pat Cummins", overs: 1, runs: 15, wickets: 0 },
        target: undefined,
        requiredRunRate: undefined,
        powerplayContext: "Middle Overs"
      });
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <Trophy size={40} color="var(--color-gold)" style={{ filter: "drop-shadow(0 0 8px rgba(212,175,55,0.6))" }} />
          <div>
            <h1 className="brand-title">Captain Cool</h1>
            <div className="brand-subtitle">Multi-Agent IPL Match Strategist</div>
          </div>
        </div>
        <div className="header-badge">
          <Sparkles size={14} /> Powered by Gemini 2.5
        </div>
      </header>

      {/* API Key Missing Setup Box */}
      {setupRequired && (
        <div className="setup-banner">
          <h3 className="setup-banner-title">
            <AlertCircle size={18} /> API Key Setup Required
          </h3>
          <p className="setup-banner-text">
            To query the multi-agent debate loop, you must configure a <strong>Google Gemini API Key</strong>.
          </p>
          <div className="code-block mb-20">
            # Create/Open a .env.local file in the project root:<br />
            GEMINI_API_KEY=your_gemini_api_key_here
          </div>
          <p className="setup-banner-text" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Get a free API key instantly in <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-blue)", textDecoration: "underline" }}>Google AI Studio</a>. Once added, restart the Next.js development server.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Match Setup */}
        <section className="glass-panel">
          <h2 className="panel-title">
            <Settings size={18} color="var(--color-gold)" /> Match Context Setup
          </h2>

          {/* Quick presets */}
          <div className="form-group">
            <label className="form-label">Load Match Scenarios</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => loadPreset("chepauk-spin")} className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.75rem" }}>
                Chepauk Spin Trap
              </button>
              <button onClick={() => loadPreset("wankhede-chase")} className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.75rem" }}>
                Wankhede Last Over
              </button>
              <button onClick={() => loadPreset("rcb-runs")} className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.75rem" }}>
                Chinnaswamy Blast
              </button>
            </div>
          </div>

          {/* Scrape Input */}
          <div className="form-group" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <label className="form-label" style={{ color: "var(--color-blue)" }}>Import Live Match URL</label>
            <div className="cricbuzz-input-group">
              <input
                type="text"
                placeholder="Paste Cricbuzz live scorecard URL..."
                value={cricbuzzUrl}
                onChange={(e) => setCricbuzzUrl(e.target.value)}
                className="form-input"
              />
              <button 
                onClick={handleScrapeAndAnalyze} 
                disabled={loading} 
                className="btn btn-secondary"
                style={{ padding: "10px" }}
                title="Fetch Live Score"
              >
                <Globe size={16} />
              </button>
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleAnalyzeManual}>
            <div className="match-setup-grid">
              <div className="form-group">
                <label className="form-label">Innings</label>
                <select 
                  className="form-select" 
                  value={matchState.innings} 
                  onChange={(e) => handleInputChange("innings", Number(e.target.value))}
                >
                  <option value={1}>1st Innings</option>
                  <option value={2}>2nd Innings</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Venue</label>
                <select 
                  className="form-select" 
                  value={matchState.venue} 
                  onChange={(e) => handleInputChange("venue", e.target.value)}
                >
                  <option value="Wankhede Stadium">Wankhede (Mumbai)</option>
                  <option value="Chidambaram Stadium (Chepauk)">M.A. Chidambaram (Chennai)</option>
                  <option value="Eden Gardens">Eden Gardens (Kolkata)</option>
                  <option value="Narendra Modi Stadium">Narendra Modi (Ahmedabad)</option>
                  <option value="M Chinnaswamy Stadium">M. Chinnaswamy (Bengaluru)</option>
                </select>
              </div>
            </div>

            <div className="match-setup-grid">
              <div className="form-group">
                <label className="form-label">Batting Team</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={matchState.battingTeam} 
                  onChange={(e) => handleInputChange("battingTeam", e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bowling Team</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={matchState.bowlingTeam} 
                  onChange={(e) => handleInputChange("bowlingTeam", e.target.value)} 
                />
              </div>
            </div>

            <div className="match-setup-grid">
              <div className="form-group">
                <label className="form-label">Current Score</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ textAlign: "center" }}
                    value={matchState.score} 
                    onChange={(e) => handleInputChange("score", Number(e.target.value))} 
                  />
                  <span>/</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ textAlign: "center" }}
                    value={matchState.wickets} 
                    onChange={(e) => handleInputChange("wickets", Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Overs Completed</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input 
                    type="number" 
                    placeholder="Over"
                    className="form-input" 
                    style={{ textAlign: "center" }}
                    value={matchState.over} 
                    onChange={(e) => handleInputChange("over", Number(e.target.value))} 
                  />
                  <span>.</span>
                  <input 
                    type="number" 
                    placeholder="Ball"
                    className="form-input" 
                    style={{ textAlign: "center" }}
                    value={matchState.ball} 
                    onChange={(e) => handleInputChange("ball", Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>

            {matchState.innings === 2 && (
              <div className="match-setup-grid">
                <div className="form-group">
                  <label className="form-label">Target Score</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={matchState.target || 0} 
                    onChange={(e) => handleInputChange("target", Number(e.target.value))} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Run Rate</label>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled
                    className="form-input" 
                    value={matchState.requiredRunRate || 0} 
                    style={{ background: "rgba(0,0,0,0.15)", color: "var(--text-secondary)" }}
                  />
                </div>
              </div>
            )}

            <div className="match-setup-grid">
              <div className="form-group">
                <label className="form-label">Pitch Conditions</label>
                <select 
                  className="form-select" 
                  value={matchState.pitchConditions} 
                  onChange={(e) => handleInputChange("pitchConditions", e.target.value)}
                >
                  <option value="flat">Flat Deck (Batting Paradise)</option>
                  <option value="turning">Dusty / Turning Track</option>
                  <option value="two-paced">Two-Paced / Slow</option>
                  <option value="green">Green Pitch (Pace/Swing)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Stage of Match</label>
                <select 
                  className="form-select" 
                  value={matchState.powerplayContext} 
                  onChange={(e) => handleInputChange("powerplayContext", e.target.value)}
                >
                  <option value="Powerplay">Powerplay (Overs 1-6)</option>
                  <option value="Middle Overs">Middle Overs (Overs 7-15)</option>
                  <option value="Death Overs">Death Overs (Overs 16-20)</option>
                </select>
              </div>
            </div>

            {/* Batsmen Inputs */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginBottom: "8px" }}>
              <span className="form-label" style={{ color: "#fca5a5" }}>Batsmen (On Strike / Non-Strike)</span>
              <div className="match-setup-grid">
                <div>
                  <input 
                    type="text" 
                    placeholder="Striker Name" 
                    className="form-input" 
                    style={{ marginBottom: "6px" }}
                    value={matchState.striker.name} 
                    onChange={(e) => handleStrikerChange("name", e.target.value)} 
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input 
                      type="number" 
                      placeholder="Runs" 
                      className="form-input" 
                      value={matchState.striker.runs || 0} 
                      onChange={(e) => handleStrikerChange("runs", Number(e.target.value))} 
                    />
                    <input 
                      type="number" 
                      placeholder="Balls" 
                      className="form-input" 
                      value={matchState.striker.balls || 0} 
                      onChange={(e) => handleStrikerChange("balls", Number(e.target.value))} 
                    />
                  </div>
                </div>
                <div>
                  <input 
                    type="text" 
                    placeholder="Non-Striker Name" 
                    className="form-input" 
                    style={{ marginBottom: "6px" }}
                    value={matchState.nonStriker.name} 
                    onChange={(e) => handleNonStrikerChange("name", e.target.value)} 
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input 
                      type="number" 
                      placeholder="Runs" 
                      className="form-input" 
                      value={matchState.nonStriker.runs || 0} 
                      onChange={(e) => handleNonStrikerChange("runs", Number(e.target.value))} 
                    />
                    <input 
                      type="number" 
                      placeholder="Balls" 
                      className="form-input" 
                      value={matchState.nonStriker.balls || 0} 
                      onChange={(e) => handleNonStrikerChange("balls", Number(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Bowler */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginBottom: "16px" }}>
              <span className="form-label" style={{ color: "#93c5fd" }}>Current Bowler</span>
              <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                <input 
                  type="text" 
                  placeholder="Bowler Name" 
                  className="form-input" 
                  value={matchState.currentBowler.name} 
                  onChange={(e) => handleBowlerChange("name", e.target.value)} 
                />
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <input 
                  type="number" 
                  placeholder="Overs" 
                  step="0.1"
                  className="form-input" 
                  value={matchState.currentBowler.overs || 0} 
                  onChange={(e) => handleBowlerChange("overs", Number(e.target.value))} 
                />
                <input 
                  type="number" 
                  placeholder="Runs" 
                  className="form-input" 
                  value={matchState.currentBowler.runs || 0} 
                  onChange={(e) => handleBowlerChange("runs", Number(e.target.value))} 
                />
                <input 
                  type="number" 
                  placeholder="Wkts" 
                  className="form-input" 
                  value={matchState.currentBowler.wickets || 0} 
                  onChange={(e) => handleBowlerChange("wickets", Number(e.target.value))} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn btn-primary" 
              style={{ width: "100%" }}
            >
              <Send size={16} /> Run Agent Strategy Debate
            </button>
          </form>
        </section>

        {/* Right Column: Results & Interactive Ground */}
        <section className="workspace-container">
          {/* Main Scoreboard Display */}
          <div className="scoreboard">
            <div className="scoreboard-header">
              <span>{matchState.venue}</span>
              <span>Innings {matchState.innings} • {matchState.powerplayContext}</span>
            </div>
            <div className="scoreboard-row">
              <div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                  {matchState.battingTeam}
                </div>
                <div className="scoreboard-main">
                  {matchState.score}-{matchState.wickets}
                  <span style={{ fontSize: "1.2rem", color: "var(--text-secondary)", fontFamily: "var(--font-sans)", marginLeft: "12px", fontWeight: "normal" }}>
                    ({matchState.over}.{matchState.ball} ov)
                  </span>
                </div>
              </div>
              
              <div className="scoreboard-details">
                {matchState.innings === 2 && matchState.target && (
                  <>
                    <div>Target: <strong>{matchState.target}</strong></div>
                    <div className="scoreboard-rrr">Req RR: <strong>{matchState.requiredRunRate?.toFixed(2)}</strong></div>
                  </>
                )}
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Pitch: <span style={{ color: "var(--color-gold)" }}>{matchState.pitchConditions}</span> | Dew: <span style={{ color: "var(--color-blue)" }}>{matchState.dewFactor}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "0.75rem", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "8px", color: "var(--text-secondary)" }}>
              <div>🏏 <strong>{matchState.striker.name}</strong> {matchState.striker.runs}({matchState.striker.balls})*</div>
              <div><strong>{matchState.nonStriker.name}</strong> {matchState.nonStriker.runs}({matchState.nonStriker.balls})</div>
              <div>🥎 <strong>{matchState.currentBowler.name}</strong> {matchState.currentBowler.overs}-{matchState.currentBowler.runs}-{matchState.currentBowler.wickets}</div>
            </div>
          </div>

          {/* Loading View */}
          {loading && (
            <div className="glass-panel loader-container">
              <div className="stadium-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring second"></div>
                <div className="spinner-ring third"></div>
              </div>
              <div className="loader-text">{loadingStep}</div>
              <div className="loader-subtext">Google Gemini is orchestrating the captaincy debate loop...</div>
            </div>
          )}

          {/* Error View */}
          {error && !loading && (
            <div className="glass-panel" style={{ border: "1px solid #ef4444", background: "rgba(239, 68, 68, 0.05)" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", color: "#fca5a5" }}>
                <AlertCircle size={24} style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: "bold", marginBottom: "4px" }}>Tactical Analysis Error</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty Placeholder */}
          {!result && !loading && !error && (
            <div className="glass-panel placeholder-view">
              <Compass size={64} className="placeholder-icon" />
              <h3>Enter Match Details to Begin</h3>
              <p style={{ fontSize: "0.85rem", marginTop: "8px", maxWidth: "400px" }}>
                Update the scoreboard context in the left panel and click <strong>Run Agent Strategy Debate</strong> to receive live tactical decisions, debate transcripts, and fielder layout maps.
              </p>
            </div>
          )}

          {/* Results Output */}
          {result && !loading && (
            <div className="workspace-grid">
              {/* Left Column of Results: Captain's Final Decision & Debate */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* Win Probability Bar */}
                <div className="win-probability-container">
                  <div className="win-probability-title">
                    <span>Win Probability</span>
                    <span style={{ color: "var(--color-gold)" }}>Captain's Decision Impact</span>
                  </div>
                  <div className="win-probability-bar">
                    <div 
                      className="win-probability-fill batting" 
                      style={{ width: `${result.winProbabilityAfter.battingTeamWinProbability}%` }}
                    >
                      {matchState.battingTeam.substring(0, 3).toUpperCase()} {result.winProbabilityAfter.battingTeamWinProbability}%
                    </div>
                    <div 
                      className="win-probability-fill bowling" 
                      style={{ width: `${result.winProbabilityAfter.bowlingTeamWinProbability}%` }}
                    >
                      {result.winProbabilityAfter.bowlingTeamWinProbability}% {matchState.bowlingTeam.substring(0, 3).toUpperCase()}
                    </div>
                    {/* Shift indicator */}
                    {result.winProbabilityAfter.bowlingTeamWinProbability !== result.winProbabilityBefore.bowlingTeamWinProbability && (
                      <span className="probability-diff-indicator">
                        +{result.winProbabilityAfter.bowlingTeamWinProbability - result.winProbabilityBefore.bowlingTeamWinProbability}% Bowling Prob
                      </span>
                    )}
                  </div>
                </div>

                {/* Final Call Card */}
                <div className="glass-panel final-decision-box">
                  <div className="flex-between">
                    <span className="final-decision-badge">Captain's Call</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-gold)" }}>Decision Complete</span>
                  </div>
                  <h3 className="final-decision-title">{result.finalDecision.decision}</h3>
                  
                  <div className="confidence-meter">
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "bold" }}>CONFIDENCE:</span>
                    <div className="confidence-bar-bg">
                      <div className="confidence-bar-fill" style={{ width: `${result.finalDecision.confidenceScore}%` }}></div>
                    </div>
                    <span style={{ color: "var(--color-green)", fontFamily: "var(--font-mono)", fontWeight: "bold", fontSize: "0.95rem" }}>
                      {result.finalDecision.confidenceScore}%
                    </span>
                  </div>

                  <p style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: "1.6", borderTop: "1px dashed rgba(212,175,55,0.2)", paddingTop: "12px" }}>
                    {result.finalDecision.explanation}
                  </p>
                </div>

                {/* Tabs */}
                <div>
                  <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
                    <button 
                      onClick={() => setActiveTab("debate")}
                      className={`btn`} 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        borderBottom: activeTab === "debate" ? "2px solid var(--color-gold)" : "none",
                        color: activeTab === "debate" ? "var(--color-gold)" : "var(--text-secondary)",
                        borderRadius: 0,
                        padding: "10px 16px"
                      }}
                    >
                      <Cpu size={14} /> Agent Debate
                    </button>
                    <button 
                      onClick={() => setActiveTab("analysis")}
                      className={`btn`} 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        borderBottom: activeTab === "analysis" ? "2px solid var(--color-gold)" : "none",
                        color: activeTab === "analysis" ? "var(--color-gold)" : "var(--text-secondary)",
                        borderRadius: 0,
                        padding: "10px 16px"
                      }}
                    >
                      <FileText size={14} /> Matchup Analytics
                    </button>
                    <button 
                      onClick={() => setActiveTab("field")}
                      className={`btn`} 
                      style={{ 
                        background: "none", 
                        border: "none", 
                        borderBottom: activeTab === "field" ? "2px solid var(--color-gold)" : "none",
                        color: activeTab === "field" ? "var(--color-gold)" : "var(--text-secondary)",
                        borderRadius: 0,
                        padding: "10px 16px"
                      }}
                    >
                      <Compass size={14} /> Field Placements
                    </button>
                  </div>

                  {/* Tab 1: Agent Debate */}
                  {activeTab === "debate" && (
                    <div>
                      <div className="debate-console">
                        {result.debateHistory.map((msg, idx) => {
                          const messageClass = msg.agentName.toLowerCase().replace(/\s+/g, "-");
                          return (
                            <div key={idx} className={`debate-message ${messageClass}`}>
                              <div className="message-header">
                                <span className="message-agent-name">{msg.agentName}</span>
                                <span className="message-role">{msg.roleName}</span>
                              </div>
                              <div className="message-content">{msg.content}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Matchup Analytics */}
                  {activeTab === "analysis" && (
                    <div className="glass-panel" style={{ background: "rgba(0,0,0,0.25)" }}>
                      <h4 style={{ color: "var(--color-gold)", marginBottom: "12px", fontSize: "1rem" }}>Stats Analyst Report</h4>
                      <p style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap", color: "var(--text-primary)", lineHeight: "1.6" }}>
                        {result.dataGuruReport}
                      </p>

                      <h4 style={{ color: "var(--color-red)", marginTop: "20px", marginBottom: "12px", fontSize: "1rem" }}>Dissent Summary (Devil's Advocate)</h4>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.6" }}>
                        <p><strong>Objection:</strong> {result.dissent.criticism}</p>
                        <p style={{ marginTop: "8px" }}><strong>Alternative Proposal:</strong> {result.dissent.alternativeProposal}</p>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Field Placements list */}
                  {activeTab === "field" && (
                    <div className="glass-panel" style={{ background: "rgba(0,0,0,0.25)" }}>
                      <h4 style={{ color: "var(--color-gold)", marginBottom: "12px", fontSize: "1rem" }}>Tactical Fielder Layout</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {result.finalDecision.fielders.map((fielder, idx) => (
                          <div key={idx} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", borderLeft: "2.5px solid var(--color-gold)" }}>
                            <div style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{fielder.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>{fielder.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Right Column of Results: Cricket Ground SVG Visualizer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ color: "var(--color-gold)", fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Compass size={16} /> Field Setup Map
                </h4>
                <CricketPitch 
                  fielders={result.finalDecision.fielders}
                  strikerName={matchState.striker.name}
                  bowlerName={result.finalDecision.decision.includes("bowl") ? result.finalDecision.decision.split("bowls")[0].trim() : matchState.currentBowler.name}
                />
                <div style={{ padding: "12px", background: "rgba(212,175,55,0.05)", borderRadius: "8px", border: "1px solid rgba(212,175,55,0.15)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <strong>Visual Guide:</strong> The green oval is the 30-yard circle (powerplay boundary). The dashed outline is the boundary rope. Fielder coordinates are optimized for a right-handed batter. Hover over any gold dot on the pitch to see the fielder's specific role.
                </div>
              </div>

            </div>
          )}
        </section>
      </main>
    </div>
  );
}
