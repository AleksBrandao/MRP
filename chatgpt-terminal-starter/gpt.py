#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os, sys, argparse, datetime, textwrap, pathlib
from dotenv import load_dotenv

# OpenAI SDK (>= 1.0)
try:
    from openai import OpenAI
except Exception as e:
    print("Erro: openai SDK não encontrado. Rode: pip install -r requirements.txt")
    sys.exit(1)

ROOT = pathlib.Path(__file__).resolve().parent
ASSIST_DIR = ROOT / "assistente"
ASSIST_DIR.mkdir(exist_ok=True)
HIST_FILE = ASSIST_DIR / "historico.md"
CONTEXT_FILE = ASSIST_DIR / "contexto.md"
MELHORIAS_FILE = ASSIST_DIR / "melhorias.md"

def load_env():
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL") or None
    model = os.getenv("MODEL", "gpt-5")
    if not api_key:
        print("Erro: defina OPENAI_API_KEY em .env ou no ambiente.")
        sys.exit(1)
    client = OpenAI(api_key=api_key, base_url=base_url)
    return client, model

def read_file(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return f"<<Erro ao ler {path}: {e}>>"

def log_history(prompt: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(HIST_FILE, "a", encoding="utf-8") as f:
        f.write(f"- {ts}: {prompt}\n")

def add_melhoria(texto: str):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(MELHORIAS_FILE, "a", encoding="utf-8") as f:
        f.write(f"- [{ts}] {texto}\n")

def build_messages(args, user_prompt: str):
    messages = []
    if args.context and CONTEXT_FILE.exists():
        sys_msg = CONTEXT_FILE.read_text(encoding="utf-8", errors="ignore")
        messages.append({"role": "system", "content": sys_msg})

    if args.files:
        parts = []
        for f in args.files:
            p = pathlib.Path(f).resolve()
            parts.append(f"\n===== FILE: {p} =====\n{read_file(p)}\n")
        file_block = "\n".join(parts)
        user_prompt = f"{user_prompt}\n\nAnexeis:\n{file_block}"

    messages.append({"role": "user", "content": user_prompt})
    return messages

def chat(client, model, messages, max_tokens, debug=False):
    """
    Usa chat.completions para modelos 'clássicos' (ex.: gpt-4o, gpt-4o-mini).
    Usa responses.create para modelos 'novos' (ex.: gpt-4.1, o1, o3, 'gpt-5').
    Extrai o texto com fallback robusto.
    """
    try:
        model_lc = (model or "").lower()
        uses_responses_api = any(
            key in model_lc for key in ("gpt-4.1", "o1", "o3", "gpt-5")
        )

        if uses_responses_api:
            # Responses API
            # Converte messages (lista de dicts role/content) em formato aceito pelo Responses.
            # A SDK aceita 'input' como string ou lista de mensagens.
            resp = client.responses.create(
                model=model,
                input=messages,  # mantém o histórico com roles
                max_output_tokens=max_tokens  # equivalente novo
            )
            if debug:
                try:
                    print(resp.model_dump_json(indent=2))
                except Exception:
                    print(resp)

            # Tenta extrair 'output_text' (atalho da SDK)
            out = getattr(resp, "output_text", None)
            if out and isinstance(out, str):
                out = out.strip()
                return out if out else "[Resposta vazia]"

            # Fallback manual (percorrer a estrutura)
            try:
                output = resp.output or []
                parts = []
                for block in output:
                    for c in getattr(block, "content", []) or []:
                        if getattr(c, "type", "") == "output_text":
                            txt = getattr(getattr(c, "text", None), "value", "")
                            if txt:
                                parts.append(txt)
                if parts:
                    return "\n".join(parts).strip()
            except Exception:
                pass

            return "[Sem texto na resposta (Responses API). Use --debug para inspecionar.]"

        else:
            # Chat Completions API
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                # Não definir temperature (alguns modelos rejeitam valores ≠ 1)
                max_completion_tokens=max_tokens
            )
            if debug:
                try:
                    print(resp.model_dump_json(indent=2))
                except Exception:
                    print(resp)

            choice = resp.choices[0]
            msg = choice.message
            content = getattr(msg, "content", None)
            if content and isinstance(content, str):
                out = content.strip()
                return out if out else "[Resposta vazia]"
            return "[Sem 'content' na resposta (Chat Completions). Use --debug.]"

    except Exception as e:
        return f"[ERRO AO CHAMAR API] {e}"


def repl_loop(client, model, args):
    print("Modo interativo. Ctrl+C para sair.")
    while True:
        try:
            prompt = input("> ").strip()
            if not prompt:
                continue
            log_history(prompt)
            messages = build_messages(args, prompt)
            out = chat(client, model, messages, args.max_tokens, debug=args.debug)
            print(out, flush=True)
        except KeyboardInterrupt:
            print("\nSaindo...")
            break

def main():
    parser = argparse.ArgumentParser(description="ChatGPT no terminal (estilo Claude Code)")
    parser.add_argument("prompt", nargs="*", help="Mensagem para o ChatGPT")
    parser.add_argument("-i", "--interactive", action="store_true", help="Modo interativo (REPL)")
    parser.add_argument("-f", "--files", action="append", help="Arquivos para anexar (pode usar várias flags -f)")
    parser.add_argument("-c", "--context", action="store_true", help="Incluir assistente/contexto.md como system prompt")
    parser.add_argument("--add-melhoria", type=str, help="Acrescenta uma melhoria em assistente/melhorias.md e sai")
    parser.add_argument("-m", "--max-tokens", type=int, default=900, help="Limite de tokens de resposta")
    parser.add_argument("--debug", action="store_true", help="Mostra a resposta crua da API")
    args = parser.parse_args()

    if args.add_melhoria:
        add_melhoria(args.add_melhoria)
        print("✔ Melhoria adicionada em assistente/melhorias.md")
        return

    client, model = load_env()

    if args.interactive:
        repl_loop(client, model, args)
        return

    # prompt único
    if not args.prompt:
        print("Forneça uma mensagem ou use -i para modo interativo.")
        return

    user_prompt = " ".join(args.prompt).strip()
    log_history(user_prompt)
    messages = build_messages(args, user_prompt)
    out = chat(client, model, messages, args.max_tokens, debug=args.debug)
    print(out)

if __name__ == "__main__":
    main()
