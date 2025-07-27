
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
import csv
from rest_framework import viewsets
from .models import Produto, BOM, OrdemProducao
from .serializers import ProdutoSerializer, BOMSerializer, OrdemProducaoSerializer
from .utils import calcular_mrp
import openpyxl
from openpyxl.utils import get_column_letter

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer

class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.all()
    serializer_class = BOMSerializer

class OrdemProducaoViewSet(viewsets.ModelViewSet):
    queryset = OrdemProducao.objects.all()
    serializer_class = OrdemProducaoSerializer

@api_view(['GET'])
def mrp_resultado(request):
    resultado = calcular_mrp()
    return Response(resultado)

# Função recursiva com controle de nível
def calcular_necessidades(produto, quantidade, necessidades, nivel=0):
    boms = BOM.objects.filter(produto_pai=produto)
    for item in boms:
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
                'data_compra': '',  # Preencha se necessário
                'nivel': nivel,
            }
        else:
            necessidades[item.componente.id]['necessario'] += float(necessidade_total)
            necessidades[item.componente.id]['faltando'] = max(0,
                necessidades[item.componente.id]['necessario'] -
                necessidades[item.componente.id]['em_estoque']
            )

        # recursão
        calcular_necessidades(item.componente, necessidade_total, necessidades, nivel + 1)

@api_view(['GET'])
def executar_mrp(request):
    necessidades = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        calcular_necessidades(ordem.produto, ordem.quantidade, necessidades)

    return Response(list(necessidades.values()))

@api_view(['GET'])
def exportar_mrp_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="resultado_mrp.csv"'

    writer = csv.writer(response)
    writer.writerow(['Produto', 'Necessidade'])

    necessidades = executar_mrp(request).data
    for item in necessidades:
        writer.writerow([item['nome'], item['necessario']])

    return response

def exportar_mrp_excel(request):
    resultado = calcular_mrp()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MRP Resultado"

    headers = ["Código", "Nome", "Necessário", "Em Estoque", "Faltando", "Lead Time", "Data de Compra"]
    ws.append(headers)

    for item in resultado:
        ws.append([
            item["codigo"],
            item["nome"],
            item["necessario"],
            item["em_estoque"],
            item["faltando"],
            item["lead_time"],
            item["data_compra"],
        ])

    for i in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 18

    response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = "attachment; filename=resultado_mrp.xlsx"
    wb.save(response)
    return response
