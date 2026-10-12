import os
import json
import logging
import re
import asyncio
import importlib
from typing import Dict, Any, List, Optional, Tuple
from app.config import settings
from app.schemas.response import LLMStructuredResponse
from app.services.decision_logic import rule_based_decide, decide_action
from app.services.offer_evaluation import evaluate_offer
from app.services.concession_tracking import (
    calculate_concession,
    apply_concession_control,
    get_agent_initial_position,
    get_agent_previous_position,
    extract_scalar_price
)

logger = logging.getLogger("negotiation_engine")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Roles that want to MINIMIZE the value (buyer side): pay as little as possible
MINIMIZER_ROLES = [
    "buyer", "employer", "hiring manager", "finance_director", "finance director",
    "procurement", "client", "customer", "purchaser"
]
# Roles that want to MAXIMIZE the value (seller side): earn/get as much as possible
MAXIMIZER_ROLES = [
    "vendor", "sales", "candidate", "job candidate", "department_head", "department head",
    "supplier", "contractor", "representative", "seller"
]

VALID_GEMINI_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

def sanitize_model_name(model_name: Optional[str]) -> str:
    if not model_name or not isinstance(model_name, str):
        return "gemini-1.5-flash"
    m = model_name.strip().lower()
    if "2.5" in m or "3." in m or "invalid" in m or "placeholder" in m:
        return "gemini-1.5-flash"
    return m

def _is_minimizer(role: str) -> bool:
    r = role.lower()
    return any(k in r for k in MINIMIZER_ROLES)

def _is_maximizer(role: str) -> bool:
    r = role.lower()
    return any(k in r for k in MAXIMIZER_ROLES)

def parse_numeric_constraint(constraints: Any, role: str) -> Tuple[Optional[float], Optional[float], Optional[int]]:
    """
    Extracts maximum_price, minimum_price, and quantity constraints from
    flexible constraints inputs (dict, string list, or dict list).
    """
    max_price = None
    min_price = None
    quantity = None

    if isinstance(constraints, dict):
        max_price = constraints.get("maximum_price") or constraints.get("max_price")
        min_price = constraints.get("minimum_price") or constraints.get("min_price")
        quantity = constraints.get("quantity")
    
    if isinstance(constraints, list):
        for item in constraints:
            if isinstance(item, dict):
                text = item.get("text", "")
                val = item.get("defaultValue", item.get("value"))
                if val is not None:
                    try:
                        fval = float(val)
                        if "max" in text.lower() or "maximum" in text.lower() or _is_minimizer(role):
                            if max_price is None:
                                max_price = fval
                        if "min" in text.lower() or "minimum" in text.lower() or _is_maximizer(role):
                            if min_price is None:
                                min_price = fval
                    except (ValueError, TypeError):
                        pass
                if "maximum_price" in item:
                    max_price = float(item["maximum_price"])
                if "minimum_price" in item:
                    min_price = float(item["minimum_price"])
                if "quantity" in item:
                    quantity = int(item["quantity"])
            elif isinstance(item, str):
                numbers = re.findall(r"[\d,]+", item)
                if numbers:
                    clean_num = numbers[0].replace(",", "")
                    try:
                        fval = float(clean_num)
                        if "max" in item.lower() or _is_minimizer(role):
                            if max_price is None:
                                max_price = fval
                        if "min" in item.lower() or _is_maximizer(role):
                            if min_price is None:
                                min_price = fval
                    except ValueError:
                        pass

    return max_price, min_price, quantity

def extract_offer_price(offer_input: Any) -> Optional[float]:
    """Extracts a scalar numeric price from various offer formats (dicts, Pydantic objects, numbers)."""
    return extract_scalar_price(offer_input)

