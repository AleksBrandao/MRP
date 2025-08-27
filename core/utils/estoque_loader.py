from __future__ import annotations
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List, Dict, Any

import pandas as pd
from pandas import NA
from django.conf import settings

# --- Config ---
ESTOQUE_PATH: Path = getattr(settings, "ESTOQUE_PATH", settings.MEDIA_ROOT / "estoque" / "posicao_estoque.xlsx")
CACHE_TTL_SECONDS = 300  # recarrega no máximo a cada 60s, e tbm quando o arquivo muda

PKL_PATH = ESTOQUE_PATH.with_suffix(".pkl")


@dataclass
class _Cache:
    df: Optional[pd.DataFrame] = None
    mtime: float = 0.0
    loaded_at: float = 0.0

_cache = _Cache()

def _file_mtime(path: Path) -> float:
    try:
        return path.stat().st_mtime
    except FileNotFoundError:
        return 0.0

import pandas as pd
from pandas import NA

def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    for required in ["ORG", "PIEZA"]:
        if required not in df.columns:
            raise ValueError(f"Coluna obrigatória ausente no arquivo: {required}")

    rename_map = {
        "Almacen / Warehouse": "warehouse",
        "Descripción": "descricao",
        "REPARABLE": "reparable",
        "USO": "uso",
        "PAR_UDFCHAR30": "bloqueio_compras",
        "CODIGOCOMUM_PAR_UDFCHAR16": "codigo_comum",
        "CODIGOCLIENTE_PAR_UDFCHAR01": "codigo_cliente",
        "Lead Time": "lead_time_dias",
        "FORNECEDORAUTOMATIC": "fornecedor_automatico",
        "Preço Médio": "preco_medio",
        "TOTAL Valor almacen": "total_valor_almacen",
        "NIVEL_IMAX": "nivel_imax",
        "NIVEL_ROL": "nivel_rol",
        "NIVEL_QTDOC": "nivel_qtdoc",
        "NIVEL_IMIN": "nivel_imin",
        "Classificação": "classificacao",
        "FAMILIA": "familia",
        "BIS_BIN": "bis_bin",
        "BIS_QTY": "bis_qty",
        "PAR_CODE_EXPLICIT": "par_code_explicit",
        "PAR_ORG_EXPLICIT": "par_org_explicit",
        "EMPRESTIMO?": "emprestimo",
        "BLOQUEIO_REPOSICAO": "bloqueio_reposicao",
        "BLOQUEIO_REPOSICAO_OLD": "bloqueio_reposicao_old",
    }
    df = df.rename(columns=rename_map)

    # chaves padronizadas
    df["org"] = df["ORG"].astype(str).str.strip()
    df["pieza"] = df["PIEZA"].astype(str).str.strip()
    if "warehouse" not in df.columns:
        df["warehouse"] = None

    # 1) converte strings vazias/espaços em NA no dataframe todo
    df = df.replace({r"^\s*$": NA}, regex=True)

    # 2) normaliza booleanos texto -> 1/0
    def norm_bool(x):
        s = str(x).strip().lower() if pd.notna(x) else ""
        if s in {"+", "1", "true", "sim", "s", "y", "yes"}:
            return 1
        if s in {"-", "0", "false", "nao", "não", "n", "no"}:
            return 0
        return None

    if "reparable" in df.columns:
        df["reparable"] = df["reparable"].map(norm_bool)
    if "emprestimo" in df.columns:
        df["emprestimo"] = df["emprestimo"].map(norm_bool)

    # 3) numéricos em geral (floats)
    for col in ["preco_medio", "total_valor_almacen", "nivel_imax", "nivel_rol", "nivel_qtdoc", "nivel_imin", "bis_qty"]:
        if col in df.columns:
            # troca vírgula por ponto, depois coerce
            df[col] = (
                df[col]
                .astype(str)
                .str.replace(",", ".", regex=False)
                .replace({"": NA})
            )
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # 4) lead_time_dias: cast seguro para Int64 (nullable)
    if "lead_time_dias" in df.columns:
        s = (
            df["lead_time_dias"]
            .astype(str)
            .str.replace(",", ".", regex=False)  # "30,0" -> "30.0"
            .replace({"": NA, "nan": NA, "None": NA})  # strings comuns de vazio
        )
        # coerce: vira float com NaN onde não for número
        s = pd.to_numeric(s, errors="coerce")
        # arredonda e faz cast para Int64 (aceita NA)
        # df["lead_time_dias"] = s.round().astype("Int64")
        df["lead_time_dias"] = pd.to_numeric(s, errors="coerce")  # mantém como float com NaN

    # 5) remove linhas sem chave
    df = df[
        df["org"].notna() & (df["org"] != "") &
        df["pieza"].notna() & (df["pieza"] != "")
    ]

    return df


