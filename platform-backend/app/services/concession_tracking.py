import re
from typing import Dict, Any, List, Optional, Tuple
from app.services.decision_logic import derive_limit_from_constraints, derive_direction_from_goal

CONCESSION_RATE = {
    "Aggressive": 0.10,
    "Collaborative": 0.35,
    "Risk-averse": 0.25,
}

MAX_STEP_RATIO = {
    "Aggressive": 0.15,
    "Collaborative": 0.35,
    "Risk-averse": 0.25,
}

def extract_scalar_price(offer_input: Any) -> Optional[float]:
    """Extracts a scalar numeric price from various offer formats."""
    if offer_input is None:
        return None
    if isinstance(offer_input, (int, float)):
        return float(offer_input)
    if hasattr(offer_input, "price") and getattr(offer_input, "price") is not None:
        try:
            return float(getattr(offer_input, "price"))
        except (ValueError, TypeError):
            pass
    if hasattr(offer_input, "value") and getattr(offer_input, "value") is not None:
        try:
            return float(getattr(offer_input, "value"))
        except (ValueError, TypeError):
            pass
    if isinstance(offer_input, dict):
        if "price" in offer_input and offer_input["price"] is not None:
            try:
                return float(offer_input["price"])
            except (ValueError, TypeError):
                pass
        if "value" in offer_input and offer_input["value"] is not None:
            try:
                return float(offer_input["value"])
            except (ValueError, TypeError):
                pass
    return None


