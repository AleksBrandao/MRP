
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

@api_view(['GET'])
def exportar_mrp_excel(request):
    resultado = calcular_mrp_recursivo()

    # Calcular menor data de entrega das ordens para estimar data_compra
    ordens = OrdemProducao.objects.all()
    if ordens.exists():
        menor_data_entrega = min(ordem.data_entrega for ordem in ordens)
    else:
        menor_data_entrega = date.today()

    for item in resultado:
        lead = item.get("lead_time", 0)
        item["data_compra"] = (menor_data_entrega - timedelta(days=lead)).isoformat()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MRP Resultado"

    headers = [
        "Código", "Nome", "Necessário", "Em Estoque", "Faltando",
        "Lead Time", "Data de Compra", "Nível", "Código Pai"
    ]
    ws.append(headers)

    for item in resultado:
        ws.append([
            item.get("codigo", ""),
            item.get("nome", ""),
            item.get("necessario", ""),
            item.get("em_estoque", ""),
            item.get("faltando", ""),
            item.get("lead_time", ""),
            item.get("data_compra", ""),
            item.get("nivel", ""),
            item.get("codigo_pai", ""),
        ])

    for i in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 18

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = "attachment; filename=resultado_mrp_completo.xlsx"
    wb.save(response)
    return response
