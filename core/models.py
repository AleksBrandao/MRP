from django.db import models
from simple_history.models import HistoricalRecords


# Create your models here.
# models.py

class Produto(models.Model):
    TIPO_CHOICES = [
        ('produto', 'Produto Acabado'),
        ('materia_prima', 'Matéria-Prima'),
        ('lista', 'Lista Técnica (BOM)'),
    ]

    codigo = models.CharField(max_length=100, unique=True)
    nome = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='produto')  # 👈 novo campo
    # fabricante = models.CharField(max_length=100, blank=True, null=True)
    # codigo_fabricante = models.CharField(max_length=100, blank=True, null=True)
    codigo_gmao = models.CharField(max_length=100, blank=True, null=True)
    unidade = models.CharField(max_length=10, blank=True, null=True)
    serie = models.CharField(max_length=50, blank=True, null=True)
    estoque = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lead_time = models.IntegerField(default=0)
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.nome} ({self.codigo})"

class Fabricante(models.Model):
    nome = models.CharField(max_length=255)
    codigo = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.nome} ({self.codigo})"


class BOM(models.Model):
    produto_pai = models.ForeignKey(Produto, related_name="filhos", on_delete=models.CASCADE)
    componente = models.ForeignKey(Produto, related_name="pais", on_delete=models.CASCADE)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    comentario = models.TextField(blank=True, null=True)
    ponderacao = models.CharField(max_length=20, blank=True, null=True)
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.produto_pai} <- {self.quantidade}x {self.componente}"

class OrdemProducao(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.IntegerField()
    data_entrega = models.DateField()
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.quantidade}x {self.produto} até {self.data_entrega}"
