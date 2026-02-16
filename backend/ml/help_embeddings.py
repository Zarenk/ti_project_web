#!/usr/bin/env python
"""
Genera sentence embeddings para el asistente de ayuda de ADSLab.

Modos de uso:
  encode-batch  — Lee un JSON array de textos por stdin, devuelve array de embeddings.
  encode-query  — Recibe un texto como argumento, devuelve un embedding.
  server        — Modo servidor persistente (lee comandos de stdin, escribe resultados a stdout)

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


def server_mode():
    """
    Modo servidor: mantiene el modelo cargado en memoria y procesa comandos desde stdin.
    
    Formato de comando (una línea JSON por comando):
    {"id": "uuid", "command": "encode-query", "params": {"text": "..."}}
    {"id": "uuid", "command": "encode-batch", "params": {"texts": [...]}}
    
    Formato de respuesta (una línea JSON por respuesta):
    {"id": "uuid", "result": [...]}
    {"id": "uuid", "error": "mensaje de error"}
    """
    # Pre-cargar el modelo una sola vez
    model = get_model()
    
    # Escribir mensaje de ready para indicar que el servidor está listo
    print(json.dumps({"status": "ready"}), flush=True)
    
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                # EOF - salir del servidor
                break
            
            line = line.strip()
            if not line:
                continue
            
            request = json.loads(line)
            request_id = request.get('id', 'unknown')
            command = request.get('command')
            params = request.get('params', {})
            
            result = None
            error = None
            
            try:
                if command == 'encode-query':
                    text = params.get('text', '').strip()
                    if not text:
                        result = []
                    else:
                        embedding = model.encode([text], show_progress_bar=False, normalize_embeddings=True)
                        result = embedding[0].tolist()
                
                elif command == 'encode-batch':
                    texts = params.get('texts', [])
                    if not isinstance(texts, list) or len(texts) == 0:
                        result = []
                    else:
                        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
                        result = [emb.tolist() for emb in embeddings]
                
                else:
                    error = f"Unknown command: {command}"
            
            except Exception as e:
                error = str(e)
            
            # Enviar respuesta
            if error:
                response = {"id": request_id, "error": error}
            else:
                response = {"id": request_id, "result": result}
            
            print(json.dumps(response), flush=True)
        
        except json.JSONDecodeError as e:
            # Error al parsear el comando - enviar respuesta de error
            error_response = {"id": "unknown", "error": f"JSON parse error: {str(e)}"}
            print(json.dumps(error_response), flush=True)
        
        except Exception as e:
            # Error inesperado - loggear y continuar
            error_response = {"id": "unknown", "error": f"Unexpected error: {str(e)}"}
            print(json.dumps(error_response), flush=True)


def main():
    parser = argparse.ArgumentParser(description='Help embeddings para ADSLab')
    parser.add_argument(
        'mode',
        choices=['encode-batch', 'encode-query', 'server'],
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
    elif args.mode == 'server':
        server_mode()


if __name__ == '__main__':
    main()
