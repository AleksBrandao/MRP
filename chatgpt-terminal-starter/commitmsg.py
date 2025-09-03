#!/usr/bin/env python
# Gera mensagem de commit a partir do diff staged (git).
import subprocess, os, sys, pathlib
from dotenv import load_dotenv
from openai import OpenAI

def run(cmd):
    return subprocess.check_output(cmd, shell=True, text=True, encoding="utf-8", errors="ignore")

def main():
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("MODEL", "gpt-5")
    if not api_key:
        print("Defina OPENAI_API_KEY.", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    try:
        diff = run("git diff --staged")
    except subprocess.CalledProcessError:
        diff = ""

    prompt = f"""Você é um assistente que escreve mensagens de commit claras e concisas, no padrão Conventional Commits quando possível.
Gere um título curto (máx. 72 chars) e um corpo enxuto, baseando-se no diff abaixo.

<diff>
{diff}
</diff>
"""

    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=220
    )
    print(resp.choices[0].message.content.strip())

if __name__ == "__main__":
    main()
