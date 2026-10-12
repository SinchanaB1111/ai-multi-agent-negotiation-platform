import { useMemo } from "react";
import "./LiveStanceIndicator.css";

/**
 * Calculates normalized stance percentage (0% to 100%) for an offer relative to agent preferences.
 * For minimize (buyer): 100% means optimal lowest price (target), 0% means max acceptable limit.
 * For maximize (seller): 100% means optimal highest price (target), 0% means min acceptable limit.
 */
function calculateAgentStancePercentage(agent, offerValue) {
  if (!agent?.negotiation || offerValue == null || Number.isNaN(Number(offerValue))) {
    return 50; // Fallback neutral stance
  }

  const val = Number(offerValue);
  const target = Number(agent.negotiation.targetValue);
  const isBuyer =
    agent.decisionType === "minimize" ||
    agent.role?.toLowerCase().includes("buyer") ||
    agent.role?.toLowerCase().includes("client");

  if (isBuyer) {
    const maxAcceptable = Number(
      agent.negotiation.maximumAcceptable ?? target * 1.4
    );
    if (val <= target) return 100;
    if (val >= maxAcceptable) return 15;
    const range = Math.max(1, maxAcceptable - target);
    return Math.round(100 - ((val - target) / range) * 85);
  } else {
    const minAcceptable = Number(
      agent.negotiation.minimumAcceptable ?? target * 0.6
    );
    if (val >= target) return 100;
    if (val <= minAcceptable) return 15;
    const range = Math.max(1, target - minAcceptable);
    return Math.round(15 + ((val - minAcceptable) / range) * 85);
  }
}

