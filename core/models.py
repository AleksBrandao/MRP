from django.db import models

# Create your models here.
# models.py

class Produto(models.Model):
    nome = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=[('PA', 'Produto Acabado'), ('MP', 'Matéria-Prima')])
    estoque = models.DecimalField(max_digits=10, decimal_places=2)

class BOM(models.Model):
    produto_pai = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='boms')
    componente = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='componentes')
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)

class OrdemProducao(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    data_entrega = models.DateField()
