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

from .models import Produto, BOM, OrdemProducao, ListaTecnica, BOMSublista, BOMComponente
from .serializers import (
    ProdutoSerializer,
    BOMSerializer,
    OrdemProducaoSerializer,
    ListaTecnicaSerializer,
    BOMSublistaSerializer, 
    BOMComponenteSerializer,
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

class BOMSublistaViewSet(viewsets.ModelViewSet):
    queryset = BOMSublista.objects.select_related("lista_pai", "sublista").all()
    serializer_class = BOMSublistaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["lista_pai__nome", "sublista__nome"]
    ordering_fields = ["lista_pai__nome", "sublista__nome"]

    def get_queryset(self):
        qs = super().get_queryset()
        lista_pai = self.request.query_params.get("lista_pai")
        if lista_pai:
            qs = qs.filter(lista_pai_id=lista_pai)
        return qs


class BOMComponenteViewSet(viewsets.ModelViewSet):
    queryset = BOMComponente.objects.select_related("lista_pai", "componente").all()
    serializer_class = BOMComponenteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["lista_pai__nome", "componente__nome", "comentarios"]
    ordering_fields = ["lista_pai__nome", "componente__nome", "quantidade"]

    def get_queryset(self):
        qs = super().get_queryset()
        lista_pai = self.request.query_params.get("lista_pai")
        if lista_pai:
            qs = qs.filter(lista_pai_id=lista_pai)
        componente = self.request.query_params.get("componente")  # 👈 novo
        if componente:
            qs = qs.filter(componente_id=componente)
        return qs


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
                "nome": _fmt_codigo_nome(comp or item.sublista),
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
    for op in OrdemProducao.objects.select_related("lista"):
        explodir_lista(op.lista, Decimal(op.quantidade), necessidades, nivel=0, codigo_pai=op.lista.codigo)
    return Response(list(necessidades.values()))


@api_view(["GET"])
def exportar_mrp_csv(request):
    resultado = {}
    for ordem in OrdemProducao.objects.select_related("lista"):
        lista = _resolver_lista_da_ordem(ordem)
        if not lista:
            continue
        adicionar_detalhes_recursivo(
            lista_id=lista.id,
            multiplicador=ordem.quantidade,
            acumulado=resultado,
            vistos=set(),
            ordem_id=ordem.id,
            lista_final_nome=lista.nome,
        )
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="resultado_mrp.csv"'
    writer = csv.writer(response)
    writer.writerow(["Produto", "Necessidade"])
    for comp in resultado.values():
        writer.writerow([comp["nome"], comp["necessario"]])
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
                    f"{comp.get('codigo', '—')} - {comp.get('nome', '—')}",
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
        estoque = int(item.get("em_estoque", 0))
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


def adicionar_detalhes_recursivo(
    lista_id, multiplicador, acumulado, vistos, ordem_id, lista_final_nome, nivel=0
):
    relacoes = (
        BOM.objects
        .filter(lista_pai_id=lista_id)
        .select_related("componente", "sublista")
    )

    for rel in relacoes:
        comp = rel.componente
        sublista = rel.sublista

        # aplica ponderação por UNIDADE (None -> 100, 0 -> 0)
        p_raw = rel.ponderacao_operacao
        p = Decimal(100 if p_raw is None else p_raw)
        qpond_unidade = (Decimal(rel.quantidade or 0) * p) / Decimal(100)

        # se 0%, não propaga e não gera linha
        if qpond_unidade == 0:
            continue

        qtd_total = qpond_unidade * (Decimal(multiplicador or 1))

        if comp:
            comp_id = comp.id  # CHAVE ÚNICA, SEMPRE POR ID

            if comp_id not in acumulado:
                acumulado[comp_id] = {
                    "id": comp_id,                                # 👈 adicionado
                    "produto_id": comp_id,
                    "codigo": (getattr(comp, "codigo", "") or ""),
                    "nome": (getattr(comp, "nome", "") or ""),
                    "necessario": Decimal(0),
                    "em_estoque": Decimal(getattr(comp, "estoque", 0) or 0),
                    "faltando": Decimal(0),
                    "lead_time": int(getattr(comp, "lead_time", 0) or 0),
                    "detalhes": [],
                }

            acumulado[comp_id]["necessario"] += qtd_total
            acumulado[comp_id]["faltando"] = max(
                Decimal(0),
                acumulado[comp_id]["necessario"] - acumulado[comp_id]["em_estoque"],
            )

            acumulado[comp_id]["detalhes"].append({
                "ordem_producao": ordem_id,
                "produto_final": lista_final_nome,
                "qtd_produto": multiplicador,
                # quantidade POR UNIDADE já ponderada
                "qtd_componente_por_unidade": qpond_unidade,
                "qtd_necessaria": qtd_total,
            })


        elif sublista:
            # desce usando a QUANTIDADE PONDERADA como multiplicador
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

def explodir_lista(lista, quantidade_base, necessidades, nivel=0, codigo_pai=None):
    for item in BOM.objects.filter(lista_pai=lista).select_related("componente", "sublista"):
        # Ponderação correta (None→100, 0→0)
        p_raw = item.ponderacao_operacao
        ponderacao = Decimal(100 if p_raw is None else p_raw)
        qpond_unidade = (Decimal(item.quantidade or 0) * ponderacao) / Decimal(100)

        if qpond_unidade == 0:
            continue

        if item.componente:
            comp = item.componente
            comp_id = comp.id                                  # <<<<<<<<<< CHAVE ÚNICA
            quant_ponderada = qpond_unidade * Decimal(quantidade_base)

            em_estoque = Decimal(comp.estoque or 0)
            atual = Decimal(necessidades.get(comp_id, {}).get("necessario", 0))
            novo_necessario = atual + quant_ponderada
            faltando = max(Decimal(0), novo_necessario - em_estoque)

            necessidades[comp_id] = {
                "id": comp_id,                                  # <<<<< mande o ID pro front
                "codigo": comp.codigo or "",                    # pode ser vazio
                "nome": comp.nome or "",
                "necessario": float(novo_necessario),
                "em_estoque": float(em_estoque),
                "faltando": float(faltando),
                "lead_time": int(getattr(comp, "lead_time", 0) or 0),
                "data_compra": "",
                "nivel": nivel,
                "codigo_pai": codigo_pai,
                "tipo": getattr(comp, "tipo", "componente"),
            }

        elif item.sublista:
            explodir_lista(
                item.sublista,
                Decimal(quantidade_base) * qpond_unidade,
                necessidades,
                nivel + 1,
                codigo_pai=lista.codigo,
            )




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

# --- BOM (Planilha) unificado: lê BOMComponente e (opcional) BOMSublista ---

class BOMFlatView(APIView):
    """
    GET /api/bom-flat/?lista_id=...&search=...&incluir_grupos=1
    Retorna linhas em formato de planilha com níveis separados e componente (código/nome).
    Passa a consolidar:
      - BOMComponente (linhas de componente)
      - BOMSublista   (linhas de grupo, só se incluir_grupos=1)
    """

    def get(self, request, *args, **kwargs):
        from .models import BOMComponente, BOMSublista

        lista_id = request.GET.get("lista_id")
        search = (request.GET.get("search") or "").strip()
        incluir_grupos = (request.GET.get("incluir_grupos") or "").lower() in ("1", "true", "t", "yes")

        # --- Componentes (linhas "de peça") ---
        q_comp = BOMComponente.objects.select_related("lista_pai", "componente")
        if lista_id:
            q_comp = q_comp.filter(lista_pai_id=lista_id)
        if search:
            q_comp = q_comp.filter(
                Q(lista_pai__codigo__icontains=search) |
                Q(lista_pai__nome__icontains=search)   |
                Q(componente__codigo__icontains=search)|
                Q(componente__nome__icontains=search)  |
                Q(comentarios__icontains=search)
            )

        linhas: list[dict] = []

        # Monta linhas a partir do nó de referência = lista_pai
        for item in q_comp.order_by("lista_pai__codigo", "id"):
            cadeia = _cadeia_desde_raiz(item.lista_pai)  # RAIZ -> ... -> nó atual

            # extrai nomes por nível
            nomes = ["", "", "", "", ""]
            for i, nodo in enumerate(cadeia[:5]):
                _, nome = _codigo_nome(nodo)
                nomes[i] = nome
            serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome = nomes

            # quantidade ponderada (seu model usa 'ponderacao')
            q = float(item.quantidade or 0)
            ponderacao = float(item.ponderacao or 0)
            quant_pond = q * (ponderacao / 100.0)

            comp_cod, comp_nom = _codigo_nome(item.componente)

            linhas.append({
                "serie_nome": serie_nome,
                "sistema_nome": sistema_nome,
                "conjunto_nome": conjunto_nome,
                "subconjunto_nome": subconjunto_nome,
                "item_nome": item_nome,  # só aparece se o nó for ITEM
                "componente_codigo": comp_cod,
                "componente_nome": comp_nom,
                "quantidade": q,
                "ponderacao": ponderacao,
                "quant_ponderada": quant_pond,
                "comentarios": item.comentarios or "",
            })

        # --- Grupos (sublistas) — só quando solicitado ---
        if incluir_grupos:
            q_grp = BOMSublista.objects.select_related("lista_pai", "sublista")
            if lista_id:
                q_grp = q_grp.filter(lista_pai_id=lista_id)
            if search:
                q_grp = q_grp.filter(
                    Q(lista_pai__codigo__icontains=search) |
                    Q(lista_pai__nome__icontains=search)   |
                    Q(sublista__codigo__icontains=search)  |
                    Q(sublista__nome__icontains=search)
                )

            for item in q_grp.order_by("lista_pai__codigo", "id"):
                # nó de referência (como você fazia antes): o grupo apontado
                no_ref = item.sublista or item.lista_pai
                cadeia = _cadeia_desde_raiz(no_ref)

                nomes = ["", "", "", "", ""]
                for i, nodo in enumerate(cadeia[:5]):
                    _, nome = _codigo_nome(nodo)
                    nomes[i] = nome
                serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome = nomes

                linhas.append({
                    "serie_nome": serie_nome,
                    "sistema_nome": sistema_nome,
                    "conjunto_nome": conjunto_nome,
                    "subconjunto_nome": subconjunto_nome,
                    "item_nome": item_nome,
                    "componente_codigo": None,   # grupo não tem componente
                    "componente_nome": None,
                    "quantidade": None,
                    "ponderacao": None,
                    "quant_ponderada": None,
                    "comentarios": "",           # opcional
                })

        return Response(linhas, status=status.HTTP_200_OK)


class BOMFlatXLSXView(APIView):
    """
    Exporta a mesma visão (componentes + grupos quando detalhado=1) em XLSX.
    """
    def get(self, request, *args, **kwargs):
        from .models import BOMComponente, BOMSublista
        from openpyxl import Workbook
        from openpyxl.utils import get_column_letter

        lista_id = request.GET.get("lista_id")
        search = (request.GET.get("search") or "").strip()
        detalhado = (request.GET.get("detalhado") or "").lower() in ("1", "true", "t", "yes")

        wb = Workbook()
        ws = wb.active
        ws.title = "BOM (Planilha)"

        ws.append([
            "Série", "Sistema", "Conjunto", "Subconjunto", "Item",
            "Código do Componente", "Nome do Componente",
            "Quantidade", "Ponderação (%)", "Quant. Ponderada", "Comentários"
        ])

        # Componentes
        q_comp = BOMComponente.objects.select_related("lista_pai", "componente")
        if lista_id:
            q_comp = q_comp.filter(lista_pai_id=lista_id)
        if search:
            q_comp = q_comp.filter(
                Q(lista_pai__codigo__icontains=search) |
                Q(lista_pai__nome__icontains=search)   |
                Q(componente__codigo__icontains=search)|
                Q(componente__nome__icontains=search)  |
                Q(comentarios__icontains=search)
            )

        for item in q_comp.order_by("lista_pai__codigo", "id"):
            cadeia = _cadeia_desde_raiz(item.lista_pai)
            nomes = ["", "", "", "", ""]
            for i, nodo in enumerate(cadeia[:5]):
                _, nome = _codigo_nome(nodo)
                nomes[i] = nome
            serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome = nomes

            q = float(item.quantidade or 0)
            ponderacao = float(item.ponderacao or 0)
            quant_pond = q * (ponderacao / 100.0)
            comp_cod, comp_nom = _codigo_nome(item.componente)

            ws.append([
                serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome,
                comp_cod, comp_nom,
                q, ponderacao, quant_pond, item.comentarios or ""
            ])

        # Grupos (quando detalhado)
        if detalhado:
            q_grp = BOMSublista.objects.select_related("lista_pai", "sublista")
            if lista_id:
                q_grp = q_grp.filter(lista_pai_id=lista_id)
            if search:
                q_grp = q_grp.filter(
                    Q(lista_pai__codigo__icontains=search) |
                    Q(lista_pai__nome__icontains=search)   |
                    Q(sublista__codigo__icontains=search)  |
                    Q(sublista__nome__icontains=search)
                )

            for item in q_grp.order_by("lista_pai__codigo", "id"):
                no_ref = item.sublista or item.lista_pai
                cadeia = _cadeia_desde_raiz(no_ref)
                nomes = ["", "", "", "", ""]
                for i, nodo in enumerate(cadeia[:5]):
                    _, nome = _codigo_nome(nodo)
                    nomes[i] = nome
                serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome = nomes

                ws.append([
                    serie_nome, sistema_nome, conjunto_nome, subconjunto_nome, item_nome,
                    "", "", "", "", "", ""  # sem componente/quantidade
                ])

        # Ajuste automático de largura (limitado)
        for col in ws.columns:
            max_len = max(len(str(c.value)) if c.value is not None else 0 for c in col)
            ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 2, 80)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="bom_planilha.xlsx"'
        wb.save(response)
        return response
