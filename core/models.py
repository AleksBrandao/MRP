from django.db import models

# Create your models here.
# models.py

class Produto(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=100)
    estoque = models.IntegerField(default=0)
    lead_time = models.IntegerField(help_text="Dias para reposição")

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

class BOM(models.Model):
    produto_pai = models.ForeignKey(Produto, related_name='bom_pai', on_delete=models.CASCADE)
    componente = models.ForeignKey(Produto, related_name='bom_componente', on_delete=models.CASCADE)
    quantidade = models.FloatField()

    def __str__(self):
        return f"{self.produto_pai} <- {self.quantidade}x {self.componente}"

class OrdemProducao(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.IntegerField()
    data_entrega = models.DateField()

    def __str__(self):
        return f"{self.quantidade}x {self.produto} até {self.data_entrega}"