def _load_from_disk() -> pd.DataFrame:
    # Se existir pickle mais novo, usa ele (muito mais rápido que XLSX)
    if PKL_PATH.exists():
        try:
            if PKL_PATH.stat().st_mtime >= ESTOQUE_PATH.stat().st_mtime:
                return pd.read_pickle(PKL_PATH)
        except FileNotFoundError:
            pass

    # Caso contrário, lê o arquivo “bruto”
    if not ESTOQUE_PATH.exists():
        raise FileNotFoundError(f"Arquivo de estoque não encontrado em: {ESTOQUE_PATH}")

    if ESTOQUE_PATH.suffix.lower() == ".csv":
        df = pd.read_csv(ESTOQUE_PATH)
    else:
        xls = pd.ExcelFile(ESTOQUE_PATH)
        df = pd.read_excel(ESTOQUE_PATH, sheet_name=xls.sheet_names[0])

    df = _normalize_columns(df)

    # Salva a versão pronta para carregamentos futuros super rápidos
    try:
        df.to_pickle(PKL_PATH)
    except Exception:
        pass

    return df

def get_df(force: bool = False) -> pd.DataFrame:
    """Retorna o DataFrame do estoque com cache por TTL + invalidado se o arquivo mudou."""
    now = time.time()
    mtime = _file_mtime(ESTOQUE_PATH)
    # recarrega se: forçado, arquivo mudou, TTL expirou, cache vazio
    if (
        force
        or _cache.df is None
        or mtime != _cache.mtime
        or (now - _cache.loaded_at) > CACHE_TTL_SECONDS
    ):
        df = _load_from_disk()
        _cache.df = df
        _cache.mtime = mtime
        _cache.loaded_at = now
    return _cache.df

def clear_cache():
    _cache.df = None
    _cache.mtime = 0.0
    _cache.loaded_at = 0.0

def query(pieza=None, org=None, warehouse=None, search=None,
          limit=100, offset=0, sort_by=None, sort_dir="asc"):
    df = get_df()

    q = df
    if org:
        q = q[q["org"].str.contains(org, case=False, na=False)]
    if pieza:
        q = q[q["pieza"].str.contains(pieza, case=False, na=False)]
    if warehouse:
        q = q[q["warehouse"].astype(str).str.contains(warehouse, case=False, na=False)]
    if search:
        s = search.lower()
        cols = [c for c in ["pieza", "org", "warehouse", "descricao", "familia", "codigo_cliente"] if c in q.columns]
        mask = False
        for c in cols:
            mask = mask | q[c].astype(str).str.lower().str.contains(s, na=False)
        q = q[mask]

    if sort_by in q.columns:
        q = q.sort_values(sort_by, ascending=(str(sort_dir).lower() != "desc"))

    total = len(q)

    base_cols = ["org", "warehouse", "pieza", "descricao", "bis_qty", "preco_medio", "nivel_qtdoc", "lead_time_dias"]
    extra_cols = [c for c in ["uso", "classificacao", "familia", "reparable"] if c in q.columns]
    cols = [c for c in base_cols + extra_cols if c in q.columns]

    data = q[cols].iloc[offset: offset + int(limit)].fillna("").to_dict(orient="records")
    return total, data

