import logging
from typing import Dict, Any, List, Optional, Tuple
from app.services.decision_logic import derive_limit_from_constraints
from app.services.llm_reasoning import parse_numeric_constraint
from app.services.concession_tracking import extract_scalar_price, get_authoritative_target

logger = logging.getLogger("negotiation_engine")

DEADLOCK_CONFIG = {
    "stalled_rounds": 3,
    "minimum_movement_ratio": 0.002,
    "repeated_offer_threshold": 2
}

def calculate_gap(current_offer: Optional[Dict[str, Any]], agents: List[Dict[str, Any]]) -> float:
    """Calculates price gap between active participants' targets or latest positions."""
    if len(agents) < 2:
        return 0.0
    
    buyer = next((a for a in agents if any(k in a.get("role", "").lower() for k in ["buyer", "employer", "finance"])), agents[0])
    vendor = next((a for a in agents if any(k in a.get("role", "").lower() for k in ["vendor", "candidate", "department"])), agents[-1])

    buyer_limit_data = derive_limit_from_constraints(buyer.get("constraints", {}))
    buyer_limit = buyer_limit_data["limit"] if buyer_limit_data else 50000.0

    vendor_limit_data = derive_limit_from_constraints(vendor.get("constraints", {}))
    vendor_limit = vendor_limit_data["limit"] if vendor_limit_data else 42000.0

    return abs(buyer_limit - vendor_limit)

def check_constraint_overlap(agents: List[Dict[str, Any]]) -> Tuple[bool, str, Optional[float], Optional[float]]:
    """
    Checks if participant hard constraints overlap.
    Returns (has_overlap, explanation, lower_bound, upper_bound).
    """
    buyer = next((a for a in agents if any(k in a.get("role", "").lower() for k in ["buyer", "employer", "finance"])), None)
    vendor = next((a for a in agents if any(k in a.get("role", "").lower() for k in ["vendor", "candidate", "department"])), None)

    if not buyer or not vendor:
        return True, "Standard agent roles present.", None, None

    buyer_limit_data = derive_limit_from_constraints(buyer.get("constraints", {}))
    vendor_limit_data = derive_limit_from_constraints(vendor.get("constraints", {}))

    if not buyer_limit_data or not vendor_limit_data:
        return True, "Sufficient constraint flexibility.", None, None

    b_limit = buyer_limit_data["limit"]
    v_limit = vendor_limit_data["limit"]

    # A feasible agreement must satisfy both agents' directions, regardless
    # of role names. A minimizer's ceiling must meet a maximizer's floor.
    if buyer_limit_data["direction"] == "minimize" and vendor_limit_data["direction"] == "maximize":
        lower_bound, upper_bound = v_limit, b_limit
    elif buyer_limit_data["direction"] == "maximize" and vendor_limit_data["direction"] == "minimize":
        lower_bound, upper_bound = b_limit, v_limit
    else:
        lower_bound, upper_bound = min(b_limit, v_limit), max(b_limit, v_limit)

    if lower_bound > upper_bound:
        return (
            False,
            f"Non-overlapping constraints: required floor (${lower_bound:,.2f}) exceeds allowed ceiling (${upper_bound:,.2f}).",
            None,
            None
        )

    return True, "Constraints overlap within feasible range.", lower_bound, upper_bound

