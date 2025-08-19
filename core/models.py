from django.db import models
from simple_history.models import HistoricalRecords


# Create your models here.
# models.py

class Produto(models.Model):
    TIPO_CHOICES = [
        ('produto', 'Componente'),
        ('materia_prima', 'Matéria-Prima'),
        ('lista', 'Lista Técnica (BOM)'),
    ]

    codigo = models.CharField(max_length=20)
    nome = models.CharField(max_length=100)
    estoque = models.IntegerField()
    fabricante = models.CharField(max_length=100, blank=True, null=True)
    codigo_fabricante = models.CharField(max_length=50, blank=True, null=True)
    unidade = models.CharField(max_length=20, blank=True, null=True)
    lead_time = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='produto')  # 👈 novo campo
    history = HistoricalRecords()

    def __str__(self):
        return f'{self.codigo} - {self.nome}'

class BOM(models.Model):
    produto_pai = models.ForeignKey(Produto, related_name='bom_pai', on_delete=models.CASCADE)
    componente = models.ForeignKey(Produto, related_name='bom_componente', on_delete=models.CASCADE)
    quantidade = models.FloatField()
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

TIPOS_LISTA = [
    ("SERIE", "Série"),
    ("SISTEMA", "Sistema"),
    ("CONJUNTO", "Conjunto"),
    ("SUBCONJUNTO", "Sub-Conjunto"),
    ("ITEM", "Item"),
]


TIPOS_LISTA = [
    ("SERIE", "Série"),
    ("SISTEMA", "Sistema"),
    ("CONJUNTO", "Conjunto"),
    ("SUBCONJUNTO", "Sub-Conjunto"),
    ("ITEM", "Item"),
]

class ListaTecnica(models.Model):
    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPOS_LISTA)
    observacoes = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["codigo"]
        verbose_name = "Lista Técnica"
        verbose_name_plural = "Listas Técnicas"

    def __str__(self):
        return f"{self.codigo} - {self.nome}"