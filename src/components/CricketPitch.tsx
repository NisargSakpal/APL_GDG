import React from "react";
import { Fielder } from "@/lib/agents";

interface CricketPitchProps {
  fielders: Fielder[];
  strikerName?: string;
  bowlerName?: string;
}

export const CricketPitch: React.FC<CricketPitchProps> = ({
  fielders = [],
  strikerName = "Striker",
  bowlerName = "Bowler",
}) => {
  // Center of our SVG coordinate system is at (150, 150)
  // Field radius is 140px.
  // The input coordinates (x, y) range from -100 to 100.
  // x: -100 (Leg-side/Left) to 100 (Off-side/Right)
  // y: -100 (Straight/Bottom) to 100 (Behind wicket/Top)
  const mapCoords = (x: number, y: number) => {
    const scale = 1.2; // Keep them within the boundary
    const cx = 150;
    const cy = 150;
    
    // Map -100..100 to -120..120
    const mappedX = cx + (x / 100) * 120 * scale;
    const mappedY = cy + (y / 100) * 120 * scale;
    
    return { x: mappedX, y: mappedY };
  };

  return (
    <div className="pitch-container">
      <svg
        viewBox="0 0 300 300"
        className="cricket-pitch-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outfield Grass */}
        <circle cx="150" cy="150" r="140" className="field-outfield" />
        
        {/* Boundary Rope */}
        <circle cx="150" cy="150" r="139" className="field-boundary" strokeDasharray="4 2" />

        {/* 30-Yard Circle */}
        <circle cx="150" cy="150" r="75" className="field-inner-circle" strokeDasharray="5 5" />

        {/* The Pitch (Center beige strip) */}
        <rect x="142" y="125" width="16" height="50" rx="2" className="field-pitch-strip" />

        {/* Crease lines */}
        <line x1="140" y1="130" x2="160" y2="130" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
        <line x1="140" y1="170" x2="160" y2="170" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />

        {/* Stumps */}
        {/* Striker end stumps (top) */}
        <line x1="146" y1="130" x2="154" y2="130" stroke="#d4af37" strokeWidth="2.5" />
        {/* Bowler end stumps (bottom) */}
        <line x1="146" y1="170" x2="154" y2="170" stroke="#d4af37" strokeWidth="2.5" />

        {/* Non-Striker / Bowler Dot */}
        <circle cx="150" cy="173" r="3.5" fill="#3b82f6" />
        <text x="150" y="183" className="pitch-player-label bowler" textAnchor="middle">
          {bowlerName || "Bowler"}
        </text>

        {/* Striker Dot */}
        <circle cx="150" cy="127" r="3.5" fill="#ef4444" />
        <text x="150" y="119" className="pitch-player-label batsman" textAnchor="middle">
          {strikerName || "Striker"}
        </text>

        {/* Keeper Dot (directly behind striker, y is positive behind striker) */}
        <circle cx="150" cy="98" r="3" fill="#10b981" />
        <text x="150" y="90" className="pitch-player-label keeper" textAnchor="middle">
          Keeper
        </text>

        {/* Fielder Dots */}
        {fielders.map((fielder, index) => {
          const { x, y } = mapCoords(fielder.x, fielder.y);
          return (
            <g key={index} className="fielder-group">
              {/* Pulsing ring for selected fielders */}
              <circle cx={x} cy={y} r="6" className="fielder-pulse" />
              
              {/* Fielder Dot */}
              <circle cx={x} cy={y} r="4" className="fielder-dot" />
              
              {/* Text label */}
              <text
                x={x}
                y={y - 7}
                className="pitch-fielder-label"
                textAnchor="middle"
              >
                {fielder.name}
              </text>
              
              {/* Custom SVG Tooltip inside SVG */}
              <title>{`${fielder.name}: ${fielder.description}`}</title>
            </g>
          );
        })}
      </svg>

      <div className="pitch-legend">
        <span className="legend-item"><span className="dot red"></span> Batsman</span>
        <span className="legend-item"><span className="dot blue"></span> Bowler</span>
        <span className="legend-item"><span className="dot green"></span> Keeper</span>
        <span className="legend-item"><span className="dot gold"></span> Fielder</span>
      </div>

      <style jsx>{`
        .pitch-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(15, 46, 27, 0.4);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(12px);
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
        }
        .cricket-pitch-svg {
          width: 100%;
          height: auto;
          max-height: 300px;
          filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));
        }
        .field-outfield {
          fill: #0b2214;
          stroke: #164627;
          stroke-width: 2px;
          transition: fill 0.3s ease;
        }
        .field-boundary {
          fill: none;
          stroke: rgba(212, 175, 55, 0.4);
          stroke-width: 1.5px;
        }
        .field-inner-circle {
          fill: none;
          stroke: rgba(255, 255, 255, 0.15);
          stroke-width: 1px;
        }
        .field-pitch-strip {
          fill: #c5a880;
          stroke: #a3875e;
          stroke-width: 0.5px;
        }
        .pitch-player-label {
          font-size: 7px;
          font-weight: bold;
          fill: #ffffff;
          font-family: 'Inter', sans-serif;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }
        .pitch-player-label.batsman {
          fill: #fca5a5;
        }
        .pitch-player-label.bowler {
          fill: #93c5fd;
        }
        .pitch-player-label.keeper {
          fill: #6ee7b7;
        }
        .pitch-fielder-label {
          font-size: 6px;
          font-weight: 500;
          fill: #e2e8f0;
          font-family: 'Inter', sans-serif;
          pointer-events: none;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
        }
        .fielder-group {
          cursor: pointer;
        }
        .fielder-dot {
          fill: #d4af37;
          stroke: #ffffff;
          stroke-width: 0.8px;
          transition: transform 0.2s ease, fill 0.2s ease;
        }
        .fielder-group:hover .fielder-dot {
          fill: #ffffff;
          transform: scale(1.3);
        }
        .fielder-pulse {
          fill: none;
          stroke: rgba(212, 175, 55, 0.4);
          stroke-width: 1px;
          animation: pulse 2s infinite;
          transform-origin: center;
        }
        .pitch-legend {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 12px;
          font-size: 10px;
          color: #a0aec0;
          font-family: 'Inter', sans-serif;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot.red { background-color: #ef4444; }
        .dot.blue { background-color: #3b82f6; }
        .dot.green { background-color: #10b981; }
        .dot.gold { background-color: #d4af37; }

        @keyframes pulse {
          0% {
            r: 5px;
            opacity: 1;
          }
          100% {
            r: 12px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
