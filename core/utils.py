# core/utils.py
from __future__ import annotations
from datetime import date, timedelta
from typing import Dict, Any, Optional, List

from .models import Produto, BOM, OrdemProducao


def calcular_necessidades(
    produto: Produto,
    quantidade: float,
    necessidades: Dict[int, Dict[str, Any]],
    nivel: int = 0,
    codigo_pai: Optional[str] = None,
) -> None:
    """
    Varre a BOM recursivamente e agrega necessidades por componente.
    """
    for item in BOM.objects.filter(produto_pai=produto):
        necessidade_total = quantidade * float(item.quantidade)
        estoque_atual = float(item.componente.estoque)
        necessidade_liquida = max(0.0, necessidade_total - estoque_atual)

        cid = item.componente.id
        if cid not in necessidades:
            necessidades[cid] = {
                "codigo": item.componente.codigo,
                "nome": item.componente.nome,
                "necessario": necessidade_total,
                "em_estoque": estoque_atual,
                "faltando": necessidade_liquida,
                "lead_time": int(item.componente.lead_time or 0),
                "data_compra": "",  # preenchido depois
                "nivel": nivel,
                "codigo_pai": codigo_pai,
            }
        else:
            n = necessidades[cid]
            n["necessario"] += necessidade_total
            n["faltando"] = max(0.0, n["necessario"] - n["em_estoque"])

        # desce na árvore
        calcular_necessidades(
            item.componente,
            necessidade_total,
            necessidades,
            nivel=nivel + 1,
            codigo_pai=item.produto_pai.codigo,
        )


def calcular_mrp_recursivo() -> List[Dict[str, Any]]:
    """
    Agrega necessidades para todas as OPs (recursivo) e calcula data_compra
    com base na menor data de entrega.
    """
    necessidades: Dict[int, Dict[str, Any]] = {}
    ordens = list(OrdemProducao.objects.all())

    for op in ordens:
        calcular_necessidades(
            produto=op.produto,
            quantidade=float(op.quantidade),
            necessidades=necessidades,
            nivel=0,
            codigo_pai=None,
        )

    menor_data = min((op.data_entrega for op in ordens), default=date.today())

    resultado = list(necessidades.values())
    for item in resultado:
        lead = int(item.get("lead_time", 0) or 0)
        item["data_compra"] = (menor_data - timedelta(days=lead)).isoformat()

    return resultado


def adicionar_detalhes_recursivo(
    produto: Produto,
    qtd_produto_op: float,
    ordem_id: int,
    produto_final_nome: str,
    resultado: Dict[int, Dict[str, Any]],
    nivel: int = 0,
) -> None:
    """
    Monta a visão detalhada por componente e por OP (usada no Excel/JSON detalhado).
    """
    for bom in BOM.objects.filter(produto_pai=produto):
        total = float(qtd_produto_op) * float(bom.quantidade)
        comp = bom.componente
        cid = comp.id

        if cid not in resultado:
            resultado[cid] = {
                "codigo_componente": comp.codigo,
                "nome_componente": comp.nome,
                "total_necessario": 0.0,
                "em_estoque": float(comp.estoque),
                "faltando": 0.0,
                "detalhes": [],
            }

        bucket = resultado[cid]
        bucket["total_necessario"] += total
        bucket["faltando"] = max(0.0, bucket["total_necessario"] - bucket["em_estoque"])
        bucket["detalhes"].append({
            "ordem_producao": str(ordem_id),
            "produto_final": produto_final_nome,
            "qtd_produto": float(qtd_produto_op),
            "qtd_componente_por_unidade": float(bom.quantidade),
            "qtd_necessaria": total,
        })

        # desce níveis
        adicionar_detalhes_recursivo(
            comp, total, ordem_id, produto_final_nome, resultado, nivel + 1
        )


# --- compatibilidade com código antigo ---
def calcular_mrp() -> List[Dict[str, Any]]:
    """
    Compat: mantém a assinatura antiga chamando a versão recursiva nova.
    """
    return calcular_mrp_recursivo()
