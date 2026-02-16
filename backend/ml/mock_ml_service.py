#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
HTTP service wrapper around extract_invoice_fields.py for local testing.

Usage:
  python backend/ml/mock_ml_service.py --port 5055

It accepts POST /extract with the same payload que MlExtractionService envía.
"""

import argparse
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Optional

from extract_invoice_fields import (
  build_response,
  extract_fields_from_text,
)


class ExtractionHandler(BaseHTTPRequestHandler):
  server_version = "MockInvoiceExtractor/0.1"

  def do_POST(self):  # noqa: N802
    if self.path not in ("/", "/extract"):
      self.send_error(404, "not found")
      return

    content_length = int(self.headers.get("Content-Length") or 0)
    raw_body = self.rfile.read(content_length)

    try:
      payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError:
      self.send_json({"status": "FAILED", "error": "invalid json"}, status=400)
      return

    fields = extract_fields_from_text(payload.get("text") or "")
    result = build_response(payload, fields)
    self.send_json(result)

  def log_message(self, format, *args):  # noqa: A003
    return  # silence default logging

  def send_json(self, payload: dict, status: int = 200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(body)))
    self.end_headers()
    self.wfile.write(body)


def run(host: str, port: int):
  server = HTTPServer((host, port), ExtractionHandler)
  print(f"Mock ML service listening on http://{host}:{port}")
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    print("Stopping mock ML service...")
  finally:
    server.server_close()


def main():
  parser = argparse.ArgumentParser(description="Mock ML extraction service")
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=5055)
  args = parser.parse_args()
  run(args.host, args.port)


if __name__ == "__main__":
  main()
