#!/usr/bin/env python
"""
Train a TF-IDF + Logistic Regression classifier for invoice templates.
"""

import argparse
import json
import pathlib
from collections import defaultdict
from typing import List, Tuple

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def load_dataset(path: pathlib.Path) -> List[dict]:
  with path.open('r', encoding='utf-8') as fh:
    data = json.load(fh)
  if not isinstance(data, list):
    raise ValueError('El dataset debe ser una lista de muestras.')
  return data


def main():
  parser = argparse.ArgumentParser(description='Entrenar clasificador de plantillas.')
  parser.add_argument(
    '--dataset',
    default='backend/ml/template-training-data.json',
    help='Ruta al archivo JSON con los datos etiquetados.',
  )
  parser.add_argument(
    '--output',
    default='backend/ml/template_classifier.joblib',
    help='Ruta donde se guardara el modelo entrenado.',
  )
  parser.add_argument(
    '--metrics',
    default='backend/ml/template_classifier_metrics.json',
    help='Ruta para guardar metricas de entrenamiento (opcional).',
  )
  parser.add_argument(
    '--test-size',
    type=float,
    default=0.2,
    help='Proporcion del dataset usada para pruebas.',
  )
  args = parser.parse_args()

  dataset_path = pathlib.Path(args.dataset)
  output_path = pathlib.Path(args.output)
  metrics_path = pathlib.Path(args.metrics)

  samples = load_dataset(dataset_path)
  if len(set(str(item['templateId']) for item in samples)) < 2:
    raise ValueError('Se requieren al menos dos plantillas distintas para entrenar.')

  texts = [item['text'] for item in samples]
  labels = [str(item['templateId']) for item in samples]
  indices = list(range(len(samples)))

  train_idx, test_idx, y_train, y_test = train_test_split(
    indices,
    labels,
    test_size=args.test_size,
    random_state=42,
    stratify=labels,
  )

  X_train = [texts[i] for i in train_idx]
  X_test = [texts[i] for i in test_idx]

  pipeline = Pipeline(
    steps=[
      (
        'tfidf',
        TfidfVectorizer(
          lowercase=True,
          strip_accents='unicode',
          token_pattern=r'(?u)\b\w+\b',
        ),
      ),
      (
        'clf',
        LogisticRegression(
          max_iter=1000,
          multi_class='auto',
        ),
      ),
    ]
  )

  pipeline.fit(X_train, y_train)
  preds = pipeline.predict(X_test)

  accuracy = accuracy_score(y_test, preds)
  report = classification_report(y_test, preds, output_dict=True)

  output_path.parent.mkdir(parents=True, exist_ok=True)
  joblib.dump(pipeline, output_path)

  metrics = {
    'accuracy': accuracy,
    'classification_report': report,
    'train_size': len(X_train),
    'test_size': len(X_test),
    'dataset_path': str(dataset_path),
    'model_path': str(output_path),
    'per_tenant_accuracy': build_tenant_metrics(samples, test_idx, y_test, preds),
    'dataset_distribution': build_tenant_distribution(samples),
  }

  metrics_path.parent.mkdir(parents=True, exist_ok=True)
  with metrics_path.open('w', encoding='utf-8') as fh:
    json.dump(metrics, fh, indent=2, ensure_ascii=False)

  print('Entrenamiento completado.')
  print(f'Precision: {accuracy:.4f}')
  print(f'Modelo guardado en: {output_path}')
  print(f'Metricas guardadas en: {metrics_path}')


def tenant_key(sample: dict) -> Tuple[str, str]:
  org = sample.get('organizationId')
  company = sample.get('companyId')
  org_part = 'org:' + (str(org) if org is not None else 'null')
  comp_part = 'comp:' + (str(company) if company is not None else 'null')
  return org_part, comp_part


def build_tenant_distribution(samples: List[dict]) -> List[dict]:
  distribution: dict[Tuple[str, str], dict] = {}
  for sample in samples:
    key = tenant_key(sample)
    if key not in distribution:
      distribution[key] = {
        'organizationId': sample.get('organizationId'),
        'companyId': sample.get('companyId'),
        'samples': 0,
      }
    distribution[key]['samples'] += 1
  return list(distribution.values())


def build_tenant_metrics(
  samples: List[dict],
  test_idx: List[int],
  y_test: List[str],
  preds: List[str],
) -> List[dict]:
  if not test_idx:
    return []

  aggregates: dict[Tuple[str, str], dict] = defaultdict(
    lambda: {'organizationId': None, 'companyId': None, 'total': 0, 'correct': 0}
  )
  for sample_index, expected, predicted in zip(test_idx, y_test, preds):
    sample = samples[sample_index]
    key = tenant_key(sample)
    entry = aggregates[key]
    entry['organizationId'] = sample.get('organizationId')
    entry['companyId'] = sample.get('companyId')
    entry['total'] += 1
    if expected == predicted:
      entry['correct'] += 1

  results: List[dict] = []
  for entry in aggregates.values():
    total = entry['total'] or 1
    results.append(
      {
        'organizationId': entry['organizationId'],
        'companyId': entry['companyId'],
        'total': entry['total'],
        'correct': entry['correct'],
        'accuracy': entry['correct'] / total,
      }
    )
  return results


if __name__ == '__main__':
  main()
