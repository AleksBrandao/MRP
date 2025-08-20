# core/views.py
from datetime import date, timedelta
from io import BytesIO
import csv
from decimal import Decimal
from django.db.models import Prefetch
import logging

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

logger = logging.getLogger(__name__)
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
    queryset = BOM.objects.select_related("lista_pai", "componente").all()
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
    queryset = OrdemProducao.objects.all().order_by('-id')
    serializer_class = OrdemProducaoSerializer


# =========================
# Helpers de compatibilidade
# =========================

def _resolver_lista_da_ordem(ordem):
    """Agora a OP já referencia diretamente a Lista Técnica."""
    return ordem.lista


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
                "tipo": comp.tipo,  # 👈 ADICIONE ISTO
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
        for sub_id in ListaTecnica.objects.filter(parent=lista).values_list("id", flat=True):
            sub_lista = ListaTecnica.objects.get(id=sub_id)
            calcular_necessidades(
                sub_lista,
                necessidade_total,
                necessidades,
                nivel + 1,
                codigo_pai=lista.codigo,   # 👈 importante para o front mostrar árvore
            )


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


@api_view(['GET'])
def executar_mrp(request):
    necessidades = {}
    for op in OrdemProducao.objects.all().select_related('lista'):
        explodir_lista(op.lista, Decimal(op.quantidade), necessidades, nivel=0, codigo_pai=op.lista.codigo)
    return Response(list(necessidades.values()))

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

        # Inicializa estrutura para evitar repetição do mesmo componente
        vistos = set()

        adicionar_detalhes_recursivo(
            lista_id=lista.id,
            multiplicador=ordem.quantidade,
            acumulado=resultado,
            vistos=vistos
        )

    # Fallback: cria detalhe genérico se houver necessidade sem detalhes
    for item in resultado.values():
        necessidade = int(item.get("necessario", 0))
        estoque = int(item.get("estoque", 0))
        faltando = max(0, necessidade - estoque)
        detalhes = item.get("detalhes", [])

        if faltando > 0 and not detalhes:
            lead_time = int(item.get("lead_time") or 0)
            item["detalhes"] = [{
                "tipo": "fallback",
                "descricao": "Necessidade líquida sem origem rastreável.",
                "quantidade": faltando,
                "estoque_considerado": estoque,
                "lead_time": lead_time,
                "data_sugerida": (date.today() + timedelta(days=lead_time)).isoformat(),
                "origem": None,
                "ordem_id": None,
                "lista_id": None,
            }]

    return Response(list(resultado.values()), status=status.HTTP_200_OK)



# core/views.py
from django.db.models import Prefetch
import logging

logger = logging.getLogger(__name__)

def adicionar_detalhes_recursivo(lista_id, multiplicador, acumulado, vistos, ordem_id=None, lista_final_nome=None, nivel=0):
    """
    Expande a BOM a partir de uma lista_pai (id), multiplicando as quantidades
    e acumulando por componente, com detalhamento por OP e lista.
    """
    if lista_id in vistos:
        return  # evita ciclos
    vistos.add(lista_id)

    relacoes = (
        BOM.objects
        .filter(lista_pai_id=lista_id, componente__isnull=False)
        .select_related("componente")
    )

    for rel in relacoes:
        comp = rel.componente
        if comp is None:
            continue

        qtd_total = (rel.quantidade or 0) * (multiplicador or 1)
        key = comp.id

        if key not in acumulado:
            acumulado[key] = {
                "produto_id": comp.id,
                "codigo": getattr(comp, "codigo", ""),
                "nome": getattr(comp, "nome", ""),
                "necessario": 0,
                "estoque": getattr(comp, "estoque", 0),
                "lead_time": getattr(comp, "lead_time", 0),
                "detalhes": [],
            }

        acumulado[key]["necessario"] += qtd_total
        acumulado[key]["faltando"] = max(0, acumulado[key]["necessario"] - acumulado[key]["estoque"])

        acumulado[key]["detalhes"].append({
            "tipo": "op",
            "descricao": f"Necessário para OP #{ordem_id} do produto {lista_final_nome}",
            "quantidade": qtd_total,
            "estoque_considerado": getattr(comp, "estoque", 0),
            "lead_time": getattr(comp, "lead_time", 0),
            "data_sugerida": (date.today() + timedelta(days=comp.lead_time)).isoformat(),
            "origem": "Ordem de Produção",
            "ordem_id": ordem_id,
            "lista_id": lista_id,
        })

        # Recursão se o componente for usado como pai em uma nova lista
        if BOM.objects.filter(lista_pai_id=comp.id, componente__isnull=False).exists():
            adicionar_detalhes_recursivo(
                lista_id=comp.id,
                multiplicador=qtd_total,
                acumulado=acumulado,
                vistos=vistos,
                ordem_id=ordem_id,
                lista_final_nome=lista_final_nome,
                nivel=nivel + 1
            )




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

def explodir_lista(lista: ListaTecnica, fator: Decimal, necessidades: dict, nivel: int, codigo_pai: str):
    itens = BOM.objects.filter(lista_pai=lista).select_related('componente', 'sublista')
    for item in itens:
        mult = fator * item.quantidade

        if item.componente:
            comp = item.componente
            estoque_atual = comp.estoque or 0
            necessario = Decimal(mult)
            faltando = max(Decimal(0), necessario - estoque_atual)

            acum = necessidades.setdefault(comp.id, {
                "codigo": comp.codigo,
                "nome": comp.nome,
                "tipo": comp.tipo,  # "componente" ou "materia_prima"
                "necessario": Decimal(0),
                "em_estoque": Decimal(0),
                "faltando": Decimal(0),
                "lead_time": comp.lead_time,
                "nivel": nivel,
                "codigo_pai": codigo_pai,
            })
            acum["necessario"] += necessario
            acum["em_estoque"] = estoque_atual  # pode somar se quiser considerar múltiplas linhas
            acum["faltando"] = max(Decimal(0), acum["necessario"] - estoque_atual)

        elif item.sublista:
            explodir_lista(item.sublista, mult, necessidades, nivel + 1, codigo_pai=lista.codigo)
