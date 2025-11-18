#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Heurístico simple para extraer campos clave de un PDF convertido a texto.
Lee un payload JSON desde stdin con formato:
{
  "text": "...",
  "metadata": {...},
  "sanitized": bool,
  "originalHash": "..."
}
"""

import json
import re
import sys
from typing import Dict, List, Optional


def search_first(text: str, patterns: List[str]):
  for pattern in patterns:
    match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
    if match:
      return match.group(1).strip()
  return None


def extract_fields_from_text(text: str) -> Dict[str, Optional[str]]:
  normalized = (text or "").replace("\u00a0", " ")
  fields: Dict[str, Optional[str]] = {}
  fields["serie"] = search_first(
    normalized,
    [
      r"serie\s*[:\-]?\s*([A-Z0-9]{1,6})",
      r"(?:serie\s+y\s+número|serie\s*/\s*número)\s*[:\-]?\s*([A-Z0-9-]+)",
    ],
  )
  fields["nroCorrelativo"] = search_first(
    normalized,
    [
      r"(?:correlativo|nro\.?|nº)\s*[:\-]?\s*([0-9]{3,})",
      r"serie\s*[A-Z0-9-]+\s*[-\s]+([0-9]{3,})",
    ],
  )
  fields["rucEmisor"] = search_first(
    normalized,
    [
      r"ruc\s*[:\-]?\s*([0-9*]{8,15})",
      r"emisor\s+([0-9*]{8,15})",
    ],
  )
  fields["total"] = search_first(
    normalized,
    [
      r"(?:importe\s+total|total\s+a\s+pagar|total)\s*[:\-]?\s*(?:s\/|s\$|\$)?\s*([0-9.,]+)",
      r"total\s*([0-9.,]+)",
    ],
  )
  fields["subtotal"] = search_first(
    normalized,
    [
      r"(?:subtotal|valor\s+venta)\s*[:\-]?\s*(?:s\/|s\$|\$)?\s*([0-9.,]+)",
    ],
  )
  fields["igv"] = search_first(
    normalized,
    [
      r"(?:igv|iva)\s*(?:\(\d+%?\))?\s*[:\-]?\s*(?:s\/|s\$|\$)?\s*([0-9.,]+)",
    ],
  )
  return fields


def build_response(payload: Dict[str, any], fields: Dict[str, Optional[str]]):
  populated = [value for value in fields.values() if value]
  confidence = round(len(populated) / max(len(fields), 1), 2)
  status = "COMPLETED" if populated else "PENDING_REVIEW"
  matched_fields = {key: value for key, value in fields.items() if value}

  return {
    "status": status,
    "provider": "python-ml-fallback",
    "modelVersion": "heuristic-v1",
    "confidence": confidence,
    "fields": fields,
    "debug": {
      "matchedFields": matched_fields,
      "metadata": payload.get("metadata", {}),
      "sanitized": payload.get("sanitized"),
      "hash": payload.get("originalHash"),
    },
  }


def main():
  try:
    payload = json.load(sys.stdin)
  except json.JSONDecodeError:
    print(json.dumps({"status": "FAILED", "error": "invalid json"}))
    sys.exit(1)

  fields = extract_fields_from_text(payload.get("text") or "")
  result = build_response(payload, fields)
  print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
  main()
