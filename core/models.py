from django.db import models
from simple_history.models import HistoricalRecords
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Q, CheckConstraint, F

PCT = Decimal("100")
FOUR_DP = Decimal("0.0001")
  
class Produto(models.Model):
    TIPO_CHOICES = [
        ("componente", "Componente"),
        ("materia_prima", "Matéria-Prima"),
    ]
    codigo = models.CharField(
    max_length=50,
    unique=True,
    null=True,      # <- permite gravar como NULL
    blank=True      # <- formulário/admin podem deixar em branco
    )
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
    codigo = models.CharField(
        max_length=50,
        blank=True,           # <- não obrigatório
        default="",           # <- default vazio
        unique=False,         # <- remove unicidade isolada do código
        db_index=True,        # ajuda nas buscas, opcional
        editable=False,       # <- não aparece no admin por padrão
    )
    nome = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default="CONJUNTO")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="filhos")
    observacoes = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["nome", "tipo"], name="uniq_lista_tecnica_nome_tipo"
            )
        ]

    def save(self, *args, **kwargs):
        # 1º save para obter o PK
        creating = self.pk is None
        super().save(*args, **kwargs)
        # se não tem código ainda, atribui um sequencial baseado no id
        if creating and not self.codigo:
            self.codigo = str(self.pk)          # ou f"LT-{self.pk}" se quiser prefixo
            super().save(update_fields=["codigo"])

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
    ponderacao_operacao = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=100
    )
    quant_ponderada = models.DecimalField(
        max_digits=12, decimal_places=4, editable=False, default=Decimal("0.0000")
    )

    def save(self, *args, **kwargs):
        q = self.quantidade or Decimal("0")
        p = self.ponderacao_operacao
        if p is None:
            p = Decimal("100")  # trata None como 100%
        # quantidade * (percentual / 100)
        qp = q * (p / PCT)
        # opcional: arredondar para 4 casas
        self.quant_ponderada = qp.quantize(FOUR_DP, rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)

    def clean(self):
        if bool(self.componente) == bool(self.sublista):
            raise ValidationError("Informe apenas um: componente OU sublista.")
        
    class Meta:
        constraints = [
            # XOR: exatamente um entre componente e sublista
            CheckConstraint(
                name="bom_xor_componente_sublista",
                check=(
                    (Q(componente__isnull=False) & Q(sublista__isnull=True)) |
                    (Q(componente__isnull=True)  & Q(sublista__isnull=False))
                ),
            ),
            # ponderação entre 0 e 100
            CheckConstraint(
                name="bom_ponderacao_0_100",
                check=Q(ponderacao_operacao__gte=0) & Q(ponderacao_operacao__lte=100),
            ),
        ]