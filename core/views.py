# core/views.py
from __future__ import annotations
from typing import Dict, Any
from rest_framework.decorators import action

import csv
from io import BytesIO

from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import viewsets, filters

from .models import Produto, BOM, OrdemProducao, ListaTecnica
from .serializers import ProdutoSerializer, BOMSerializer, OrdemProducaoSerializer, ListaTecnicaSerializer

from .utils import (
    calcular_mrp_recursivo,
    adicionar_detalhes_recursivo,
)

# =========================
# ViewSets (CRUDs principais)
# =========================

class BaseProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer


class ComponentesViewSet(BaseProdutoViewSet):
    """No banco continua tipo='produto' (exibido como 'Componente' no front)."""
    def get_queryset(self):
        return super().get_queryset().filter(tipo="produto")

    def perform_create(self, serializer):
        serializer.save(tipo="produto")


class MateriasPrimasViewSet(BaseProdutoViewSet):
    def get_queryset(self):
        return super().get_queryset().filter(tipo="materia_prima")

    def perform_create(self, serializer):
        serializer.save(tipo="materia_prima")


class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.select_related("produto_pai", "componente").all()
    serializer_class = BOMSerializer

    @action(detail=True, methods=["get"], url_path="tree")
    def tree(self, request, pk=None):
        # pk = id do produto raiz (produto_pai)
        from .models import Produto
        produto = Produto.objects.get(pk=pk)
        return Response(_build_bom_tree(produto))

def _build_bom_tree(produto):
    node = {
        "id": produto.id,
        "codigo": produto.codigo,
        "nome": produto.nome,
        "children": [],
    }
    # incluímos o id da relação (linha da BOM) para deletar pelo nó
    for rel in BOM.objects.filter(produto_pai=produto).select_related("componente"):
        node["children"].append({
            "rel_id": rel.id,
            **_build_bom_tree(rel.componente)
        })
    return node


class OrdemProducaoViewSet(viewsets.ModelViewSet):
    queryset = OrdemProducao.objects.all()
    serializer_class = OrdemProducaoSerializer


# =========================
# Endpoints MRP e Exportações
# =========================

@api_view(["GET"])
def executar_mrp(request):
    """Retorna a lista agregada de necessidades com data de compra estimada."""
    return Response(calcular_mrp_recursivo())


@api_view(["GET"])
def exportar_mrp_csv(request):
    """Exporta visão agregada simples em CSV (nome, necessário)."""
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="resultado_mrp.csv"'

    writer = csv.writer(response)
    writer.writerow(["Produto", "Necessidade"])

    for item in calcular_mrp_recursivo():
        writer.writerow([item["nome"], item["necessario"]])

    return response


@api_view(["GET"])
def exportar_mrp_excel(request):
    """
    Exporta a visão detalhada (por OP) em XLSX, com saldo progressivo por componente.
    Otimizações:
      - evita N consultas buscando OP por id a cada linha (usa cache local)
      - ajusta largura de colunas ao final
    """
    from openpyxl import Workbook
    from openpyxl.utils import get_column_letter

    resultado: Dict[int, Dict[str, Any]] = {}
    ordens = list(OrdemProducao.objects.all())

    # cache de datas para não consultar dentro do loop
    mapa_datas = {op.id: op.data_entrega for op in ordens}

    for ordem in ordens:
        adicionar_detalhes_recursivo(
            produto=ordem.produto,
            qtd_produto_op=ordem.quantidade,
            ordem_id=ordem.id,
            produto_final_nome=ordem.produto.nome,
            resultado=resultado,
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "MRP Detalhado"

    headers = [
        "OP", "Produto Final", "Qtd OP", "Qtd por Unidade", "Qtd Necessária",
        "Componente", "Data Necessidade", "Em Estoque", "Faltando", "Saldo Estoque",
    ]
    ws.append(headers)

    for comp in resultado.values():
        estoque_disponivel = float(comp["em_estoque"])
        for d in comp["detalhes"]:
            qtd_necessaria = float(d["qtd_necessaria"])
            faltando = max(0.0, qtd_necessaria - estoque_disponivel)
            saldo = estoque_disponivel - qtd_necessaria

            data = mapa_datas.get(int(d["ordem_producao"]))
            data_fmt = data.strftime("%d/%m/%Y") if data else ""

            ws.append([
                d["ordem_producao"],
                d["produto_final"],
                d["qtd_produto"],
                d["qtd_componente_por_unidade"],
                qtd_necessaria,
                f"{comp['codigo_componente']} - {comp['nome_componente']}",
                data_fmt,
                estoque_disponivel,
                faltando,
                saldo,
            ])

            # saldo progressivo por componente
            estoque_disponivel = max(0.0, saldo)

    # Ajuste de colunas
    for col in ws.columns:
        max_len = max((len(str(c.value)) if c.value is not None else 0) for c in col)
        ws.column_dimensions[get_column_letter(col[0].column)].width = max_len + 2

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="mrp_detalhado.xlsx"'
    wb.save(response)
    return response


# =========================
# Histórico de alterações
# =========================

@api_view(["GET"])
def historico_produto(request, produto_id: int):
    try:
        produto = Produto.objects.get(id=produto_id)
    except Produto.DoesNotExist:
        return Response({"erro": "Produto não encontrado"}, status=404)

    historico = produto.history.all().order_by("-history_date")
    data = [{
        "estoque": v.estoque,
        "data": v.history_date,
        "usuario": v.history_user.username if v.history_user else "Desconhecido",
        "tipo": v.history_type,
    } for v in historico]

    return Response(data)


@api_view(["GET"])
def historico_todos_os_produtos(request):
    registros = []
    for p in Produto.objects.all():
        for v in p.history.all().order_by("-history_date"):
            registros.append({
                "produto_id": p.id,
                "produto_nome": p.nome,
                "estoque": v.estoque,
                "usuario": v.history_user.username if v.history_user else "Desconhecido",
                "tipo": v.history_type,
                "data": v.history_date,
            })

    registros.sort(key=lambda x: x["data"], reverse=True)
    return Response(registros)


# =========================
# MRP detalhado (JSON)
# =========================

@api_view(["GET"])
def mrp_detalhado(request):
    resultado: Dict[int, Dict[str, Any]] = {}
    for ordem in OrdemProducao.objects.all():
        adicionar_detalhes_recursivo(
            produto=ordem.produto,
            qtd_produto_op=ordem.quantidade,
            ordem_id=ordem.id,
            produto_final_nome=ordem.produto.nome,
            resultado=resultado,
        )
    return Response(list(resultado.values()))

class ListaTecnicaViewSet(viewsets.ModelViewSet):
    queryset = ListaTecnica.objects.all().order_by("tipo", "codigo")
    serializer_class = ListaTecnicaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nome", "tipo"]
    ordering_fields = ["codigo", "nome", "tipo", "criado_em"]