# core/views.py
from datetime import date, timedelta
from io import BytesIO
import csv
from decimal import Decimal
from django.db.models import Prefetch, Q
import logging

from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.views import APIView

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Produto, BOM, OrdemProducao, ListaTecnica
from .serializers import (
    ProdutoSerializer,
    BOMSerializer,
    OrdemProducaoSerializer,
    ListaTecnicaSerializer,
)

from django.utils.functional import cached_property

from openpyxl import Workbook
from openpyxl.utils import get_column_letter

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

    print("⚙️ Iniciando exportação MRP detalhado...")
    resultado = {}
    ordens = OrdemProducao.objects.all()
    print(f"🧾 Total de ordens de produção encontradas: {ordens.count()}")

    for ordem in ordens:
        lista = _resolver_lista_da_ordem(ordem)
        print(f"🔁 Processando OP #{ordem.id} com lista {getattr(lista, 'codigo', '?')}")

        if not lista:
            print(f"⚠️ OP #{ordem.id} não possui lista associada.")
            continue

        adicionar_detalhes_recursivo(
            lista_id=lista.id,
            multiplicador=ordem.quantidade,
            acumulado=resultado,
            vistos=set(),
            ordem_id=ordem.id,
            lista_final_nome=lista.nome,
        )

    print(f"📦 Total de componentes encontrados no resultado: {len(resultado)}")

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
            try:
                data = (
                    
                    OrdemProducao.objects.get(id=int(d.get("ordem_producao")))
                    .data_entrega.strftime("%d/%m/%Y")
                )
            except:
                data = "—"

            ws.append(
                [
                    d.get("ordem_producao", "—"),
                    d["produto_final"] if "produto_final" in d else "—",
                    d.get("qtd_produto", "—"),
                    d.get("qtd_componente_por_unidade", "—"),
                    d["qtd_necessaria"],
                    f"{comp.get('codigo_componente', '—')} - {comp.get('nome_componente', '—')}",
                    data,
                    estoque_disponivel,
                    faltando,
                    saldo,
                ]
            )

            estoque_disponivel = max(0, saldo)

    # Largura automática
    for col in ws.columns:
        max_length = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max_length + 2

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="mrp_detalhado.xlsx"'
    wb.save(response)

    logger.info("✅ Arquivo Excel gerado com sucesso!")

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
            vistos=set(),
            ordem_id=ordem.id,
            lista_final_nome=lista.nome,
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
        .filter(lista_pai_id=lista_id)
        .select_related("componente", "sublista")
    )

    for rel in relacoes:
        comp = rel.componente
        sublista = rel.sublista
        qtd_total = (rel.quantidade or 0) * (multiplicador or 1)

        if comp:
            key = comp.id
            if key not in acumulado:
                acumulado[key] = {
                    "produto_id": comp.id,
                    "codigo_componente": getattr(comp, "codigo", ""),
                    "nome_componente": getattr(comp, "nome", ""),
                    "necessario": 0,
                    "em_estoque": getattr(comp, "estoque", 0),
                    "faltando": 0,
                    "lead_time": getattr(comp, "lead_time", 0),
                    "detalhes": [],
                }

            acumulado[key]["necessario"] += qtd_total
            acumulado[key]["faltando"] = max(0, acumulado[key]["necessario"] - acumulado[key]["em_estoque"])

            acumulado[key]["detalhes"].append({
                "ordem_producao": ordem_id,
                "produto_final": lista_final_nome,
                "qtd_produto": multiplicador,
                "qtd_componente_por_unidade": rel.quantidade,
                "qtd_necessaria": qtd_total,
            })

        elif sublista:
            adicionar_detalhes_recursivo(
                lista_id=sublista.id,
                multiplicador=qtd_total,
                acumulado=acumulado,
                vistos=vistos,
                ordem_id=ordem_id,
                lista_final_nome=lista_final_nome,
                nivel=nivel + 1,
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

# --- helper para montar "[CODIGO] NOME" com segurança ---
def _fmt_codigo_nome(obj):
    """
    Formata como "[CODIGO] NOME" quando houver código.
    Se não houver código, retorna apenas o nome.
    """
    if not obj:
        return ""
    codigo = (getattr(obj, "codigo", "") or "").strip()
    nome = (getattr(obj, "nome", "") or "").strip()
    return f"[{codigo}] {nome}".strip() if codigo else nome


def _cadeia_desde_raiz(no):
    """
    Retorna a cadeia de nós da RAIZ até 'no' (incluindo 'no').
    Usa o atributo 'parent' se existir em ListaTecnica. Se não existir,
    a cadeia terá apenas o próprio nó.
    """
    if not no:
        return []

    cadeia = []
    atual = no
    safety = 0
    # sobe enquanto houver parent, protegendo contra ciclos
    while atual and safety < 20:
        cadeia.append(atual)
        atual = getattr(atual, "parent", None)  # funciona mesmo se 'parent' não existir
        safety += 1

    # cadeia está do nó atual para cima; invertendo fica raiz -> ... -> nó
    return list(reversed(cadeia))

# --- helper para obter cadeia hierárquica a partir de uma lista (se existir parent) ---
def _hierarquia(lista):
    """
    Retorna até 5 níveis: [Série, Sistema, Conjunto, Subconjunto, Item]
    Se o seu modelo ListaTecnica não tiver `parent`, nada quebra: os níveis extras ficam vazios.
    """
    niveis = ["", "", "", "", ""]
    if not lista:
        return niveis

    # Caminha para cima se houver `parent`. Mantém robusto se não existir.
    cadeia = []
    atual = lista
    safety = 0
    while atual and safety < 10:
        cadeia.append(atual)
        atual = getattr(atual, "parent", None)  # se não existir parent, vira None
        safety += 1

    cadeia = list(reversed(cadeia))  # do mais alto ao mais baixo
    for i in range(min(5, len(cadeia))):
        niveis[i] = _fmt_codigo_nome(cadeia[i])

    return niveis

def _codigo_nome(obj):
    """
    Retorna (codigo, nome) de um objeto com attrs 'codigo' e 'nome'.
    Se obj for None, retorna ("", "").
    """
    if not obj:
        return "", ""
    return (getattr(obj, "codigo", "") or "").strip(), (getattr(obj, "nome", "") or "").strip()

class BOMFlatView(APIView):
    """
    GET /api/bom-flat/?lista_id=...&search=...&incluir_grupos=1
    Retorna linhas em formato de planilha, agora com campos SEPARADOS:
    <nivel>_codigo, <nivel>_nome, e componente_codigo / componente_nome.
    """

    def get(self, request, *args, **kwargs):
        lista_id = request.GET.get("lista_id")
        search = (request.GET.get("search") or "").strip()

        qs = BOM.objects.select_related("lista_pai", "sublista", "componente")

        incluir_grupos = request.GET.get("incluir_grupos")
        if not (incluir_grupos and incluir_grupos.lower() in ("1", "true", "t", "yes")):
            qs = qs.filter(componente__isnull=False)

        if lista_id:
            qs = qs.filter(lista_pai_id=lista_id)

        if search:
            qs = qs.filter(
                Q(lista_pai__codigo__icontains=search)
                | Q(lista_pai__nome__icontains=search)
                | Q(sublista__codigo__icontains=search)
                | Q(sublista__nome__icontains=search)
                | Q(componente__codigo__icontains=search)
                | Q(componente__nome__icontains=search)
                | Q(comentarios__icontains=search)
            )

        linhas = []
        for item in qs.order_by("lista_pai__codigo", "id"):
            # nó de referência (como você já fazia)
            no_ref = item.sublista or item.lista_pai

            # sobe árvore até a raiz (você já tem helper pra isso)
            cadeia = _cadeia_desde_raiz(no_ref)

            # Preenche listas paralelas de códigos/nomes por nível
            cods = ["", "", "", "", ""]
            nomes = ["", "", "", "", ""]
            for i, nodo in enumerate(cadeia[:5]):
                cods[i], nomes[i] = _codigo_nome(nodo)

            serie_cod, sistema_cod, conjunto_cod, subconj_cod, item_cod = cods
            serie_nom, sistema_nom, conjunto_nom, subconj_nom, item_nom = nomes

            # nível atual (0..4)
            nivel = min(len(cadeia) - 1, 4) if cadeia else 0

            # ponderação / quant_ponderada (mesma lógica sua)
            ponderacao = (getattr(item, "ponderacao_operacao", 100) or 100)
            q = float(item.quantidade or 0)
            if hasattr(item, "quant_ponderada") and item.quant_ponderada is not None:
                quant_pond = float(item.quant_ponderada)
            else:
                quant_pond = q * float(ponderacao) / 100.0

            comp_cod, comp_nom = _codigo_nome(item.componente)

            linha = {
                # níveis separados (sem colchetes)
                "serie_codigo": serie_cod,
                "serie_nome":   serie_nom,
                "sistema_codigo": sistema_cod,
                "sistema_nome":   sistema_nom,
                "conjunto_codigo": conjunto_cod,
                "conjunto_nome":   conjunto_nom,
                "subconjunto_codigo": subconj_cod,
                "subconjunto_nome":   subconj_nom,
                # Item só quando o nó é realmente item
                "item_codigo": item_cod if nivel == 4 else "",
                "item_nome":   item_nom if nivel == 4 else "",
                "nivel": int(nivel),

                # componente separado
                "componente_codigo": comp_cod,
                "componente_nome":   comp_nom,

                # quantitativos
                "quantidade": q,
                "ponderacao": float(ponderacao),
                "quant_ponderada": float(quant_pond),

                # observações
                "comentarios": getattr(item, "comentarios", "") or "",
            }

            # (opcional) manter legacy, se quiser compat com telas antigas:
            # linha["serie"] = serie_nom
            # linha["sistema"] = sistema_nom
            # linha["conjunto"] = conjunto_nom
            # linha["subconjunto"] = subconj_nom
            # linha["item_nivel"] = item_nom if nivel == 4 else ""
            # linha["componente"] = f"[{comp_cod}] {comp_nom}".strip() if comp_cod else comp_nom

            linhas.append(linha)

        # Se você já criou o BOMFlatRowSerializer, pode validar antes de responder:
        # from .serializers import BOMFlatRowSerializer
        # data = BOMFlatRowSerializer(linhas, many=True).data
        # return Response(data, status=200)

        return Response(linhas, status=200)



class BOMFlatXLSXView(APIView):
    def get(self, request, *args, **kwargs):
        lista_id = request.GET.get("lista_id")
        search = (request.GET.get("search") or "").strip()
        detalhado = (request.GET.get("detalhado") or "").lower() in ("1","true","t","yes")

        qs = BOM.objects.select_related("lista_pai","sublista","componente")
        if not detalhado:
            qs = qs.filter(componente__isnull=False)
        if lista_id:
            qs = qs.filter(lista_pai_id=lista_id)
        if search:
            qs = qs.filter(
                Q(lista_pai__codigo__icontains=search) |
                Q(lista_pai__nome__icontains=search) |
                Q(sublista__codigo__icontains=search) |
                Q(sublista__nome__icontains=search) |
                Q(componente__codigo__icontains=search) |
                Q(componente__nome__icontains=search) |
                Q(comentarios__icontains=search)
            )

        wb = Workbook()
        ws = wb.active
        ws.title = "BOM"

        # Cabeçalho: níveis por NOME e Componente separado em Código + Nome
        header = (["Série","Sistema","Conjunto","Subconjunto","Item"]
                  if detalhado else
                  ["Série","Sistema","Conjunto","Subconjunto"])
        header += ["Código","Componente","Quantidade","Ponderação","Quant. Ponderada","Comentários"]
        ws.append(header)

        for item in qs.order_by("lista_pai__codigo","id"):
            no_ref = item.sublista or item.lista_pai
            cadeia = _cadeia_desde_raiz(no_ref)  # RAIZ -> ... -> nó
            # Extrai NOMES (sem colchetes) para os níveis
            nomes = ["","","","",""]
            for i, nodo in enumerate(cadeia[:5]):
                _, nome = _codigo_nome(nodo)  # <- usa helper que retorna (codigo, nome)
                nomes[i] = nome
            serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome = nomes

            nivel = min(len(cadeia)-1, 4) if cadeia else 0

            # Ponderação / quant. ponderada
            ponderacao = getattr(item,"ponderacao_operacao",100) or 100
            q = float(item.quantidade or 0)
            quant_pond = q * float(ponderacao) / 100.0

            # Componente separado
            comp_cod, comp_nom = _codigo_nome(item.componente)

            row = [serie_nome, sistema_nome, conjunto_nome, subconjunto_nome]
            if detalhado:
                row.append(item_nome if nivel == 4 else "")
            row += [
                comp_cod,
                comp_nom,
                q,
                f"{int(ponderacao)}%",
                quant_pond,
                getattr(item,"comentarios","") or "",
            ]
            ws.append(row)

        # Largura automática (limitada)
        for col in ws.columns:
            max_len = max(len(str(c.value)) if c.value is not None else 0 for c in col)
            ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 2, 80)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="bom_planilha.xlsx"'
        wb.save(response)
        return response
