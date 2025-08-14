
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
import csv
from rest_framework import viewsets
from .models import Produto, BOM, OrdemProducao
from .serializers import ProdutoSerializer, BOMSerializer, OrdemProducaoSerializer
import openpyxl
from openpyxl.utils import get_column_letter
from datetime import date, timedelta

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer

class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.all()
    serializer_class = BOMSerializer

class OrdemProducaoViewSet(viewsets.ModelViewSet):
    queryset = OrdemProducao.objects.all()
    serializer_class = OrdemProducaoSerializer

# Função recursiva com controle de nível e referência ao pai
def calcular_necessidades(produto, quantidade, necessidades, nivel=0, codigo_pai=None):
    boms = BOM.objects.filter(produto_pai=produto)
    for item in boms:
        print(f"Analisando: {item.componente.nome}, nível {nivel}, pai: {codigo_pai}")
        necessidade_total = quantidade * item.quantidade
        estoque_atual = item.componente.estoque
        necessidade_liquida = max(0, necessidade_total - estoque_atual)

        if item.componente.id not in necessidades:
            necessidades[item.componente.id] = {
                'codigo': item.componente.codigo,
                'nome': item.componente.nome,
                'necessario': float(necessidade_total),
                'em_estoque': float(estoque_atual),
                'faltando': float(necessidade_liquida),
                'lead_time': item.componente.lead_time,
                'data_compra': '',  # será calculado abaixo
                'nivel': nivel,
                'codigo_pai': codigo_pai,
            }
        else:
            necessidades[item.componente.id]['necessario'] += float(necessidade_total)
            necessidades[item.componente.id]['faltando'] = max(
                0,
                necessidades[item.componente.id]['necessario'] - necessidades[item.componente.id]['em_estoque']
            )

        calcular_necessidades(item.componente, necessidade_total, necessidades, nivel + 1, item.produto_pai.codigo)


# 🔁 função reutilizável para MRP
def calcular_mrp_recursivo():
    necessidades = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        calcular_necessidades(ordem.produto, ordem.quantidade, necessidades, nivel=0, codigo_pai=None)

    print("✅ Função MRP recursiva executada com sucesso!")
    print(f"🔢 Total de itens calculados: {len(necessidades)}")
    
    resultado = list(necessidades.values())
    ordens = OrdemProducao.objects.all()
    if ordens.exists():
        menor_data_entrega = min(ordem.data_entrega for ordem in ordens)
    else:
        menor_data_entrega = date.today()

    for item in resultado:
        lead = item.get("lead_time", 0)
        item["data_compra"] = (menor_data_entrega - timedelta(days=lead)).isoformat()
    return resultado
    

@api_view(['GET'])
def executar_mrp(request):
    return Response(calcular_mrp_recursivo())

@api_view(['GET'])
def exportar_mrp_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="resultado_mrp.csv"'

    writer = csv.writer(response)
    writer.writerow(['Produto', 'Necessidade'])

    resultado = calcular_mrp_recursivo()
    for item in resultado:
        writer.writerow([item['nome'], item['necessario']])

    return response

exportar_mrp_excel

@api_view(["GET"])
def historico_produto(request, produto_id):
    try:
        produto = Produto.objects.get(id=produto_id)
    except Produto.DoesNotExist:
        return Response({"erro": "Produto não encontrado"}, status=404)

    historico = produto.history.all().order_by("-history_date")

    data = []
    for versao in historico:
        data.append({
            "estoque": versao.estoque,
            "data": versao.history_date,
            "usuario": versao.history_user.username if versao.history_user else "Desconhecido",
            "tipo": versao.history_type,
        })

    return Response(data)

@api_view(["GET"])
def historico_todos_os_produtos(request):
    from .models import Produto

    todos = []
    for produto in Produto.objects.all():
        for versao in produto.history.all().order_by("-history_date"):
            todos.append({
                "produto_id": produto.id,
                "produto_nome": produto.nome,
                "estoque": versao.estoque,
                "usuario": versao.history_user.username if versao.history_user else "Desconhecido",
                "tipo": versao.history_type,
                "data": versao.history_date,
            })
    
    # Ordenar por data descrescente
    todos.sort(key=lambda x: x["data"], reverse=True)

    return Response(todos)

@api_view(['GET'])
def mrp_detalhado(request):
    resultado = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        adicionar_detalhes_recursivo(
            produto=ordem.produto,
            qtd_produto_op=ordem.quantidade,
            ordem_id=ordem.id,
            produto_final_nome=ordem.produto.nome,
            resultado=resultado
        )

    return Response(list(resultado.values()))


def adicionar_detalhes_recursivo(produto, qtd_produto_op, ordem_id, produto_final_nome, resultado, nivel=0):
    boms = BOM.objects.filter(produto_pai=produto)

    for bom in boms:
        total = qtd_produto_op * bom.quantidade
        comp = bom.componente
        comp_id = comp.id

        if comp_id not in resultado:
            resultado[comp_id] = {
                "codigo_componente": comp.codigo,
                "nome_componente": comp.nome,
                "total_necessario": 0,
                "em_estoque": comp.estoque,
                "faltando": 0,
                "detalhes": []
            }

        resultado[comp_id]["total_necessario"] += total
        resultado[comp_id]["faltando"] = max(
            0,
            resultado[comp_id]["total_necessario"] - resultado[comp_id]["em_estoque"]
        )

        resultado[comp_id]["detalhes"].append({
            "ordem_producao": str(ordem_id),
            "produto_final": produto_final_nome,
            "qtd_produto": qtd_produto_op,
            "qtd_componente_por_unidade": bom.quantidade,
            "qtd_necessaria": total
        })

        # RECURSIVIDADE
        adicionar_detalhes_recursivo(comp, total, ordem_id, produto_final_nome, resultado, nivel + 1)
