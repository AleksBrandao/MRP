# core/views.py
from datetime import date, timedelta
from io import BytesIO
import csv

from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Produto, BOM, OrdemProducao, ListaTecnica
from .serializers import (
    ProdutoSerializer,
    BOMSerializer,
    OrdemProducaoSerializer,
    ListaTecnicaSerializer,
)

# =========================
# ViewSets
# =========================

class ComponenteViewSet(viewsets.ModelViewSet):
    # choices agora são minúsculos; usar iexact por segurança
    queryset = Produto.objects.filter(tipo__iexact="componente")
    serializer_class = ProdutoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nome", "fabricante", "codigo_fabricante"]
    ordering_fields = ["codigo", "nome", "estoque", "lead_time"]


class ListaTecnicaViewSet(viewsets.ModelViewSet):
    queryset = ListaTecnica.objects.all()
    serializer_class = ListaTecnicaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nome", "observacoes"]
    ordering_fields = ["codigo", "nome", "tipo", "criado_em"]


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["codigo", "nome", "fabricante", "codigo_fabricante"]
    ordering_fields = ["codigo", "nome", "estoque", "lead_time"]

    def get_queryset(self):
        # garante que "lista" legado não apareça mais como produto
        return Produto.objects.exclude(tipo__iexact="lista")


class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.select_related("lista_pai", "componente")
    serializer_class = BOMSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "lista_pai__codigo",
        "lista_pai__nome",
        "componente__codigo",
        "componente__nome",
    ]
    ordering_fields = ["lista_pai__codigo", "componente__codigo", "quantidade"]


class OrdemProducaoViewSet(viewsets.ModelViewSet):
    queryset = OrdemProducao.objects.all()
    serializer_class = OrdemProducaoSerializer


# =========================
# Helpers de compatibilidade
# =========================

def _resolver_lista_da_ordem(ordem):
    """
    Compat: se OrdemProducao ainda referencia Produto (legado),
    tentamos achar a ListaTecnica com o MESMO código.
    Retorna uma instância de ListaTecnica ou None.
    """
    alvo = ordem.produto  # legado: FK para Produto
    # Novo modelo: se você já migrou o campo para 'lista', basta trocar aqui.
    # p.ex.: alvo = ordem.lista
    try:
        # quando já for ListaTecnica (após migração do modelo da OP)
        if isinstance(alvo, ListaTecnica):
            return alvo
    except Exception:
        pass

    # Legado: Produto "lista" → procurar ListaTecnica por código
    codigo = getattr(alvo, "codigo", None)
    if not codigo:
        return None
    try:
        return ListaTecnica.objects.get(codigo=codigo)
    except ListaTecnica.DoesNotExist:
        return None


# =========================
# MRP (recursivo + detalhado)
# =========================

def calcular_necessidades(lista, quantidade, necessidades, nivel=0, codigo_pai=None):
    """
    Expande a BOM a partir de uma ListaTecnica (lista_pai).
    Mantém os campos esperados no frontend.
    """
    boms = BOM.objects.filter(lista_pai=lista)
    for item in boms:
        comp = item.componente
        necessidade_total = float(quantidade) * float(item.quantidade)
        estoque_atual = float(comp.estoque or 0.0)
        necessidade_liquida = max(0.0, necessidade_total - estoque_atual)

        if comp.id not in necessidades:
            necessidades[comp.id] = {
                "codigo": comp.codigo,
                "nome": comp.nome,
                "necessario": necessidade_total,
                "em_estoque": estoque_atual,
                "faltando": necessidade_liquida,
                "lead_time": comp.lead_time,
                "data_compra": "",  # será preenchido depois
                "nivel": nivel,
                "codigo_pai": codigo_pai,
            }
        else:
            necessidades[comp.id]["necessario"] += necessidade_total
            necessidades[comp.id]["faltando"] = max(
                0.0,
                necessidades[comp.id]["necessario"] - necessidades[comp.id]["em_estoque"],
            )

        # Recursão: se você tiver sub-listas (lista dentro de lista),
        # troque 'comp' por uma ListaTecnica filha. Caso contrário, a recursão para aqui.
        # Exemplo (se usar sub-listas por parent):
        # for sub_id in ListaTecnica.objects.filter(parent=lista).values_list("id", flat=True):
        #     calcular_necessidades(ListaTecnica.objects.get(id=sub_id), necessidade_total, necessidades, nivel + 1, lista.codigo)


def calcular_mrp_recursivo():
    necessidades = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        lista = _resolver_lista_da_ordem(ordem)
        if not lista:
            # ordem não tem lista resolvível → pula com segurança
            continue
        calcular_necessidades(lista, ordem.quantidade, necessidades, nivel=0, codigo_pai=None)

    # definir data_compra usando a menor data de entrega das OPs
    if ordens.exists():
        menor_data_entrega = min(o.data_entrega for o in ordens)
    else:
        menor_data_entrega = date.today()

    for item in necessidades.values():
        lead = int(item.get("lead_time") or 0)
        item["data_compra"] = (menor_data_entrega - timedelta(days=lead)).isoformat()

    return list(necessidades.values())


@api_view(["GET"])
def executar_mrp(request):
    return Response(calcular_mrp_recursivo(), status=status.HTTP_200_OK)


