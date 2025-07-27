
from core.models import Produto, BOM, OrdemProducao
from datetime import date

def criar_produto(codigo, nome, estoque=0, lead_time=0):
    return Produto.objects.get_or_create(
        codigo=codigo,
        defaults={"nome": nome, "estoque": estoque, "lead_time": lead_time}
    )[0]

def popular_mrp_demo():
    # Produtos
    carro = criar_produto("L001", "CARRO")
    eixo = criar_produto("L002", "EIXO")
    conjunto_roda = criar_produto("L003", "CONJUNTO RODA")
    pneu = criar_produto("L004", "PNEU", estoque=2)
    roda = criar_produto("L005", "RODA", estoque=2)
    camera = criar_produto("L006", "CAMERA", estoque=2)
    bico = criar_produto("L007", "BICO COM TAMPA", estoque=2)

    # BOM: CARRO → EIXO
    BOM.objects.get_or_create(produto_pai=carro, componente=eixo, quantidade=2)

    # BOM: EIXO → CONJUNTO RODA
    BOM.objects.get_or_create(produto_pai=eixo, componente=conjunto_roda, quantidade=2)

    # BOM: CONJUNTO RODA → componentes
    BOM.objects.get_or_create(produto_pai=conjunto_roda, componente=pneu, quantidade=1)
    BOM.objects.get_or_create(produto_pai=conjunto_roda, componente=roda, quantidade=1)
    BOM.objects.get_or_create(produto_pai=conjunto_roda, componente=camera, quantidade=1)
    BOM.objects.get_or_create(produto_pai=conjunto_roda, componente=bico, quantidade=1)

    # Ordem de Produção com data_entrega obrigatória
    OrdemProducao.objects.get_or_create(produto=carro, quantidade=1, data_entrega=date.today())

    print("🌱 Dados de teste MRP populados com sucesso!")

if __name__ == "__main__":
    popular_mrp_demo()