def validate_agent_constraints(
    agent_profile: Dict[str, Any],
    llm_response: LLMStructuredResponse,
    opponent_offer: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    negotiation_state: Optional[Dict[str, Any]] = None
) -> Tuple[bool, str, LLMStructuredResponse]:
    """
    Constraint & Concession Control Engine.
    Validates that LLM-generated offer respects agent limits & concession step boundaries.
    Clamps excessive concessions while preserving LLM reasoning and response contract.
    """
    role = str(agent_profile.get("role", "")).lower()
    constraints = agent_profile.get("constraints", {})
    max_price, min_price, target_qty = parse_numeric_constraint(constraints, role)

    decision = llm_response.decision
    proposed_price = extract_offer_price(llm_response.offer)
    history = conversation_history or []
    state = negotiation_state or {}

    # If decision is accept, verify accepted offer doesn't violate limits
    if decision == "accept" and opponent_offer:
        opp_price = extract_offer_price(opponent_offer)
        if opp_price is not None:
            if _is_minimizer(role):
                if max_price is not None and opp_price > max_price:
                    msg = f"{role} cannot accept offer of {opp_price:,.2f} because it exceeds maximum limit of {max_price:,.2f}"
                    clamped_offer = {"price": max_price, "quantity": target_qty or 100}
                    adjusted = LLMStructuredResponse(
                        decision="counter",
                        offer=clamped_offer,
                        reasoning=f"Rejecting acceptance — opponent price {opp_price:,.2f} exceeds maximum budget {max_price:,.2f}. Countering at limit.",
                        parameters={"maximum_price": max_price, "adjusted_due_to_constraint": True}
                    )
                    return False, msg, adjusted
            elif _is_maximizer(role):
                if min_price is not None and opp_price < min_price:
                    msg = f"{role} cannot accept offer of {opp_price:,.2f} because it is below minimum floor of {min_price:,.2f}"
                    clamped_offer = {"price": min_price, "quantity": target_qty or 100}
                    adjusted = LLMStructuredResponse(
                        decision="counter",
                        offer=clamped_offer,
                        reasoning=f"Rejecting acceptance — opponent price {opp_price:,.2f} is below minimum floor {min_price:,.2f}. Countering at floor.",
                        parameters={"minimum_price": min_price, "adjusted_due_to_constraint": True}
                    )
                    return False, msg, adjusted

    # If decision is counter, validate counteroffer price via Concession Control Layer
    if decision == "counter" and proposed_price is not None:
        agent_id = agent_profile.get("id", "")
        prev_price = get_agent_previous_position(history, agent_id)
        init_pos = get_agent_initial_position(history, agent_id)

        final_price, was_clamped, adj_reason = apply_concession_control(
            agent_profile=agent_profile,
            proposed_price=proposed_price,
            previous_price=prev_price,
            initial_position=init_pos,
            negotiation_state=state
        )

        if was_clamped:
            params = dict(llm_response.parameters or {})
            params.update({
                "adjusted_due_to_concession_control": True,
                "original_proposed": proposed_price,
                "clamped_price": final_price,
                "control_reason": adj_reason
            })
            clamped_offer = {"price": final_price, "quantity": target_qty or 100}
            adjusted = LLMStructuredResponse(
                decision="counter",
                offer=clamped_offer,
                reasoning=f"{llm_response.reasoning} [Concession Control: {adj_reason}]",
                parameters=params
            )
            return False, adj_reason, adjusted

    return True, "Constraints & concessions within valid boundaries", llm_response

def mock_llm_reasoning(
    agent_profile: Dict[str, Any],
    negotiation_state: Dict[str, Any],
    conversation_history: List[Dict[str, Any]],
    opponent_offer: Optional[Dict[str, Any]]
) -> LLMStructuredResponse:
    """
    Deterministic rule-based negotiation reasoning fallback. Fast and lightweight.
    """
    role = str(agent_profile.get("role", "")).lower()
    persona = agent_profile.get("persona") or agent_profile.get("personality") or "Collaborative"
    constraints = agent_profile.get("constraints", {})
    max_price, min_price, quantity = parse_numeric_constraint(constraints, role)
    round_num = negotiation_state.get("current_round", 1)
    max_rounds = negotiation_state.get("max_rounds", 8)

    # 1. Perform structured offer evaluation
    eval_res = evaluate_offer(agent_profile, opponent_offer, negotiation_state, conversation_history)
    direction = eval_res.direction
    limit = eval_res.limit_price

    # 2. Extract agent's own previous offer position
    agent_id = agent_profile.get("id", "")
    own_history = [h for h in conversation_history if h.get("agent_id") == agent_id]
    last_own_price = extract_offer_price(own_history[-1].get("proposed_offer")) if own_history else (
        limit * 0.85 if direction == "minimize" else limit * 1.15
    )

    # 3. Apply Decision Logic Engine
    decision_info = decide_action(
        evaluation_result=eval_res,
        personality=persona,
        own_last_value=last_own_price,
        round_num=round_num,
        max_rounds=max_rounds
    )

    decision = decision_info["decision"]
    next_val = decision_info["next_value"]
    reasoning = decision_info["reasoning"]

    params = dict(eval_res.metrics)
    params.update({"evaluation_summary": eval_res.evaluation_summary})

    return LLMStructuredResponse(
        decision=decision,
        offer={"price": round(next_val, 2), "quantity": quantity or 100},
        reasoning=reasoning,
        parameters=params
    )

