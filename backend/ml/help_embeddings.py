#!/usr/bin/env python
"""
Genera sentence embeddings para el asistente de ayuda de ADSLab.

Modos de uso:
  encode-batch  — Lee un JSON array de textos por stdin, devuelve array de embeddings.
  encode-query  — Recibe un texto como argumento, devuelve un embedding.

Modelo: paraphrase-multilingual-MiniLM-L12-v2 (384 dims, multilingue)
"""

import argparse
import json
import sys

# Lazy imports para que el script falle rapido si se invoca sin dependencias
_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    return _model


def encode_batch():
    """Lee JSON array de textos por stdin, devuelve JSON array de embeddings."""
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps([]), end='')
        return

    texts = json.loads(raw)
    if not isinstance(texts, list) or len(texts) == 0:
        print(json.dumps([]), end='')
        return

    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    result = [emb.tolist() for emb in embeddings]
    print(json.dumps(result), end='')


def encode_query(text: str):
    """Codifica un texto individual y devuelve su embedding."""
    text = text.strip()
    if not text:
        print(json.dumps([]), end='')
        return

    model = get_model()
    embedding = model.encode([text], show_progress_bar=False, normalize_embeddings=True)
    print(json.dumps(embedding[0].tolist()), end='')


def main():
    parser = argparse.ArgumentParser(description='Help embeddings para ADSLab')
    parser.add_argument(
        'mode',
        choices=['encode-batch', 'encode-query'],
        help='Modo de operacion',
    )
    parser.add_argument(
        '--text',
        default='',
        help='Texto a codificar (solo para encode-query)',
    )
    args = parser.parse_args()

    if args.mode == 'encode-batch':
        encode_batch()
    elif args.mode == 'encode-query':
        if not args.text:
            print(json.dumps([]), end='')
            return
        encode_query(args.text)


if __name__ == '__main__':
    main()
