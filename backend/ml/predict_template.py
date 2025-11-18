#!/usr/bin/env python
"""
CLI para predecir la plantilla de una factura usando el modelo entrenado.
"""

import argparse
import json
import pathlib
import sys
import joblib


def main():
  parser = argparse.ArgumentParser(description='Predecir plantilla de factura.')
  parser.add_argument('--model', required=True, help='Ruta al modelo joblib.')
  parser.add_argument('--text', required=True, help='Texto plano del comprobante.')
  parser.add_argument(
    '--candidate',
    action='append',
    type=int,
    default=[],
    help='IDs de plantillas candidatas (se puede repetir).',
  )
  parser.add_argument(
    '--threshold',
    type=float,
    default=0.35,
    help='Umbral mínimo de confianza para aceptar la predicción.',
  )
  args = parser.parse_args()

  model_path = pathlib.Path(args.model)
  if not model_path.exists():
    print(json.dumps({}), end='')
    sys.exit(0)

  pipeline = joblib.load(model_path)
  text = args.text.strip()
  if not text:
    print(json.dumps({}), end='')
    sys.exit(0)

  classes = pipeline.classes_
  probs = pipeline.predict_proba([text])[0]

  candidates = set(str(c) for c in args.candidate) if args.candidate else set(classes)
  best_template = None
  best_score = 0.0

  for template_id, prob in zip(classes, probs):
    if str(template_id) not in candidates:
      continue
    if prob > best_score:
      best_template = template_id
      best_score = prob

  if best_template is None or best_score < args.threshold:
    print(json.dumps({}), end='')
    return

  try:
    template_num = int(best_template)
  except ValueError:
    template_num = None

  print(
    json.dumps(
      {
        'templateId': template_num,
        'score': float(best_score),
      }
    ),
    end='',
  )


if __name__ == '__main__':
  main()
