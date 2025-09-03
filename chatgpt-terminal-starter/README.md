# ChatGPT Terminal Starter (com pasta `/assistente/`)

Este pacote permite usar o ChatGPT no **terminal** de forma parecida com o Claude Code, com:
- **CLI `gpt`**: conversar, analisar arquivos, e registrar histórico
- **Pasta `/assistente/`**: contexto do projeto, melhorias contínuas e histórico de sessões
- **Scripts de exemplo** para Windows e Linux

## ✅ Pré‑requisitos
- Python 3.10+
- Uma chave da OpenAI em variável de ambiente `OPENAI_API_KEY`

## 🚀 Instalação
```bash
cd chatgpt-terminal-starter
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Crie o arquivo **.env** (ou exporte a variável no sistema):
```bash
# .env
OPENAI_API_KEY=COLOQUE_SUA_CHAVE_AQUI
OPENAI_BASE_URL=  # (opcional) se usar endpoint compatível
MODEL=gpt-5  # pode trocar depois
```

> Alternativa (sem .env):  
> `export OPENAI_API_KEY=...` (Linux/macOS) ou  
> `$env:OPENAI_API_KEY="..."` (Windows PowerShell).

## 🧠 Como usar
### Conversa rápida
```bash
python gpt.py "Explique o que esse projeto faz"
```

### Analisar um arquivo
```bash
python gpt.py -f core/models.py "Analise e sugira melhorias"
```

### Enviar múltiplos arquivos (concatena com divisores)
```bash
python gpt.py -f core/models.py -f core/serializers.py "Reveja e aponte inconsistências"
```

### Modo interativo (REPL)
```bash
python gpt.py -i
# digite suas perguntas; Ctrl+C para sair
```

### Usar o wrapper (Linux/macOS)
```bash
chmod +x gpt
./gpt "Liste APIs do backend"
./gpt -f core/views.py "Otimize consultas"
```

### Usar no Windows
```powershell
gpt.bat "Quais endpoints existem?"
gpt.bat -f core\views.py "Revise"
```

---

## 🗂️ A pasta `/assistente/`
- `assistente/contexto.md`: contexto do projeto, objetivos, regras de estilo
- `assistente/melhorias.md`: backlog de melhorias contínuas sugeridas pelo chat
- `assistente/historico.md`: log leve de sessões (timestamp + prompt)

> Você pode “fixar” em `contexto.md` tudo o que quer que o assistente considere em cada pergunta.

---

## 🔧 Exemplos úteis
### 1) Carregar automaticamente o contexto do projeto
```bash
python gpt.py -c "Qual o próximo passo para endurecer segurança?"
```
A flag `-c/--context` injeta o conteúdo de `assistente/contexto.md` como **system prompt**.

### 2) Anotar uma melhoria no backlog
```bash
python gpt.py --add-melhoria "Paginar listagens grandes no frontend (react-query)"
```

### 3) Gerar mensagem de commit
```bash
git add -A
python commitmsg.py > .git/COMMIT_EDITMSG
# ou:
python commitmsg.py -p "feat: segurança" > .git/COMMIT_EDITMSG
```

---

## 🧪 Dicas
- Se a resposta vier longa, use `-m tokens` para limitar (ex.: `-m 600`).
- Para “reler” arquivos grandes, use várias `-f` em vez de um arquivo gigante.
- Personalize o modelo em `.env` (`MODEL=gpt-5`).

Boa construção! :)
