
"""
qc_pipeline_runner.py
====================
Orchestrator for Part B: QC Conformity Pipeline.
Chains extractReference -> describeUser -> pipelineEvaluator -> JudgeMatch.
"""

from agents.shared import push_log, finish_run, metrics_tracker
from agents import extractReference, describeUser, pipelineEvaluator, JudgeMatch

def run(run_id: str, image_data_url: str, reference: str) -> None:
    """
    QC Orchestration Pipeline (Part B)
    """
    push_log(run_id, f"QC Pipeline started [run: {run_id[:8]}...]", "sys")
    push_log(run_id, f"Reference: {reference}", "sys")
    
    try:
        # Step 1: extractReference (from MongoDB)
        ref_data = extractReference.run(run_id, reference)
        
        # Step 2: describeUser (from Live Photo)
        user_data = describeUser.run(run_id, image_data_url, reference)
        
        # Step 3: pipelineEvaluator (structure check)
        is_consistent = pipelineEvaluator.run(run_id, ref_data, user_data)
        
        if not is_consistent:
             push_log(run_id, "Data structure inconsistency detected. Stopping match process.", "error")
             finish_run(run_id, "failed", {"error": "DATA_STRUCTURE_INCONSISTENCY"})
             return
             
        # Step 4: JudgeMatch
        result = JudgeMatch.run(run_id, ref_data, user_data)
        
        # Add metrics to result
        result["metrics"] = metrics_tracker.get_metrics(run_id)
        result["total_cost"] = metrics_tracker.get_total_cost() # Placeholder cost
        
        push_log(run_id, "-------------------------------------", "sys")
        push_log(run_id, "QC Pipeline complete!", "success")
        finish_run(run_id, "complete", result)

    except Exception as exc:
        push_log(run_id, f"QC Pipeline crashed: {exc}", "error")
        finish_run(run_id, "failed", {"error": str(exc)})
