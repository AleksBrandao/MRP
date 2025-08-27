from __future__ import annotations
from pathlib import Path
import pandas as pd
import pickle
from decimal import Decimal
from typing import Tuple, List, Dict, Any
from django.conf import settings

def _paths():
    base = Path(getattr(settings, "PEDIDOS_PATH", settings.BASE_DIR / "data" / "pedidos.xlsx"))
    # Se base é .xlsx mas existir .csv/.xls ao lado, preferimos o que existir
    candidates = [base]
    candidates.append(base.with_suffix(".xlsx"))
    candidates.append(base.with_suffix(".xls"))
    candidates.append(base.with_suffix(".csv"))
    # pega o primeiro que existir
    for c in candidates:
        if c.exists():
            src = c
            break
    else:
        src = candidates[0]  # padrão (pode não existir)
    pkl_df = src.with_suffix(".pkl")
    snap  = Path(getattr(settings, "PEDIDOS_SNAPSHOT_PKL", settings.BASE_DIR / "data" / "pedidos_snapshot.pkl"))
    return src, pkl_df, snap

def clear_cache():
    _, pkl_df, snap = _paths()
    for p in (pkl_df, snap):
        try: Path(p).unlink()
        except FileNotFoundError: pass

def _find_col(df: pd.DataFrame, *options: str) -> str | None:
    """Procura coluna por nomes possíveis (case-insensitive)."""
    lower_map = {str(c).strip().lower(): c for c in df.columns}
    for opt in options:
        key = opt.strip().lower()
        if key in lower_map:
            return lower_map[key]
    return None

def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    # Localiza colunas com tolerância a variações
    col_part = _find_col(df, "ORL_PART", "PART", "PIEZA", "PAR_CODE")
    col_ord  = _find_col(df, "ORL_ORDQTY", "ORD_QTY", "ORDER_QTY", "QTY")
    col_recv = _find_col(df, "ORL_RECVQTY", "RECV_QTY", "RECEIVED_QTY")
    col_date = _find_col(df, "ORL_UDFDATE01", "DATA_PREVISTA", "DT_PREVISTA", "PROMISED_DATE")
    col_forn = _find_col(df, "ORL_SUPPLIER", "FORNECEDOR", "VENDOR")
    col_org  = _find_col(df, "ORL_ORDER_ORG", "ORL_PART_ORG", "ORG")
    col_pnum = _find_col(df, "ORL_ORDER", "PEDIDO", "PO_NUMBER")

    if not col_part:
        raise ValueError("Coluna de código da peça não encontrada (ex.: ORL_PART / PIEZA).")
    if not col_ord:
        # Se nem quantidade pedida existe, não há o que listar
        df["pieza"] = ""
        df["ord_qty"] = 0
        df["recv_qty"] = 0
    else:
        df["ord_qty"] = df[col_ord]

    # se não existir recebida, considere 0
    if col_recv:
        df["recv_qty"] = df[col_recv]
    else:
        df["recv_qty"] = 0

    df["pieza"] = df[col_part].astype(str).str.strip()

    # normaliza números (milhar/decimal)
    for c in ("ord_qty", "recv_qty"):
        df[c] = (
            df[c].astype(str)
                 .str.replace(".", "", regex=False)
                 .str.replace(",", ".", regex=False)
        )
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    # em pedido = ord - recv (não negativo)
    df["qty"] = (df["ord_qty"] - df["recv_qty"]).clip(lower=0)

    # datas e opcionais
    if col_date:
        df["data_prevista"] = pd.to_datetime(df[col_date], errors="coerce")
    else:
        df["data_prevista"] = pd.NaT

    df["fornecedor"] = df[col_forn] if col_forn else ""
    df["org"] = df[col_org] if col_org else ""
    df["pedido_num"] = df[col_pnum] if col_pnum else ""

    # deixa só o que interessa (mantendo algumas colunas úteis)
    keep = ["pedido_num", "pieza", "qty", "ord_qty", "recv_qty", "fornecedor", "org", "data_prevista"]
    df = df[keep]
    return df

