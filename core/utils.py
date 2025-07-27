from core.models import Produto, BOM, OrdemProducao
from collections import defaultdict
from datetime import timedelta

def calcular_mrp():
    necessidades = defaultdict(float)

    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        produto_final = ordem.produto
        qtde_ordem = ordem.quantidade

        # Para cada componente da BOM
        componentes = BOM.objects.filter(produto_pai=produto_final)

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