def build_system_prompt(agent_profile: Dict[str, Any]) -> str:
    """Builds system prompt for the specified agent persona & profile."""
    name = agent_profile.get("name", "Negotiation Agent")
    role = agent_profile.get("role", "Negotiator")
    persona = agent_profile.get("persona") or agent_profile.get("personality") or "Professional negotiator"
    goals = agent_profile.get("goals", [])
    constraints = agent_profile.get("constraints", {})
    objectives = agent_profile.get("negotiation_objectives", [])

    is_minimizer = _is_minimizer(role)
    direction_hint = (
        "You want to MINIMIZE the value (pay/approve as LITTLE as possible). Never go ABOVE your maximum limit."
        if is_minimizer else
        "You want to MAXIMIZE the value (earn/secure as MUCH as possible). Never go BELOW your minimum floor."
    )

    return f"""You are acting strictly as {name} (Role: {role}).
Persona/Personality: {persona}

Your Negotiation Direction: {direction_hint}

Your Strategic Goals:
{json.dumps(goals, indent=2)}

Your Strict Constraints & Limits:
{json.dumps(constraints, indent=2)}

Your Specific Negotiation Objectives:
{json.dumps(objectives, indent=2)}

CRITICAL INSTRUCTIONS:
1. Evaluate the opponent's latest offer using the target, hard boundary, previous position, round, and remaining bargaining room.
2. Decide Accept, Counter, or Reject.
3. When countering, make a realistic, measured movement from your previous position toward the opponent; do not jump straight to the opponent's number or hard limit unless the evidence supports it.
4. Preserve bargaining room in early rounds. As the deadline approaches, you may become more flexible.
5. Treat the target as the preferred outcome and the minimum/maximum constraint as a hard boundary. They are not interchangeable.
6. If you make a concession, prefer linking it to a reciprocal term when the conversation contains one.
7. Reasoning must be concise and evidence-based: mention the relevant offer, target/limit, movement, and negotiation objective. Do NOT reveal private chain-of-thought or hidden model reasoning.
8. NEVER violate your numeric limits.
9. Output JSON ONLY matching this schema:
{{
  "decision": "counter" | "accept" | "reject",
  "offer": {{
    "price": <numeric_value>,
    "quantity": <numeric_quantity>
  }},
  "reasoning": "<concise explanation>",
  "parameters": {{
    "target_price": <value>,
    "maximum_price": <value or null>,
    "minimum_price": <value or null>
  }}
}}
Do NOT wrap in markdown backticks or add extraneous text."""

def _is_valid_api_key(api_key: str, provider: str) -> bool:
    if not api_key or not isinstance(api_key, str):
        return False
    k = api_key.strip()
    if k.startswith("AQ.") or "placeholder" in k.lower() or "your_api_key" in k.lower() or len(k) < 20:
        return False
    if provider == "gemini":
        return k.startswith("AIzaSy")
    if provider == "openai":
        return k.startswith("sk-")
    return True

