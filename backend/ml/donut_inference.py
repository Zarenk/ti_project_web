#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple CLI wrapper that runs Donut inference on a PDF/image and returns structured fields.
"""

import argparse
import json
import os
from pathlib import Path
from typing import Optional

import torch
from pdf2image import convert_from_path
from PIL import Image
from transformers import DonutProcessor, VisionEncoderDecoderModel


def load_image(file_path: Path, dpi: int = 300) -> Image.Image:
  if file_path.suffix.lower() == '.pdf':
    pages = convert_from_path(str(file_path), dpi=dpi, first_page=1, last_page=1)
    return pages[0]
  image = Image.open(str(file_path))
  return image.convert('RGB')


def load_model(model_name: str):
  processor = DonutProcessor.from_pretrained(model_name, use_fast=True)
  model = VisionEncoderDecoderModel.from_pretrained(model_name)
  device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
  model.to(device)
  model.eval()
  return processor, model, device


def run_inference(
  processor: DonutProcessor,
  model: VisionEncoderDecoderModel,
  device: torch.device,
  image: Image.Image,
) -> Optional[dict]:
  pixel_values = processor(image, return_tensors='pt').pixel_values.to(device)
  generated_ids = model.generate(
    pixel_values,
    max_length=1024,
    pad_token_id=processor.tokenizer.pad_token_id,
    eos_token_id=processor.tokenizer.sep_token_id,
  )
  decoded = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
  start = decoded.find('{')
  end = decoded.rfind('}')
  if start == -1 or end == -1:
    return None
  payload = decoded[start:end + 1]
  try:
    data = json.loads(payload)
  except json.JSONDecodeError:
    return None
  document = data.get('document', {})
  return {
    'status': 'COMPLETED',
    'modelVersion': model.config.name_or_path,
    'fields': document.get('fields', {}),
    'confidence': document.get('confidence'),
  }



def main():
  parser = argparse.ArgumentParser(description='Run Donut inference over invoices.')
  parser.add_argument('--input', '-i', required=True, help='Path to PDF or image.')
  parser.add_argument(
    '--model',
    default='naver-clova-ix/donut-base-finetuned-rvlcdip',
    help='HuggingFace Donut model identifier.',
  )
  args = parser.parse_args()

  file_path = Path(args.input)
  if not file_path.exists():
    raise SystemExit(f'File not found: {file_path}')

  os.environ.setdefault('USE_FAST', '1')
  os.environ.setdefault('HF_HUB_ENABLE_SYMLINKS', '0')

  processor, model, device = load_model(args.model)
  image = load_image(file_path)
  report = run_inference(processor, model, device, image)
  if not report:
    report = {'status': 'FAILED', 'modelVersion': args.model}
  print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
  main()