def get_df(force: bool = False) -> pd.DataFrame:
    src, pkl_df, _ = _paths()
    if not force and Path(pkl_df).exists():
        return pd.read_pickle(pkl_df)
    if not Path(src).exists():
        raise FileNotFoundError(f"Arquivo de pedidos não encontrado em: {src}")
    # leitura conforme extensão
    if src.suffix.lower() in (".xlsx", ".xls"):
        df = pd.read_excel(src)
    else:
        df = pd.read_csv(src)
    df = _normalize_columns(df)
    Path(pkl_df).parent.mkdir(parents=True, exist_ok=True)
    df.to_pickle(pkl_df)
    return df

def build_snapshot(force: bool = False) -> Dict[str, Decimal]:
    _, _, snap = _paths()
    if not force and Path(snap).exists():
        with open(snap, "rb") as fh:
            return pickle.load(fh)
    df = get_df(force=force)
    serie = df.groupby("pieza", dropna=True)["qty"].sum()
    out = { str(k).strip(): Decimal(str(v)) for k, v in serie.items() if str(k).strip() }
    Path(snap).parent.mkdir(parents=True, exist_ok=True)
    with open(snap, "wb") as fh:
        pickle.dump(out, fh)
    return out

def get_snapshot_map() -> Dict[str, Decimal]:
    _, _, snap = _paths()
    if Path(snap).exists():
        with open(snap, "rb") as fh:
            return pickle.load(fh)
    return build_snapshot(force=False)

def query(
    pieza: str | None = None,
    org: str | None = None,
    fornecedor: str | None = None,
    search: str | None = None,
    prazo_ini: str | None = None,
    prazo_fim: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str | None = None,
    sort_dir: str = "asc",
) -> Tuple[int, List[Dict[str, Any]]]:
    df = get_df(force=False)

    if pieza:
        df = df[df["pieza"].astype(str).str.contains(str(pieza), case=False, na=False)]
    if org:
        df = df[df["org"].astype(str).str.contains(str(org), case=False, na=False)]
    if fornecedor:
        df = df[df["fornecedor"].astype(str).str.contains(str(fornecedor), case=False, na=False)]
    if search:
        s = str(search)
        mask = (
            df["pedido_num"].astype(str).str.contains(s, case=False, na=False) |
            df["pieza"].astype(str).str.contains(s, case=False, na=False) |
            df["fornecedor"].astype(str).str.contains(s, case=False, na=False)
        )
        df = df[mask]

    if "data_prevista" in df.columns:
        if prazo_ini:
            df = df[df["data_prevista"] >= pd.to_datetime(prazo_ini, errors="coerce")]
        if prazo_fim:
            df = df[df["data_prevista"] <= pd.to_datetime(prazo_fim, errors="coerce")]

    allowed_sorts = {"pedido_num", "pieza", "qty", "data_prevista", "org", "fornecedor", "ord_qty", "recv_qty"}
    if sort_by in allowed_sorts:
        ascending = (str(sort_dir).lower() != "desc")
        df = df.sort_values(by=sort_by, ascending=ascending)

    total = len(df)
    df = df.iloc[offset: offset + limit]

    rows = []
    for _, r in df.iterrows():
        rows.append({
            "pedido_num": str(r.get("pedido_num", "")),
            "pieza": str(r.get("pieza", "")),
            "qty": float(r.get("qty", 0)),
            "ord_qty": float(r.get("ord_qty", 0)),
            "recv_qty": float(r.get("recv_qty", 0)),
            "fornecedor": str(r.get("fornecedor", "")),
            "org": str(r.get("org", "")),
            "data_prevista": (pd.to_datetime(r["data_prevista"]).date().isoformat()
                              if "data_prevista" in r and pd.notnull(r["data_prevista"]) else None),
        })
    return total, rows