@api_view(["GET"])
def exportar_mrp_csv(request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="resultado_mrp.csv"'

    writer = csv.writer(response)
    writer.writerow(["Produto", "Necessidade"])

    for item in calcular_mrp_recursivo():
        writer.writerow([item["nome"], item["necessario"]])

    return response


@api_view(["GET"])
def exportar_mrp_excel(request):
    from openpyxl import Workbook
    from openpyxl.utils import get_column_letter

    resultado = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        lista = _resolver_lista_da_ordem(ordem)
        if not lista:
            continue
        adicionar_detalhes_recursivo(
            lista=lista,
            qtd_lista_op=ordem.quantidade,
            ordem_id=ordem.id,
            lista_final_nome=lista.nome,
            resultado=resultado,
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "MRP Detalhado"

    headers = [
        "OP",
        "Produto Final",
        "Qtd OP",
        "Qtd por Unidade",
        "Qtd Necessária",
        "Componente",
        "Data Necessidade",
        "Em Estoque",
        "Faltando",
        "Saldo Estoque",
    ]
    ws.append(headers)

    for comp in resultado.values():
        estoque_disponivel = comp["em_estoque"]
        for d in comp["detalhes"]:
            faltando = max(0, d["qtd_necessaria"] - estoque_disponivel)
            saldo = estoque_disponivel - d["qtd_necessaria"]
            data = (
                OrdemProducao.objects.get(id=int(d["ordem_producao"]))
                .data_entrega.strftime("%d/%m/%Y")
            )

            ws.append(
                [
                    d["ordem_producao"],
                    d["produto_final"],
                    d["qtd_produto"],
                    d["qtd_componente_por_unidade"],
                    d["qtd_necessaria"],
                    f"{comp['codigo_componente']} - {comp['nome_componente']}",
                    data,
                    estoque_disponivel,
                    faltando,
                    saldo,
                ]
            )

            estoque_disponivel = max(0, saldo)

    # Largura auto
    for col in ws.columns:
        max_length = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max_length + 2

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="mrp_detalhado.xlsx"'
    wb.save(response)
    return response


@api_view(["GET"])
def mrp_detalhado(request):
    resultado = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        lista = _resolver_lista_da_ordem(ordem)
        if not lista:
            continue
        adicionar_detalhes_recursivo(
            lista=lista,
            qtd_lista_op=ordem.quantidade,
            ordem_id=ordem.id,
            lista_final_nome=lista.nome,
            resultado=resultado,
        )

    return Response(list(resultado.values()), status=status.HTTP_200_OK)


def adicionar_detalhes_recursivo(
    lista, qtd_lista_op, ordem_id, lista_final_nome, resultado, nivel=0
):
    """
    Versão 'detalhada' usando lista_pai.
    """
    boms = BOM.objects.filter(lista_pai=lista)

    for bom in boms:
        total = float(qtd_lista_op) * float(bom.quantidade)
        comp = bom.componente
        comp_id = comp.id

        if comp_id not in resultado:
            resultado[comp_id] = {
                "codigo_componente": comp.codigo,
                "nome_componente": comp.nome,
                "total_necessario": 0.0,
                "em_estoque": float(comp.estoque or 0.0),
                "faltando": 0.0,
                "detalhes": [],
            }

        resultado[comp_id]["total_necessario"] += total
        resultado[comp_id]["faltando"] = max(
            0.0,
            resultado[comp_id]["total_necessario"] - resultado[comp_id]["em_estoque"],
        )

        resultado[comp_id]["detalhes"].append(
            {
                "ordem_producao": str(ordem_id),
                "produto_final": lista_final_nome,
                "qtd_produto": qtd_lista_op,
                "qtd_componente_por_unidade": float(bom.quantidade),
                "qtd_necessaria": total,
            }
        )

        # Se existirem sub-listas (listas-filhas), descomente e propague:
        # for sub in ListaTecnica.objects.filter(parent=lista):
        #     adicionar_detalhes_recursivo(sub, total, ordem_id, lista_final_nome, resultado, nivel + 1)


@api_view(["POST"])
def criar_lista_tecnica(request):
    serializer = ListaTecnicaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def historico_produto(request, produto_id: int):
    # Histórico detalhado de um produto/componente específico
    try:
        p = Produto.objects.get(id=produto_id)
    except Produto.DoesNotExist:
        return Response({"detail": "Produto não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    registros = []
    # Requer simple_history (já presente no model)
    for h in p.history.order_by("-history_date"):
        registros.append({
            "data": h.history_date.isoformat(),
            "usuario": getattr(h.history_user, "username", None),
            "acao": {"+": "Criado", "~": "Alterado", "-": "Excluído"}.get(h.history_type, h.history_type),
            "codigo": h.codigo,
            "nome": h.nome,
            "fabricante": h.fabricante,
            "codigo_fabricante": h.codigo_fabricante,
            "unidade": h.unidade,
            "estoque": float(h.estoque or 0),
            "lead_time": int(h.lead_time or 0),
            "tipo": h.tipo,
        })
    return Response(registros, status=status.HTTP_200_OK)

@api_view(["GET"])
def historico_todos_os_produtos(request):
    # Última alteração por produto (visão geral)
    out = []
    for p in Produto.objects.all().order_by("codigo"):
        h = p.history.order_by("-history_date").first()
        out.append({
            "id": p.id,
            "codigo": p.codigo,
            "nome": p.nome,
            "ultima_acao": ({"+" : "Criado","~":"Alterado","-":"Excluído"}.get(h.history_type, h.history_type) if h else None),
            "ultima_data": (h.history_date.isoformat() if h else None),
        })
    return Response(out, status=status.HTTP_200_OK)