def get_authoritative_target(
    agent_profile: Dict[str, Any],
    limit: Optional[float] = None,
    direction: Optional[str] = None
) -> float:
    """
    Step 2: Authoritative Target Position Resolver.
    Ensures all modules (Offer Evaluation, Decision Logic, Concession Tracking, Analytics, Reports)
    use the EXACT same target position.
    """
    target = agent_profile.get("target_price") or agent_profile.get("target_position")
    if target is not None:
        try:
            return float(target)
        except (ValueError, TypeError):
            pass

    # Extract target from objectives or goals text
    objectives = agent_profile.get("negotiation_objectives", [])
    goals = agent_profile.get("goals", [])
    combined = [str(x) for x in (objectives if isinstance(objectives, list) else []) + (goals if isinstance(goals, list) else [])]

    for item in combined:
        match = re.search(r"target\s*(?:price|val|cost|amount)?\s*(?:is|=|:)?\s*\$?([\d,]+)", item, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                pass
        match_num = re.search(r"\$?([\d,]+)", item)
        if match_num and "target" in item.lower():
            try:
                return float(match_num.group(1).replace(",", ""))
            except ValueError:
                pass

    # Fallback calculation if target is not explicitly set in agent profile
    if limit is None:
        constraints = agent_profile.get("constraints", {})
        derived = derive_limit_from_constraints(constraints)
        if derived:
            limit = derived.get("limit")
            direction = direction or derived.get("direction")
        else:
            direction = direction or agent_profile.get("direction") or derive_direction_from_goal(agent_profile.get("goals", ""), "minimize")
            limit = 85000.0 if direction == "minimize" else 80000.0

    if direction == "minimize":
        return round(limit * 0.85, 2)
    else:
        return round(limit * 1.15, 2)


def get_agent_initial_position(history: List[Dict[str, Any]], agent_id: str) -> Optional[float]:
    """
    Finds the permanent initial offer position for a given agent from history.
    Initial position is stored from the agent's very first offer and is NEVER overwritten.
    """
    for entry in history:
        if entry.get("agent_id") == agent_id:
            val = extract_scalar_price(entry.get("proposed_offer"))
            if val is None:
                val = entry.get("value")
            if val is not None:
                return float(val)
    return None


def get_agent_previous_position(history: List[Dict[str, Any]], agent_id: str) -> Optional[float]:
    """Finds the most recent offer position for a given agent from history."""
    for entry in reversed(history):
        if entry.get("agent_id") == agent_id:
            val = extract_scalar_price(entry.get("proposed_offer"))
            if val is None:
                val = entry.get("value")
            if val is not None:
                return float(val)
    return None


def get_agent_concession_count(history: List[Dict[str, Any]], agent_id: str) -> int:
    """Counts the number of previous offers made by the agent."""
    return sum(1 for entry in history if entry.get("agent_id") == agent_id)


def calculate_rate_of_concession_decay(concession_sizes: List[float]) -> Optional[float]:
    """
    Step 8: Rate of Concession Decay Calculation.
    Measures how the size of concessions decreases over successive rounds.
    
    Formula:
    decay_rate = (average(early concessions) - average(recent concessions)) / average(early concessions) * 100
    
    Returns:
      - float percentage (e.g. 50.0 for 50% decay)
      - 0.0 if concessions are constant
      - negative float if concessions are increasing
      - None if fewer than 2 concessions exist or data is insufficient
    """
    valid_sizes = [c for c in concession_sizes if c is not None and isinstance(c, (int, float))]
    if len(valid_sizes) < 2:
        return None

    n = len(valid_sizes)
    mid = n // 2
    early = valid_sizes[:mid]
    recent = valid_sizes[mid:]

    avg_early = sum(early) / len(early)
    avg_recent = sum(recent) / len(recent)

    if avg_early == 0.0:
        return 0.0 if avg_recent == 0.0 else None

    decay_rate = ((avg_early - avg_recent) / avg_early) * 100.0
    return round(decay_rate, 2)


def calculate_concession(
    agent_profile: Dict[str, Any],
    previous_offer: Optional[Any],
    current_offer: Any,
    negotiation_state: Optional[Dict[str, Any]] = None,
    initial_position: Optional[float] = None
) -> Dict[str, Any]:
    """
    Steps 3, 4, 5, 6, 7, 8, 9, 11 — Single Authoritative Concession Calculation.
    Calculates role-aware true step concession, direction, cumulative concession sum,
    concession percentage, concession velocity, rate of decay, and remaining capacity.
    """
    role = str(agent_profile.get("role", "")).lower()
    constraints = agent_profile.get("constraints", {})
    derived = derive_limit_from_constraints(constraints)

    direction = agent_profile.get("direction")
    if not direction:
        direction = derived.get("direction") if derived else derive_direction_from_goal(agent_profile.get("goals", ""), "minimize")

    limit = agent_profile.get("limit")
    if limit is None:
        limit = derived.get("limit") if derived else (85000.0 if direction == "minimize" else 80000.0)

    # Step 2: Authoritative target position
    target_pos = get_authoritative_target(agent_profile, limit, direction)

    curr_val = extract_scalar_price(current_offer)
    prev_val = extract_scalar_price(previous_offer)

    if curr_val is None:
        curr_val = 0.0

    # Permanent Initial position lookup
    if initial_position is None:
        initial_position = prev_val if prev_val is not None else curr_val

    # Step 3 & 5: Role-aware Direction & True Concession Calculation
    # A TRUE CONCESSION is movement TOWARD the target/agreement zone.
    # BUYER (minimize): price decrease (curr_val < prev_val) is toward target.
    # VENDOR (maximize): price increase (curr_val > prev_val) is toward target.
    is_concession = False
    concession_amount = 0.0
    step_percentage = 0.0
    concession_dir = "no_change"

    if prev_val is not None:
        if curr_val == prev_val:
            concession_dir = "no_change"
            concession_amount = 0.0
            is_concession = False
        elif direction == "minimize":  # BUYER / PAYER
            if curr_val < prev_val:
                if prev_val > target_pos:
                    concession_dir = "toward_target"
                    concession_amount = round(prev_val - curr_val, 2)
                    is_concession = True
                else:
                    concession_dir = "away_from_target"
                    concession_amount = 0.0
                    is_concession = False
            else:  # curr_val > prev_val (Buyer conceding higher amount to Vendor)
                if curr_val <= limit:
                    concession_dir = "toward_target"
                    concession_amount = round(curr_val - prev_val, 2)
                    is_concession = True
                else:
                    concession_dir = "away_from_target"
                    concession_amount = 0.0
                    is_concession = False
        else:  # VENDOR / SELLER (maximize)
            if curr_val > prev_val:
                if prev_val < target_pos:
                    concession_dir = "toward_target"
                    concession_amount = round(curr_val - prev_val, 2)
                    is_concession = True
                else:
                    concession_dir = "away_from_target"
                    concession_amount = 0.0
                    is_concession = False
            else:  # curr_val < prev_val (Vendor conceding lower price to Buyer)
                if curr_val >= limit:
                    concession_dir = "toward_target"
                    concession_amount = round(prev_val - curr_val, 2)
                    is_concession = True
                else:
                    concession_dir = "away_from_target"
                    concession_amount = 0.0
                    is_concession = False

        if is_concession and prev_val != 0:
            step_percentage = round((concession_amount / abs(prev_val)) * 100, 2)

    # Step 6 & 7: Cumulative Concession Sum (Sum of TRUE concessions only)
    agent_id = agent_profile.get("id")
    history = (negotiation_state.get("history") if negotiation_state else None) or []
    true_concession_sizes = []

    if history and agent_id:
        # Sum true concessions from history
        agent_turns = [h for h in history if h.get("agent_id") == agent_id]
        running_prev = None
        for turn in agent_turns:
            t_val = extract_scalar_price(turn.get("proposed_offer"))
            if t_val is None:
                t_val = turn.get("value")
            if t_val is not None:
                if running_prev is not None:
                    if direction == "minimize":
                        if t_val > running_prev and t_val <= limit:
                            true_concession_sizes.append(round(t_val - running_prev, 2))
                        elif t_val < running_prev and running_prev > target_pos:
                            true_concession_sizes.append(round(running_prev - t_val, 2))
                    elif direction == "maximize":
                        if t_val < running_prev and t_val >= limit:
                            true_concession_sizes.append(round(running_prev - t_val, 2))
                        elif t_val > running_prev and running_prev < target_pos:
                            true_concession_sizes.append(round(t_val - running_prev, 2))
                running_prev = float(t_val)
        
        # Include current turn if not already in history
        if is_concession:
            true_concession_sizes.append(concession_amount)

        cumulative_concession = round(sum(true_concession_sizes), 2)
    else:
        # Fallback cumulative concession formula
        if direction == "minimize":
            cumulative_concession = round(curr_val - initial_position, 2) if (initial_position and curr_val > initial_position) else 0.0
        else:
            cumulative_concession = round(initial_position - curr_val, 2) if (initial_position and curr_val < initial_position) else 0.0
        if is_concession:
            true_concession_sizes = [concession_amount]

    cumulative_percentage = round((cumulative_concession / abs(initial_position)) * 100, 2) if (initial_position and initial_position != 0) else 0.0

    # Step 8: Rate of Concession Decay
    decay_rate = calculate_rate_of_concession_decay(true_concession_sizes)

    # Step 9: Concession Velocity
    current_round = (negotiation_state.get("current_round") if negotiation_state else 1) or 1
    concession_velocity = round(cumulative_concession / current_round, 2) if current_round > 0 else 0.0

    # Step 11: Remaining Concession Capacity
    if direction == "minimize":
        remaining_capacity = max(round(limit - curr_val, 2), 0.0)
        is_valid = (curr_val <= limit)
    else:
        remaining_capacity = max(round(curr_val - limit, 2), 0.0)
        is_valid = (curr_val >= limit)

    persona = agent_profile.get("persona") or agent_profile.get("personality") or "Collaborative"
    max_rate = MAX_STEP_RATIO.get(persona, 0.25)
    base = max(abs(initial_position or curr_val or 1.0), abs(limit), 1.0)
    maximum_allowed_concession = round(base * max_rate, 2)

    return {
        "initial_position": initial_position,
        "target_position": target_pos,
        "current_position": curr_val,
        "previous_position": prev_val,
        "current_round": current_round,
        "concession_amount": concession_amount,
        "concession_percentage": step_percentage,
        "cumulative_concession": cumulative_concession,
        "cumulative_concession_percentage": cumulative_percentage,
        "concession_sum": cumulative_concession,
        "concession_velocity": concession_velocity,
        "rate_of_concession_decay": decay_rate,
        "is_concession": is_concession,
        "last_concession": concession_amount,
        "maximum_allowed_concession": maximum_allowed_concession,
        "remaining_concession": remaining_capacity,
        "remaining_concession_capacity": remaining_capacity,
        "concession_direction": concession_dir,
        "concession_count": len(true_concession_sizes),
        "is_valid": is_valid
    }


def generate_concession_analysis(
    agent_profile: Dict[str, Any],
    history: List[Dict[str, Any]],
    negotiation_state: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Step 10 & 12: Comprehensive Concession Analysis & Data-Driven Personality Analysis.
    Calculates complete deterministic metrics and generates qualitative interpretation.
    """
    agent_id = agent_profile.get("id", "")
    role = str(agent_profile.get("role", "")).lower()
    persona = agent_profile.get("persona") or agent_profile.get("personality") or "Collaborative"
    constraints = agent_profile.get("constraints", {})
    derived = derive_limit_from_constraints(constraints)
    direction = agent_profile.get("direction") or (derived.get("direction") if derived else derive_direction_from_goal(agent_profile.get("goals", ""), "minimize"))
    limit = agent_profile.get("limit") or (derived.get("limit") if derived else (85000.0 if direction == "minimize" else 80000.0))
    target = get_authoritative_target(agent_profile, limit, direction)

    init_pos = get_agent_initial_position(history, agent_id)
    prev_pos = get_agent_previous_position(history, agent_id)
    current_round = (negotiation_state.get("current_round", 1) if negotiation_state else len(history)) or 1

    last_calc = calculate_concession(
        agent_profile=agent_profile,
        previous_offer=prev_pos,
        current_offer=prev_pos,
        negotiation_state=negotiation_state or {"history": history, "current_round": current_round},
        initial_position=init_pos
    )

    # Extract all true concessions made by this agent
    agent_offers = []
    for turn in history:
        if turn.get("agent_id") == agent_id:
            val = extract_scalar_price(turn.get("proposed_offer"))
            if val is None:
                val = turn.get("value")
            if val is not None:
                agent_offers.append(float(val))

    true_concessions = []
    for i in range(1, len(agent_offers)):
        prev = agent_offers[i-1]
        curr = agent_offers[i]
        if direction == "minimize":
            if curr > prev and curr <= limit:
                true_concessions.append(round(curr - prev, 2))
            elif curr < prev and prev > target:
                true_concessions.append(round(prev - curr, 2))
        elif direction == "maximize":
            if curr < prev and curr >= limit:
                true_concessions.append(round(prev - curr, 2))
            elif curr > prev and prev < target:
                true_concessions.append(round(curr - prev, 2))

    total_concession = round(sum(true_concessions), 2)
    avg_concession = round(total_concession / len(true_concessions), 2) if true_concessions else 0.0
    largest_concession = max(true_concessions) if true_concessions else 0.0
    smallest_concession = min(true_concessions) if true_concessions else 0.0
    concession_count = len(true_concessions)
    decay_rate = calculate_rate_of_concession_decay(true_concessions)
    velocity = round(total_concession / current_round, 2) if current_round > 0 else 0.0
    curr_pos = agent_offers[-1] if agent_offers else (init_pos or 0.0)

    remaining_capacity = max(round(limit - curr_pos, 2), 0.0) if direction == "minimize" else max(round(curr_pos - limit, 2), 0.0)

    # Generate Data-Driven Qualitative Interpretation (Step 10 & 12)
    interpretations = []
    if concession_count == 0:
        interpretations.append("Insufficient concession data for decay analysis.")
    else:
        if decay_rate is not None:
            if decay_rate > 20.0:
                interpretations.append(f"Agent is making increasingly smaller concessions (Decay: {decay_rate}%).")
                interpretations.append("Agent is becoming more firm.")
            elif decay_rate > 0.0:
                interpretations.append(f"Concessions are gradually decreasing over time ({decay_rate}% decay).")
            elif decay_rate < 0.0:
                interpretations.append(f"Agent is conceding rapidly with expanding step sizes ({abs(decay_rate)}% acceleration).")
            else:
                interpretations.append("Agent is making consistent, steady-sized concessions across rounds.")

        if remaining_capacity <= 0.0:
            interpretations.append("Agent has reached its hard acceptable constraint limit.")
        elif remaining_capacity < (abs(limit) * 0.05):
            interpretations.append("Agent has nearly reached its acceptable limit.")

    # Persona alignment note
    if persona == "Aggressive" and (concession_count == 0 or avg_concession < 1000):
        interpretations.append("Personality reflected: Small and infrequent concessions (Aggressive).")
    elif persona == "Collaborative" and avg_concession >= 1000:
        interpretations.append("Personality reflected: Moderate and consistent concessions (Collaborative).")
    elif persona == "Risk-Averse" and remaining_capacity > (abs(limit) * 0.1):
        interpretations.append("Personality reflected: Strong boundary protection and measured steps (Risk-Averse).")

    interpretation_str = " ".join(interpretations)

    return {
        "agent_id": agent_id,
        "persona": persona,
        "initial_position": init_pos,
        "target_position": target,
        "current_position": curr_pos,
        "total_concession": total_concession,
        "concession_sum": total_concession,
        "average_concession": avg_concession,
        "largest_concession": largest_concession,
        "smallest_concession": smallest_concession,
        "concession_count": concession_count,
        "concession_velocity": velocity,
        "rate_of_concession_decay": decay_rate,
        "remaining_concession_capacity": remaining_capacity,
        "interpretation": interpretation_str
    }


def apply_concession_control(
    agent_profile: Dict[str, Any],
    proposed_price: float,
    previous_price: Optional[float],
    initial_position: Optional[float],
    negotiation_state: Dict[str, Any]
) -> Tuple[float, bool, str]:
    """
    Concession Control Layer.
    Validates and clamps proposed counteroffer price to enforce:
    1. Maximum single step concession (prevent unrealistic jumps)
    2. Hard constraint limits (Buyer <= maximum_price, Vendor >= minimum_price)
    3. Gradual concession rules across rounds
    4. Preventing backward movement / oscillation if inconsistent
    """
    role = str(agent_profile.get("role", "")).lower()
    constraints = agent_profile.get("constraints", {})
    derived = derive_limit_from_constraints(constraints)

    direction = agent_profile.get("direction")
    if not direction:
        direction = derived.get("direction") if derived else derive_direction_from_goal(agent_profile.get("goals", ""), "minimize")

    limit = agent_profile.get("limit")
    if limit is None:
        limit = derived.get("limit") if derived else (85000.0 if direction == "minimize" else 80000.0)

    persona = agent_profile.get("persona") or agent_profile.get("personality") or "Collaborative"
    round_num = negotiation_state.get("current_round", 1)

    final_price = proposed_price
    was_clamped = False
    reasons = []

    # 1. Hard Limit Constraint Enforcement
    if direction == "minimize":  # BUYER
        if final_price > limit:
            final_price = limit
            was_clamped = True
            reasons.append(f"Clamped proposed {proposed_price:,.2f} — violates maximum constraint of {limit:,.2f}.")
    else:  # VENDOR
        if final_price < limit:
            final_price = limit
            was_clamped = True
            reasons.append(f"Clamped proposed {proposed_price:,.2f} — violates minimum floor of {limit:,.2f}.")

    # 2. Step Concession Control (Prevent unrealistic single-round jumps)
    if previous_price is not None:
        step_move = abs(final_price - previous_price)
        max_ratio = MAX_STEP_RATIO.get(persona, 0.25)

        remaining_dist = abs(limit - previous_price)
        max_step = max(remaining_dist * max_ratio, abs(previous_price) * 0.05, 500.0)

        # Early rounds (Round 1-2): enforce stricter gradual concession limits
        if round_num <= 2:
            max_step = min(max_step, remaining_dist * 0.30 if remaining_dist > 0 else max_step)

        if step_move > max_step:
            if direction == "minimize":
                # Buyer moving up toward limit
                if final_price > previous_price:
                    clamped = previous_price + max_step
                    if clamped <= limit:
                        final_price = round(clamped, 2)
                        was_clamped = True
                        reasons.append(f"Gradual concession rule: capped Buyer move to max step ${max_step:,.2f} (from ${previous_price:,.2f} to ${final_price:,.2f}).")
            else:
                # Vendor moving down toward limit
                if final_price < previous_price:
                    clamped = previous_price - max_step
                    if clamped >= limit:
                        final_price = round(clamped, 2)
                        was_clamped = True
                        reasons.append(f"Gradual concession rule: capped Vendor move to max step ${max_step:,.2f} (from ${previous_price:,.2f} to ${final_price:,.2f}).")

    reason_str = " ".join(reasons) if reasons else "Concession within valid boundaries."
    return round(final_price, 2), was_clamped, reason_str
