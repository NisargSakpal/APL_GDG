# 🏏 Captain Cool — Multi-Agent IPL Match Strategist

> **An agentic AI system that makes live IPL tactical decisions the way Dhoni, Rohit, or Hardik would.**  
> Built with **Google Gemini 2.5 Flash**, **Next.js 16**, and a premium cricket-stadium-themed UI.

![Captain Cool Banner](https://img.shields.io/badge/Powered%20by-Google%20Gemini%202.5-blue?style=for-the-badge&logo=google)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🎯 What It Does

Captain Cool takes a live IPL match state as input and outputs:

1. **The Next Tactical Decision** — who bowls, who bats, field setup, when to take a timeout, when to bring in the Impact Player
2. **Cricket-Language Reasoning** — explained the way a real captain or commentator would ("the leggie is wasted against a left-handed pinch-hitter on a turning pitch in dew")
3. **The Internal Agent Debate** — a genuine back-and-forth between four distinct AI agents before committing to the call

---

## 🤖 Multi-Agent Architecture

```
User Input / Live URL ──► Live Match Scraper (Cheerio + Gemini Extraction)
                                │
                                ▼
                    ┌─────────────────────┐
                    │  Stats Analyst      │  ◄── Tool: Venue & Weather Stats
                    │  (Data Guru)        │  ◄── Tool: Win Probability Model
                    └─────────┬───────────┘
                              │ Matchup Report
                              ▼
                    ┌─────────────────────┐
                    │  Strategist         │  Proposes initial plan
                    │  (Captain Cool)     │  + fielder coordinates
                    └─────────┬───────────┘
                              │ Initial Plan
                              ▼
                    ┌─────────────────────┐
                    │  Devil's Advocate   │  Challenges plan,
                    │  (The Dissenter)    │  proposes alternatives
                    └─────────┬───────────┘
                              │ Dissent
                              ▼
                    ┌─────────────────────┐
                    │  Strategist         │  Defends or revises
                    │  (Final Call)       │  + confidence score
                    └─────────┬───────────┘
                              │ Final Decision
                              ▼
                    ┌─────────────────────┐
                    │  Match Commentator  │  Fan-friendly cricket
                    │  (Harsha / Ravi)    │  commentary wrap-up
                    └─────────────────────┘
```

### The Four Agents

| Agent | Model | Role |
|-------|-------|------|
| 📊 **Stats Analyst (Data Guru)** | gemini-2.5-flash | Analyses matchups, venue history, weather & win probability |
| 🧢 **Strategist (Captain Cool)** | gemini-2.5-flash | Proposes initial tactical plan with fielder coordinates |
| 😈 **Devil's Advocate** | gemini-2.5-flash | Challenges the plan, proposes risky/safer alternatives |
| 🎙️ **Match Commentator** | gemini-2.5-flash | Delivers final decision in Harsha Bhogle/Ravi Shastri style |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- **AI:** [Google Gemini 2.5 Flash](https://ai.google.dev/) via `@google/genai`
- **HTML Scraping:** [Cheerio](https://cheerio.js.org/) for live match URL parsing
- **Icons:** [Lucide React](https://lucide.dev/)
- **Styling:** Vanilla CSS with glassmorphism, custom CSS animations, stadium-at-night theme

---

## ✨ Key Features

- 🌐 **Live URL Import** — Paste any Cricbuzz scorecard URL and the system extracts the live match state automatically
- 🎯 **Scenario Presets** — One-click test scenarios (Chepauk Spin Trap, Wankhede Last Over, Chinnaswamy Blast)
- 🏟️ **SVG Cricket Pitch Visualizer** — Dynamic fielder placement map with coordinate-based rendering
- 💬 **Agent Debate Console** — Step-by-step animated display of the internal captaincy debate
- 📈 **Win Probability Bar** — Before/after impact of the captain's decision
- 🎙️ **Commentary Mode** — Final decision in authentic cricket commentator language
- 🔧 **Gemini Function Calling** — Venue stats, dew factor, and win probability tools called from inside agents

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/captain-cool.git
cd captain-cool
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Your Gemini API Key

Create a `.env.local` file in the root folder:

```env
GEMINI_API_KEY=AIzaSyYourKeyHere
```

> Get a free API key at [Google AI Studio](https://aistudio.google.com/). The free tier supports **1,500 requests/day** with `gemini-2.5-flash`.

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage

1. **Select a Preset** or manually fill in the match state on the left panel
2. Optionally **paste a live Cricbuzz URL** and click the globe icon to auto-import the scorecard
3. Click **"Run Agent Strategy Debate"**
4. Watch the four agents debate in the **Agent Debate** tab
5. View the final **Captain's Call** with fielder placements on the **Field Placements** tab

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── api/strategize/route.ts   # API endpoint — runs the full debate loop
│   ├── globals.css               # Stadium-at-night premium CSS design system
│   ├── layout.tsx                # Root layout with SEO metadata
│   └── page.tsx                  # Main dashboard UI
├── components/
│   └── CricketPitch.tsx          # SVG pitch with dynamic fielder coordinates
└── lib/
    ├── agents.ts                  # Multi-agent debate loop (4 Gemini agents)
    └── tools.ts                   # Venue stats, win probability & web scraper tools
```

---

## 🏟️ Supported Venues

| Venue | Avg 1st Innings | Spin Bias | Dew Risk |
|-------|----------------|-----------|----------|
| Wankhede Stadium (Mumbai) | 172 | Low | Heavy |
| M.A. Chidambaram (Chennai) | 158 | High | Heavy |
| Eden Gardens (Kolkata) | 175 | Medium | Heavy |
| Narendra Modi Stadium (Ahmedabad) | 168 | Medium | Light |
| M. Chinnaswamy (Bengaluru) | 188 | Low | None |

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Built with ❤️ using Google Antigravity IDE + Gemini 2.5 Flash*
