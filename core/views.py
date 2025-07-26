from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import OrdemProducao, BOM
from django.http import HttpResponse
import csv

@api_view(['GET'])
def executar_mrp(request):
    necessidades = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        boms = BOM.objects.filter(produto_pai=ordem.produto)
        for item in boms:
            necessidade_total = ordem.quantidade * item.quantidade
            estoque_atual = item.componente.estoque
            necessidade_liquida = max(0, necessidade_total - estoque_atual)

            if item.componente.id not in necessidades:
                necessidades[item.componente.id] = {
                    'produto': item.componente.nome,
                    'necessidade': float(necessidade_liquida),
                }
            else:
                necessidades[item.componente.id]['necessidade'] += float(necessidade_liquida)

    return Response(list(necessidades.values()))

@api_view(['GET'])
def exportar_mrp_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=\"resultado_mrp.csv\"'

    writer = csv.writer(response)
    writer.writerow(['Produto', 'Necessidade'])

    necessidades = executar_mrp(request).data
    for item in necessidades:
        writer.writerow([item['produto'], item['necessidade']])

    return response