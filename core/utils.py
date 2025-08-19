# core/utils.py
from collections import defaultdict, deque
from decimal import Decimal

from .models import ListaTecnica, BOM, Produto

Dec = lambda x: Decimal(str(x))

def _bom_filhos(lista_id: int):
    """
    Retorna itens de BOM já com componente e lista_pai carregados.
    Substitui qualquer uso anterior de BOM.objects.filter(produto_pai=...)
    """
    return (
        BOM.objects
        .select_related("lista_pai", "componente")
        .filter(lista_pai_id=lista_id)
        .all()
    )

def montar_arvore_bom(lista_raiz_id: int):
    """
    Retorna uma árvore (dict) partindo de uma ListaTecnica raiz.
    Estrutura:
      {
        "raiz": <ListaTecnica>,
        "nos": { lista_id: {"item": <ListaTecnica>, "filhos": [ (componente:Produto, qty:Decimal) , ... ] } }
      }
    """
    raiz = ListaTecnica.objects.get(id=lista_raiz_id)
    nos = {}

    # BFS pela hierarquia de listas (se você também usa sublistas)
    fila = deque([raiz.id])
    visitados = set()
    while fila:
        lid = fila.popleft()
        if lid in visitados:
            continue
        visitados.add(lid)

        itens = []
        for bom in _bom_filhos(lid):
            itens.append((bom.componente, Dec(bom.quantidade)))
        nos[lid] = {"item": ListaTecnica.objects.get(id=lid), "filhos": itens}

        # Caso você permita sub-listas (lista dentro de lista),
        # adicione aqui o enfileiramento de filhos do tipo ListaTecnica.
        # Se NÃO usa sublistas, pode ignorar.
        # for sub in ListaTecnica.objects.filter(parent_id=lid).values_list("id", flat=True):
        #     fila.append(sub)

    return {"raiz": raiz, "nos": nos}


def calcular_mrp():
    necessidades = defaultdict(float)

    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        # Agora cada ordem deve referenciar uma ListaTecnica
        lista_final = ordem.produto  # ⚠️ se OrdemProducao ainda aponta para Produto, ajuste para ListaTecnica
        qtde_ordem = ordem.quantidade

        # Para cada componente da BOM dessa lista
        componentes = BOM.objects.filter(lista_pai=lista_final)

        for item in componentes:
            total_necessario = item.quantidade * qtde_ordem
            necessidades[item.componente.id] += total_necessario

    resultados = []
    for comp_id, total_necessario in necessidades.items():
        produto = Produto.objects.get(id=comp_id)
        falta = total_necessario - produto.estoque

        data_limite = min(ordem.data_entrega for ordem in OrdemProducao.objects.all())
        data_compra = data_limite - timedelta(days=produto.lead_time)

        resultados.append({
            "codigo": produto.codigo,
            "nome": produto.nome,
            "necessario": total_necessario,
            "em_estoque": produto.estoque,
            "faltando": max(0, falta),  # garante que não fique negativo
            "lead_time": produto.lead_time,
            "data_compra": data_compra.isoformat(),
        })

    return resultados


def calcular_mrp_detalhado(lista_raiz_id: int, quantidade_planejada: Decimal):
    """
    Versão detalhada (caso sua página Detalhado consuma uma estrutura mais rica).
    Mantém o mesmo princípio: trabalhar com lista_pai.
    """
    base = calcular_mrp(lista_raiz_id, quantidade_planejada)
    # Se você já tinha "adicionar_detalhes_recursivo", chame-o aqui usando lista_pai.
    # Exemplo de extensão mínima:
    for item in base["itens"]:
        # place-holders para manter compatibilidade com o frontend já existente
        item["ordens_sugeridas"] = []   # preencha conforme sua lógica
        item["data_entrega_prevista"] = None
    return base
