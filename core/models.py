from django.db import models
from simple_history.models import HistoricalRecords
from django.core.exceptions import ValidationError

# Create your models here.
# models.py

class Produto(models.Model):
    TIPO_CHOICES = [
        ('produto', 'Componente'),
        ('materia_prima', 'Matéria-Prima'),
    ]

    codigo = models.CharField(max_length=20)
    nome = models.CharField(max_length=100)
    unidade = models.CharField(max_length=20, blank=True, null=True)
    estoque = models.IntegerField()
    lead_time = models.IntegerField()
    fabricante = models.CharField(max_length=100, blank=True, null=True)
    codigo_fabricante = models.CharField(max_length=50, blank=True, null=True) 
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='produto')  # 👈 novo campo
    history = HistoricalRecords()

    def __str__(self):
        return f'{self.codigo} - {self.nome}'

class BOM(models.Model):
    produto_pai = models.ForeignKey(Produto, related_name='bom_pai', on_delete=models.CASCADE)
    componente = models.ForeignKey(Produto, related_name='bom_componente', on_delete=models.CASCADE)
    quantidade = models.FloatField()
    history = HistoricalRecords()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["produto_pai", "componente"], name="uniq_pai_componente")
        ]
    
    def __str__(self):
        return f"{self.produto_pai} <- {self.quantidade}x {self.componente}"

class OrdemProducao(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    quantidade = models.IntegerField()
    data_entrega = models.DateField()
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.quantidade}x {self.produto} até {self.data_entrega}"

# core/models.py
from django.db import models
from django.core.exceptions import ValidationError

class ListaTecnica(models.Model):
    TIPO_SERIE = "SERIE"
    TIPO_SISTEMA = "SISTEMA"
    TIPO_CONJUNTO = "CONJUNTO"
    TIPO_SUBCONJUNTO = "SUB-CONJUNTO"
    TIPO_ITEM = "ITEM"

    TIPO_CHOICES = [
        (TIPO_SERIE, "SÉRIE"),
        (TIPO_SISTEMA, "SISTEMA"),
        (TIPO_CONJUNTO, "CONJUNTO"),
        (TIPO_SUBCONJUNTO, "SUB-CONJUNTO"),
        (TIPO_ITEM, "ITEM"),
    ]

    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)

    # pai opcional neste primeiro momento (você pode cadastrar sem pai)
    parent = models.ForeignKey(
        "self",
        null=True, blank=True,
        related_name="filhos",
        on_delete=models.PROTECT
    )

    observacoes = models.TextField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tipo", "codigo"]

    def __str__(self):
        return f"{self.codigo} — {self.nome} ({self.tipo})"

    def clean(self):
        # regra: controla quem pode ser pai de quem
        allowed_parent = {
            self.TIPO_SERIE: None,                  # SÉRIE não tem pai
            self.TIPO_SISTEMA: self.TIPO_SERIE,     # SISTEMA <- SÉRIE
            self.TIPO_CONJUNTO: self.TIPO_SISTEMA,  # CONJUNTO <- SISTEMA
            self.TIPO_SUBCONJUNTO: self.TIPO_CONJUNTO,  # SUB-CONJUNTO <- CONJUNTO
            self.TIPO_ITEM: self.TIPO_SUBCONJUNTO,  # ITEM <- SUB-CONJUNTO
        }

        if self.parent:
            esperado = allowed_parent.get(self.tipo)
            if esperado is None:
                # tipo não deveria ter pai
                raise ValidationError({"parent": "Este tipo não deve possuir pai."})
            if self.parent.tipo != esperado:
                raise ValidationError({
                    "parent": f"O pai de {self.tipo} deve ser {esperado}, mas recebeu {self.parent.tipo}."
                })

            # anti-ciclo
            node = self.parent
            while node:
                if node.id == self.id:
                    raise ValidationError("Relação inválida: geraria ciclo na árvore.")
                node = node.parent

    # opcional: helper
    def caminho(self):
        chain = []
        n = self
        while n:
            chain.append(str(n))
            n = n.parent
        return " / ".join(reversed(chain))


# (futuro) vínculo de Componentes ao ITEM:
# from core.models import Componente  # quando o modelo estiver definido
# class ItemComponente(models.Model):
#     item = models.ForeignKey(ListaTecnica, on_delete=models.CASCADE,
#                              limit_choices_to={'tipo': ListaTecnica.TIPO_ITEM})
#     componente = models.ForeignKey(Componente, on_delete=models.PROTECT)
#     quantidade = models.DecimalField(max_digits=12, decimal_places=3, default=1)
