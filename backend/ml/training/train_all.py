"""
Unified training pipeline: export data + train all models.
Called by NestJS MLTrainingService via child_process.

Outputs JSON to stdout for NestJS to parse progress/results.
All print() goes to stderr to keep stdout clean for JSON.

Usage:
    python train_all.py                   # Run all steps
    python train_all.py --steps demand,baskets  # Run specific steps
"""

import json
import os
import subprocess
import sys
import time
import traceback

# Redirect normal prints to stderr
_original_stdout = sys.stdout
sys.stdout = sys.stderr

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON = sys.executable  # Use same Python that runs this script
sys.path.insert(0, os.path.join(BASE_DIR, ".."))

# Diagnostic: log which Python and key info at startup
print(f"[DEBUG] train_all.py started", file=sys.stderr)
print(f"[DEBUG] Python executable: {PYTHON}", file=sys.stderr)
print(f"[DEBUG] Python version: {sys.version}", file=sys.stderr)
print(f"[DEBUG] BASE_DIR: {BASE_DIR}", file=sys.stderr)
try:
    import pandas as _pd
    print(f"[DEBUG] pandas OK: {_pd.__file__}", file=sys.stderr)
except ImportError as _e:
    print(f"[DEBUG] pandas NOT found: {_e}", file=sys.stderr)


def emit(event: str, data: dict = None):
    """Emit a JSON event to stdout for NestJS to consume."""
    payload = {"event": event, "timestamp": time.time()}
    if data:
        payload.update(data)
    _original_stdout.write(json.dumps(payload) + "\n")
    _original_stdout.flush()


def run_script(script_name: str) -> tuple[bool, str]:
    """Run a training script as a subprocess. Returns (success, error_message)."""
    script_path = os.path.join(BASE_DIR, script_name)
    if not os.path.exists(script_path):
        return False, f"Script not found: {script_name}"

    result = subprocess.run(
        [PYTHON, script_path],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
        timeout=600,  # 10 min per script max
        env={**os.environ},
    )

    # Print script output to stderr for debugging
    if result.stdout:
        print(result.stdout, file=sys.stderr)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    if result.returncode != 0:
        error_msg = result.stderr.strip().split("\n")[-1] if result.stderr else f"Exit code {result.returncode}"
        return False, error_msg

    return True, ""


def run_export():
    """Run data export from PostgreSQL."""
    from export_all import (
        export_daily_demand,
        export_baskets,
        export_prices,
        export_products,
        export_rfm,
    )

    results = {}

    try:
        df = export_daily_demand()
        results["demand"] = {"rows": len(df), "products": int(df["productId"].nunique())}
    except Exception as e:
        results["demand"] = {"error": str(e)}

    try:
        df = export_baskets()
        results["baskets"] = {"rows": len(df), "baskets": int(df["basket_id"].nunique())}
    except Exception as e:
        results["baskets"] = {"error": str(e)}

    try:
        df = export_prices()
        results["prices"] = {"rows": len(df), "products": int(df["productId"].nunique())}
    except Exception as e:
        results["prices"] = {"error": str(e)}

    try:
        df = export_products()
        results["products"] = {"rows": len(df), "categories": int(df["categoryId"].nunique())}
    except Exception as e:
        results["products"] = {"error": str(e)}

    try:
        df = export_rfm()
        results["clients"] = {"rows": len(df)}
    except Exception as e:
        results["clients"] = {"error": str(e)}

    return results


# Map step names to script filenames
TRAINING_SCRIPTS = {
    "demand": "train_demand_forecast.py",
    "baskets": "train_basket_analysis.py",
    "prices": "train_price_anomaly.py",
    "products": "train_product_classifier.py",
    "clients": "train_client_segmentation.py",
}

STEP_LABELS = {
    "demand": "Prediccion de demanda",
    "baskets": "Analisis de canasta",
    "prices": "Detector de precios",
    "products": "Clasificador de productos",
    "clients": "Segmentacion de clientes",
}


def run_training(steps: list[str] | None = None):
    """Run model training for specified steps (or all)."""
    all_steps = list(TRAINING_SCRIPTS.keys())
    to_run = steps if steps else all_steps
    results = {}

    for step in to_run:
        if step not in TRAINING_SCRIPTS:
            results[step] = {"status": "error", "message": f"Unknown step: {step}"}
            continue

        label = STEP_LABELS.get(step, step)
        emit("step_start", {"step": step, "label": label})

        try:
            success, error_msg = run_script(TRAINING_SCRIPTS[step])
            if success:
                results[step] = {"status": "ok"}
            else:
                results[step] = {"status": "error", "message": error_msg}
                print(f"[{step}] ERROR: {error_msg}", file=sys.stderr)
        except subprocess.TimeoutExpired:
            results[step] = {"status": "error", "message": "Timeout (10 min)"}
            print(f"[{step}] TIMEOUT", file=sys.stderr)
        except Exception as e:
            results[step] = {"status": "error", "message": str(e)}
            print(f"[{step}] ERROR: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)

        emit("step_done", {"step": step, "result": results[step]})

    return results


def main():
    import argparse

    parser = argparse.ArgumentParser(description="ML Training Pipeline")
    parser.add_argument(
        "--steps",
        type=str,
        default=None,
        help="Comma-separated steps to run (demand,baskets,prices,products,clients). Default: all",
    )
    parser.add_argument(
        "--skip-export",
        action="store_true",
        help="Skip data export (use existing CSVs)",
    )
    args = parser.parse_args()

    steps = args.steps.split(",") if args.steps else None
    start = time.time()

    emit("pipeline_start", {"steps": steps or ["all"]})

    # Step 1: Export data
    export_results = {}
    if not args.skip_export:
        emit("phase_start", {"phase": "export"})
        try:
            export_results = run_export()
            emit("phase_done", {"phase": "export", "results": export_results})
        except Exception as e:
            emit("phase_error", {"phase": "export", "error": str(e)})
            traceback.print_exc(file=sys.stderr)
    else:
        emit("phase_skip", {"phase": "export"})

    # Step 2: Train models
    emit("phase_start", {"phase": "training"})
    try:
        training_results = run_training(steps)
        emit("phase_done", {"phase": "training", "results": training_results})
    except Exception as e:
        emit("phase_error", {"phase": "training", "error": str(e)})
        training_results = {}
        traceback.print_exc(file=sys.stderr)

    elapsed = round(time.time() - start, 1)

    # Final summary
    successful = sum(1 for r in training_results.values() if r.get("status") == "ok")
    failed = sum(1 for r in training_results.values() if r.get("status") == "error")

    emit("pipeline_done", {
        "elapsed_seconds": elapsed,
        "export": export_results,
        "training": training_results,
        "summary": {
            "successful": successful,
            "failed": failed,
            "total": successful + failed,
        },
    })


if __name__ == "__main__":
    main()