def detect_deadlock(
    negotiation_state: Dict[str, Any],
    history: List[Dict[str, Any]],
    agents: List[Dict[str, Any]],
    scenario_id: str,
    max_rounds: int = 8
) -> Dict[str, Any]:
    """
    Evaluates negotiation stagnation and deadlock conditions.
    """
    current_round = negotiation_state.get("current_round", 0)
    current_offer = negotiation_state.get("current_offer")
    
    # 1. Non-overlapping constraint check
    has_overlap, overlap_reason, lower_bound, upper_bound = check_constraint_overlap(agents)
    if not has_overlap:
        return {
            "is_deadlock": True,
            "confidence": 1.0,
            "reason": overlap_reason,
            "stalled_rounds": current_round,
            "repeated_offers": 0,
            "gap": calculate_gap(current_offer, agents),
            "resolution_possible": False,
            "suggested_action": "declare_breakdown"
        }

    if not history or len(history) < 2:
        return {
            "is_deadlock": False,
            "confidence": 0.0,
            "reason": "Negotiation actively progressing.",
            "stalled_rounds": 0,
            "repeated_offers": 0,
            "gap": calculate_gap(current_offer, agents),
            "resolution_possible": True,
            "suggested_action": "continue"
        }

    # Extract price values per agent
    agent_offers: Dict[str, List[float]] = {}
    for entry in history:
        aid = entry.get("agent_id")
        val = extract_scalar_price(entry.get("proposed_offer")) or entry.get("value")
        if aid and val is not None:
            agent_offers.setdefault(aid, []).append(float(val))

    # 2. Check repeated identical or near-identical offers per agent
    max_repeated = 0
    for aid, values in agent_offers.items():
        if len(values) >= 2:
            repeated_count = 1
            for i in range(len(values) - 1, 0, -1):
                diff = abs(values[i] - values[i-1])
                comparison_base = max(abs(values[i]), 1.0)
                if diff / comparison_base < DEADLOCK_CONFIG["minimum_movement_ratio"]:
                    repeated_count += 1
                else:
                    break
            max_repeated = max(max_repeated, repeated_count)

    # 3. Check minimal movement / stalled rounds across global turn history
    recent_turns = history[-6:] if len(history) >= 6 else history
    total_movement = 0.0
    for i in range(1, len(recent_turns)):
        v1 = extract_scalar_price(recent_turns[i-1].get("proposed_offer")) or recent_turns[i-1].get("value")
        v2 = extract_scalar_price(recent_turns[i].get("proposed_offer")) or recent_turns[i].get("value")
        if v1 is not None and v2 is not None:
            total_movement += abs(v2 - v1)

    ref_val = extract_scalar_price(current_offer) or 50000.0
    movement_ratio = total_movement / max(ref_val, 1.0)
    
    stalled_rounds = 0
    if len(recent_turns) >= 4 and movement_ratio < DEADLOCK_CONFIG["minimum_movement_ratio"]:
        stalled_rounds = len(recent_turns) // 2

    # 4. Max rounds threshold check
    at_max_rounds = current_round >= max_rounds

    # Determine deadlock status
    is_deadlock = False
    reason = "Negotiation actively progressing."
    confidence = 0.0
    suggested_action = "continue"

    if max_repeated >= DEADLOCK_CONFIG["repeated_offer_threshold"]:
        is_deadlock = True
        confidence = 0.85
        reason = f"No meaningful movement detected for {max_repeated} consecutive turns from one or both parties."
        suggested_action = "attempt_resolution"

    elif stalled_rounds >= DEADLOCK_CONFIG["stalled_rounds"]:
        is_deadlock = True
        confidence = 0.90
        reason = f"Stalled negotiation detected over {stalled_rounds} rounds with less than 1% price movement."
        suggested_action = "attempt_resolution"

    elif at_max_rounds:
        is_deadlock = True
        confidence = 0.95
        reason = f"Reached maximum round limit of {max_rounds} without reaching an agreement."
        suggested_action = "attempt_resolution"

    return {
        "is_deadlock": is_deadlock,
        "confidence": confidence,
        "reason": reason,
        "stalled_rounds": stalled_rounds,
        "repeated_offers": max_repeated,
        "gap": calculate_gap(current_offer, agents),
        "resolution_possible": has_overlap,
        "suggested_action": suggested_action if is_deadlock else "continue"
    }

def attempt_deadlock_resolution(
    agents: List[Dict[str, Any]],
    history: List[Dict[str, Any]],
    current_offer: Optional[Dict[str, Any]],
    scenario_id: str,
    proposer_agent: Optional[Dict[str, Any]] = None
) -> Tuple[bool, Optional[Dict[str, Any]], str, Dict[str, Any]]:
    """
    Attempts a final compromise proposal when negotiation stalls.
    Returns (success, resolution_proposal, explanation, resolution_metadata).
    """
    has_overlap, overlap_reason, lower_bound, upper_bound = check_constraint_overlap(agents)
    if not has_overlap or lower_bound is None or upper_bound is None:
        meta = {
            "is_feasible": False,
            "reason": overlap_reason or "No overlap between participant constraints",
            "resolution_possible": False
        }
        return False, None, overlap_reason, meta

    buyer = next((a for a in agents if any(k in a.get("role", "").lower() for k in ["buyer", "employer", "finance"])), agents[0])
    vendor = next((a for a in agents if any(k in a.get("role", "").lower() for k in ["vendor", "candidate", "department"])), agents[-1])

    # Find latest buyer & vendor prices from history
    latest_buyer_price = None
    latest_vendor_price = None
    for item in reversed(history):
        aid = item.get("agent_id")
        val = extract_scalar_price(item.get("proposed_offer")) or item.get("value")
        if val is not None:
            if aid == buyer.get("id") and latest_buyer_price is None:
                latest_buyer_price = float(val)
            elif aid == vendor.get("id") and latest_vendor_price is None:
                latest_vendor_price = float(val)

    p1 = latest_buyer_price if latest_buyer_price is not None else upper_bound
    p2 = latest_vendor_price if latest_vendor_price is not None else lower_bound

    # Calculate midpoint
    raw_midpoint = (p1 + p2) / 2.0

    # Personality adjustment if proposer agent is specified
    if proposer_agent:
        pers = str(proposer_agent.get("personality", "")).lower()
        if "aggressive" in pers:
            # Aggressive moves 35% towards opponent position rather than 50%
            if proposer_agent.get("id") == buyer.get("id"):
                raw_midpoint = p1 + 0.35 * (p2 - p1)
            elif proposer_agent.get("id") == vendor.get("id"):
                raw_midpoint = p1 - 0.35 * (p1 - p2)

    # Strictly clamp compromise proposal within hard constraint bounds
    compromise_price = round(max(lower_bound, min(upper_bound, raw_midpoint)), 2)

    proposal = {
        "price": compromise_price,
        "terms": {},
        "resolution_type": "midpoint_compromise",
        "description": f"System compromise proposal generated at ${compromise_price:,.2f}."
    }

    explanation = (
        f"Both parties have stopped making progress. "
        f"Proposed a final compromise at ${compromise_price:,.2f} within constraints [${lower_bound:,.2f} - ${upper_bound:,.2f}]."
    )
    meta = {
        "is_feasible": True,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "proposal_price": compromise_price,
        "reason": explanation
    }

    return True, proposal, explanation, meta
