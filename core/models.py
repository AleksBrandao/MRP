from django.db import models
from simple_history.models import HistoricalRecords
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Q, CheckConstraint, F
from django.core.validators import MinValueValidator
from .validators import (
    validate_positive_decimal, validate_lead_time, 
    validate_codigo_produto, validate_percentage,
    validate_quantidade_bom, validate_no_circular_reference
)

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
        blank=True,     # <- formulário/admin podem deixar em branco
        validators=[validate_codigo_produto]
    )
    nome = models.CharField(max_length=255)
    fabricante = models.CharField(max_length=255, blank=True, default="")
    codigo_fabricante = models.CharField(max_length=255, blank=True, default="")
    unidade = models.CharField(max_length=20, blank=True, default="")
    estoque = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],  # ← permite 0, bloqueia negativos
        blank=True                  # ← não obrigatório no formulário admin
    )
    lead_time = models.IntegerField(
        default=0,
        validators=[validate_lead_time]
    )
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

    def __str__(self):
        # "8500 · Código: 8500" ou só "8500"
        if self.codigo:
            return f"{self.nome} · {self.codigo}"
        return self.nome

class OrdemProducao(models.Model):
    lista = models.ForeignKey('ListaTecnica', on_delete=models.CASCADE,
                              related_name='ordens')  # <- aqui
    quantidade = models.IntegerField(
        validators=[validate_positive_decimal]
    )
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
    quantidade = models.DecimalField(
        max_digits=12, decimal_places=4, default=1,
        validators=[validate_quantidade_bom]
    )

     # NOVOS CAMPOS
    comentarios = models.CharField(max_length=255, blank=True, null=True)
    ponderacao_operacao = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=100,
        validators=[validate_percentage]
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
        
        # Validar referência circular se for sublista
        if self.sublista:
            validate_no_circular_reference(self.lista_pai, self.sublista)
        
        # Validar quantidade
        if self.quantidade and self.quantidade <= 0:
            raise ValidationError("Quantidade deve ser maior que zero.")
        
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

# core/models.py (ADICIONAR AO FINAL DO ARQUIVO, após a classe BOM)
class BOMSublista(models.Model):
    lista_pai = models.ForeignKey(
        ListaTecnica, on_delete=models.CASCADE, related_name="sublistas_vinculadas"
    )
    sublista = models.ForeignKey(
        ListaTecnica, on_delete=models.CASCADE, related_name="pais_vinculando"
    )

    class Meta:
        unique_together = ("lista_pai", "sublista")
        verbose_name = "Vínculo de Sublista"
        verbose_name_plural = "Vínculos de Sublistas"

    def __str__(self):
        return f"{self.lista_pai} ➜ {self.sublista}"


class BOMComponente(models.Model):
    lista_pai = models.ForeignKey(
        ListaTecnica, on_delete=models.CASCADE, related_name="componentes_vinculados"
    )
    # Produto do tipo "componente"
    componente = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="em_listas",
        limit_choices_to={"tipo": "componente"},
    )
    quantidade = models.DecimalField(max_digits=12, decimal_places=3, default=1,
                                     validators=[validate_quantidade_bom])
    ponderacao = models.DecimalField("Ponderação (%)", max_digits=6, decimal_places=2,
                                     default=100, validators=[validate_percentage])
    comentarios = models.TextField(blank=True, default="")
    tipo_revisao = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        unique_together = ("lista_pai", "componente")
        verbose_name = "Componente em Lista Técnica"
        verbose_name_plural = "Componentes em Listas Técnicas"

    def clean(self):
        if self.componente and getattr(self.componente, "tipo", None) != "componente":
            raise ValidationError("Somente produtos do tipo 'componente' podem ser vinculados.")

    def __str__(self):
        return f"{self.lista_pai} • {self.componente} (qtd {self.quantidade})"