async def generate_agent_response(
    agent_profile: Dict[str, Any],
    negotiation_state: Dict[str, Any],
    conversation_history: List[Dict[str, Any]],
    opponent_offer: Optional[Dict[str, Any]] = None
) -> LLMStructuredResponse:
    """
    High-Performance LLM Reasoning Function.
    Features fast validation, async offloading, model name sanitization, and sub-second fallback timeouts.
    """
    api_key = settings.LLM_API_KEY or os.environ.get("LLM_API_KEY", "")
    provider = (settings.LLM_PROVIDER or "gemini").lower()

    # Fast check: If no valid API key format or provider is mock, fallback to fast mock LLM immediately (<0.01s)
    if not _is_valid_api_key(api_key, provider) or provider == "mock":
        response = mock_llm_reasoning(agent_profile, negotiation_state, conversation_history, opponent_offer)
        valid, msg, validated_response = validate_agent_constraints(agent_profile, response, opponent_offer, conversation_history, negotiation_state)
        return validated_response

    # Perform Offer Evaluation & Concession Context Lookup
    eval_result = evaluate_offer(agent_profile, opponent_offer, negotiation_state, conversation_history)
    agent_id = agent_profile.get("id", "")
    init_pos = get_agent_initial_position(conversation_history, agent_id)
    prev_pos = get_agent_previous_position(conversation_history, agent_id)
    concession_ctx = calculate_concession(
        agent_profile=agent_profile,
        previous_offer=prev_pos,
        current_offer=prev_pos,
        negotiation_state=negotiation_state,
        initial_position=init_pos
    )

    system_prompt = build_system_prompt(agent_profile)
    user_prompt = f"""Current Negotiation Context:
- Round: {negotiation_state.get('current_round', 1)} of {negotiation_state.get('max_rounds', 8)}
- Initial Position: {concession_ctx.get('initial_position')}
- Target Position: {concession_ctx.get('target_position')}
- Acceptable Limit: {eval_result.limit_price} ({eval_result.direction})
- Your Previous Offer: {prev_pos}
- Opponent Latest Offer: {json.dumps(opponent_offer) if opponent_offer else "None (Opening Turn)"}
- Cumulative True Concession: {concession_ctx.get('cumulative_concession')}
- Remaining Concession Capacity: {concession_ctx.get('remaining_concession_capacity')}
- Evaluation Summary: {eval_result.evaluation_summary}
- Gap to Target: {eval_result.gap_to_target}
- Gap to Hard Limit: {eval_result.gap_to_limit}

Strategic Concession Directives:
- Do not exceed acceptable limit boundary ({eval_result.limit_price}).
- Treat {concession_ctx.get('target_position')} as the preferred target, not the hard limit.
- Consider previous concessions and avoid excessive price jumps.
- Respect remaining concession capacity ({concession_ctx.get('remaining_concession_capacity')}).
- Make gradual, measured concessions across rounds.
- If you counter, explain why the new value is proportionate to the current gap and what bargaining room remains.

Conversation History:
{json.dumps(conversation_history, indent=2)}

Generate response as JSON now."""

    requested_model = (
        agent_profile.get("model") or
        agent_profile.get("llm_model") or
        negotiation_state.get("model") or
        settings.LLM_MODEL
    )

    clean_req_model = sanitize_model_name(requested_model)

    async def _execute_llm_call() -> str:
        if provider == "gemini":
            try:
                genai_mod = importlib.import_module("google.generativeai")
                genai_mod.configure(api_key=api_key)

                models_to_try = [clean_req_model] + [m for m in VALID_GEMINI_MODELS if m != clean_req_model]

                for target_model in models_to_try:
                    try:
                        gmodel = genai_mod.GenerativeModel(target_model)
                        res = await asyncio.to_thread(gmodel.generate_content, f"{system_prompt}\n\n{user_prompt}")
                        if res and hasattr(res, "text") and res.text:
                            return res.text
                    except Exception as model_err:
                        logger.warning(f"Gemini API call to {target_model} failed ({model_err}). Fast aborting to fallback.")
                        break
            except (ImportError, Exception) as genai_err:
                logger.warning(f"Google GenAI client import/init error: {genai_err}")
                return ""
            return ""

        elif provider == "openai":
            try:
                openai_mod = importlib.import_module("openai")
                client = openai_mod.OpenAI(api_key=api_key)
                res = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=requested_model or "gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                return res.choices[0].message.content or ""
            except (ImportError, Exception) as openai_err:
                logger.warning(f"OpenAI client import/call error: {openai_err}")
                return ""

        return ""

    try:
        # Enforce 1.5 second maximum timeout to guarantee ultra-fast execution response
        raw_response_text = await asyncio.wait_for(_execute_llm_call(), timeout=1.5)

        if not raw_response_text:
            raise RuntimeError("Empty response from LLM call.")

        cleaned_json = raw_response_text.strip()
        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:]
        if cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:]
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3]
        cleaned_json = cleaned_json.strip()

        data = json.loads(cleaned_json)
        parsed_response = LLMStructuredResponse(**data)

    except Exception as exc:
        logger.warning(f"Fast Fallback Triggered ({type(exc).__name__}). Using fast reasoning engine.")
        parsed_response = mock_llm_reasoning(agent_profile, negotiation_state, conversation_history, opponent_offer)

    # Perform Constraint & Concession Validation
    valid, msg, final_response = validate_agent_constraints(agent_profile, parsed_response, opponent_offer, conversation_history, negotiation_state)
    return final_response
