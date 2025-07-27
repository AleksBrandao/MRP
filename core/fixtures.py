from core.models import Produto, BOM, OrdemProducao
from datetime import date, timedelta

# Limpar dados antigos
Produto.objects.all().delete()
BOM.objects.all().delete()
OrdemProducao.objects.all().delete()

# Produtos
p1 = Produto.objects.create(codigo="P001", nome="Produto Final", estoque=10, lead_time=3)
p2 = Produto.objects.create(codigo="C001", nome="Componente A", estoque=100, lead_time=5)
p3 = Produto.objects.create(codigo="C002", nome="Componente B", estoque=50, lead_time=4)

# BOM (estrutura do produto)
BOM.objects.create(produto_pai=p1, componente=p2, quantidade=2)
BOM.objects.create(produto_pai=p1, componente=p3, quantidade=3)

# Ordem de produção
OrdemProducao.objects.create(produto=p1, quantidade=20, data_entrega=date.today() + timedelta(days=10))
