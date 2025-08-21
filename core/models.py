from django.db import models
from simple_history.models import HistoricalRecords
from django.core.exceptions import ValidationError
from django.db.models import Q
from decimal import Decimal
  
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

class OrdemProducao(models.Model):
    lista = models.ForeignKey('ListaTecnica', on_delete=models.CASCADE,
                              related_name='ordens')  # <- aqui
    quantidade = models.IntegerField()
    data_entrega = models.DateField()
    criado_em = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True, null=True, blank=True)
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.quantidade}x {self.lista} até {self.data_entrega}"
      
class BOM(models.Model):
    lista_pai = models.ForeignKey(ListaTecnica, on_delete=models.CASCADE, related_name='itens')
    componente = models.ForeignKey(Produto, null=True, blank=True, on_delete=models.CASCADE, related_name='usos')
    sublista   = models.ForeignKey(ListaTecnica, null=True, blank=True, on_delete=models.CASCADE, related_name='usos_como_sublista')
    quantidade = models.DecimalField(max_digits=12, decimal_places=4, default=1)

     # NOVOS CAMPOS
    comentarios = models.CharField(max_length=255, blank=True, null=True)
    ponderacao_operacao = models.DecimalField(max_digits=5, decimal_places=4, default=Decimal("1.0"))
    quant_ponderada = models.DecimalField(max_digits=10, decimal_places=4, editable=False, default=Decimal("0.0"))

    def save(self, *args, **kwargs):
        if self.ponderacao_operacao is None:
            self.ponderacao_operacao = Decimal("1.0")
        self.quant_ponderada = (self.quantidade or Decimal("0.0")) * self.ponderacao_operacao
        super().save(*args, **kwargs)

    def clean(self):
        # exatamente um dos dois: componente XOR sublista
        if bool(self.componente) == bool(self.sublista):
            raise ValidationError("Informe apenas um: componente OU sublista.")
        
        class Meta:
            constraints = [
                models.CheckConstraint(
                    name="bom_xor_componente_sublista",
                    check=(
                        (Q(componente__isnull=False) & Q(sublista__isnull=True)) |
                        (Q(componente__isnull=True)  & Q(sublista__isnull=False))
                    ),
                ),
            ]