export function LiveStanceIndicator({
  state,
  agents = [],
  title = "Live Stance Indicators",
}) {
  const currentRound = state?.currentRound || 1;
  const offers = state?.offers || [];

  // Determine Buyer (Agent 01) and Vendor (Agent 02)
  const agentList = agents.length >= 2 ? agents : state?.agents || [];
  const buyerAgent =
    agentList.find(
      (a) =>
        a.decisionType === "minimize" ||
        a.role?.toLowerCase().includes("buyer") ||
        a.role?.toLowerCase().includes("client")
    ) || agentList[0];

  const vendorAgent =
    agentList.find(
      (a) =>
        a.decisionType === "maximize" ||
        a.role?.toLowerCase().includes("vendor") ||
        a.role?.toLowerCase().includes("seller")
    ) || agentList[1];

  // Determine total rounds to display (default at least 5)
  const maxRoundsToDisplay = Math.max(5, currentRound);
  const rounds = useMemo(
    () => Array.from({ length: maxRoundsToDisplay }, (_, i) => i + 1),
    [maxRoundsToDisplay]
  );

  // Build trend points per round
  const dataPoints = useMemo(() => {
    let lastBuyerVal = buyerAgent?.negotiation?.targetValue ?? 0;
    let lastVendorVal = vendorAgent?.negotiation?.targetValue ?? 0;

    return rounds.map((round) => {
      const buyerOfferInRound = offers
        .filter((o) => o.round === round && o.agentId === buyerAgent?.id)
        .slice(-1)[0];

      const vendorOfferInRound = offers
        .filter((o) => o.round === round && o.agentId === vendorAgent?.id)
        .slice(-1)[0];

      if (buyerOfferInRound) lastBuyerVal = buyerOfferInRound.value;
      if (vendorOfferInRound) lastVendorVal = vendorOfferInRound.value;

      const hasActivity = round <= currentRound && offers.length > 0;

      return {
        round,
        buyerStance: hasActivity
          ? calculateAgentStancePercentage(buyerAgent, lastBuyerVal)
          : null,
        vendorStance: hasActivity
          ? calculateAgentStancePercentage(vendorAgent, lastVendorVal)
          : null,
      };
    });
  }, [rounds, offers, currentRound, buyerAgent, vendorAgent]);

  // SVG Dimension Constants
  const viewBoxWidth = 800;
  const viewBoxHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  const getX = (index) => {
    if (rounds.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (rounds.length - 1)) * chartWidth;
  };

  const getY = (percentage) => {
    if (percentage == null) return null;
    const clamped = Math.max(0, Math.min(100, percentage));
    return paddingTop + chartHeight - (clamped / 100) * chartHeight;
  };

  // Build SVG Path Strings
  const buyerPath = useMemo(() => {
    const valid = dataPoints
      .map((d, i) => ({ x: getX(i), y: getY(d.buyerStance) }))
      .filter((p) => p.y !== null);
    if (!valid.length) return "";
    return valid.reduce(
      (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
      ""
    );
  }, [dataPoints]);

  const vendorPath = useMemo(() => {
    const valid = dataPoints
      .map((d, i) => ({ x: getX(i), y: getY(d.vendorStance) }))
      .filter((p) => p.y !== null);
    if (!valid.length) return "";
    return valid.reduce(
      (acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
      ""
    );
  }, [dataPoints]);

  return (
    <div className="stance-indicator-card">
      {/* Header with Title and Legend */}
      <div className="stance-header">
        <div className="stance-title-group">
          <svg
            className="stance-chart-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          <h3>{title}</h3>
          <span className="stance-info-icon" title="Normalized preference curve tracking concessions per round.">
            ⓘ
          </span>
        </div>

        <div className="stance-legend">
          <div className="stance-legend-item">
            <span className="stance-dot buyer-dot"></span>
            <span>{buyerAgent?.name || "Buyer"}</span>
          </div>
          <div className="stance-legend-item">
            <span className="stance-dot vendor-dot"></span>
            <span>{vendorAgent?.name || "Vendor"}</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="stance-svg-wrapper">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="stance-svg-chart"
          preserveAspectRatio="none"
        >
          {/* Horizontal Gridlines (0%, 25%, 50%, 75%, 100%) */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = getY(pct);
            return (
              <g key={`grid-${pct}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={viewBoxWidth - paddingRight}
                  y2={y}
                  className="stance-grid-line"
                />
                <text
                  x={paddingLeft - 12}
                  y={y + 4}
                  className="stance-axis-label"
                  textAnchor="end"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Vertical Gridlines */}
          {rounds.map((_, i) => (
            <line
              key={`vert-grid-${i}`}
              x1={getX(i)}
              y1={paddingTop}
              x2={getX(i)}
              y2={viewBoxHeight - paddingBottom}
              className="stance-vert-grid-line"
            />
          ))}

          {/* Trendlines */}
          {buyerPath && <path d={buyerPath} className="stance-line buyer-line" />}
          {vendorPath && <path d={vendorPath} className="stance-line vendor-line" />}

          {/* Data Points / Dots */}
          {dataPoints.map((d, i) => {
            const x = getX(i);
            const yBuyer = getY(d.buyerStance);
            const yVendor = getY(d.vendorStance);

            return (
              <g key={`points-${d.round}`}>
                {yBuyer !== null && (
                  <circle
                    cx={x}
                    cy={yBuyer}
                    r="5"
                    className="stance-point buyer-point"
                  >
                    <title>{`${buyerAgent?.name || "Buyer"}: ${d.buyerStance}% at Round ${d.round}`}</title>
                  </circle>
                )}
                {yVendor !== null && (
                  <circle
                    cx={x}
                    cy={yVendor}
                    r="5"
                    className="stance-point vendor-point"
                  >
                    <title>{`${vendorAgent?.name || "Vendor"}: ${d.vendorStance}% at Round ${d.round}`}</title>
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* X-Axis Round Indicators (with Active Round Pill) */}
      <div
        className="stance-rounds-row"
        style={{
          paddingLeft: `${(paddingLeft / viewBoxWidth) * 100}%`,
          paddingRight: `${(paddingRight / viewBoxWidth) * 100}%`,
        }}
      >
        {rounds.map((r) => {
          const isActive = r === currentRound;
          return (
            <div
              key={`round-label-${r}`}
              className={`stance-round-pill ${isActive ? "active-round" : ""}`}
            >
              Round {r}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveStanceIndicator;