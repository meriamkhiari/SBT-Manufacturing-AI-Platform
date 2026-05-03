"""
pipeline.py
===========
Orchestrator: called in a background thread by app.py.
Chains Agent 2 → Agent 3 → Agent 4 autonomously — zero human interaction.
"""

from agents.shared import push_log, finish_run
from agents import detectAgent, validateAgent, storeAgent


def run(run_id: str, image_data_url: str, reference: str) -> None:
    """
    True A2A chain:
      ExtractAgent already ran in the browser (scoring).
      This function drives DetectAgent -> ValidateAgent -> StoreAgent on the server.
    """
    push_log(run_id, f"Pipeline started [run: {run_id[:8]}...]", "sys")
    push_log(run_id, f"Reference: {reference}", "sys")
    push_log(run_id, "ExtractAgent done - handing off to DetectAgent", "handoff")

    try:
        # DetectAgent: vision analysis
        merged = detectAgent.run(run_id, image_data_url, reference)

        # ValidateAgent: validation + auto-correction
        corrected = validateAgent.run(run_id, merged)

        # StoreAgent: LLM agent + MCP insert
        result = storeAgent.run(run_id, corrected)

        push_log(run_id, "-------------------------------------", "sys")

        if result.get("validation_error"):
            push_log(
                run_id,
                "Pipeline finished with validation error - failure record stored",
                "warn",
            )
            finish_run(run_id, "error_stored", result)
        else:
            push_log(run_id, "Pipeline complete - all 4 agents succeeded!", "success")
            finish_run(run_id, "complete", result)

    except Exception as exc:
        push_log(run_id, f"Pipeline crashed: {exc}", "error")
        finish_run(run_id, "failed", {"error": str(exc)})
