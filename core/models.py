from django.db import models
from simple_history.models import HistoricalRecords
  
class Produto(models.Model):
    TIPO_CHOICES = [
        ("componente", "Componente"),
        ("materia_prima", "Matéria-Prima"),
    ]
    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=255)
    fabricante = models.CharField(max_length=255, blank=True, default="")
    codigo_fabricante = models.CharField(max_length=255, blank=True, default="")
    unidade = models.CharField(max_length=20, blank=True, default="")
    estoque = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    lead_time = models.IntegerField(default=0)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default="componente")
    history = HistoricalRecords()

    def __str__(self):
        return f"[{self.codigo}] {self.nome}"

class OrdemProducao(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.IntegerField()
    data_entrega = models.DateField()
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.quantidade}x {self.produto} até {self.data_entrega}"


class ListaTecnica(models.Model):
    TIPO_CHOICES = [
        ("SERIE", "Série"),
        ("SISTEMA", "Sistema"),
        ("CONJUNTO", "Conjunto"),
        ("SUBCONJUNTO", "Subconjunto"),
        ("ITEM", "Item"),
    ]
    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default="CONJUNTO")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="filhos")
    observacoes = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["codigo"]

    def __str__(self):
        return f"[{self.codigo}] {self.nome} ({self.tipo})"
    
class BOM(models.Model):
    # ⚠️ Depois da migration, este campo passará a ser ListaTecnica
    lista_pai = models.ForeignKey(ListaTecnica, on_delete=models.CASCADE, related_name="itens", null=True, blank=True)
    componente = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="usos")
    quantidade = models.DecimalField(max_digits=14, decimal_places=4)
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.lista_pai} -> {self.componente} x {self.quantidade}"