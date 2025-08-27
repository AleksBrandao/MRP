# core/serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Produto, ListaTecnica, BOM, OrdemProducao

from decimal import Decimal
from .utils.pedidos_loader import get_snapshot_map


# =========================
# Produtos / Listas Técnicas
# =========================
class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = "__all__"
        extra_kwargs = {
            "codigo": {"required": False, "allow_null": True, "allow_blank": True}
        }

    def validate_codigo(self, value):
        # transforma "" em None para não bater no unique
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    def create(self, validated_data):
        if validated_data.get("codigo", None) == "":
            validated_data["codigo"] = None
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("codigo", None) == "":
            validated_data["codigo"] = None
        return super().update(instance, validated_data)
    
    def get_em_pedido(self, obj: Produto):
        snap = get_snapshot_map()
        return float(snap.get(obj.codigo, Decimal("0")))


class ListaTecnicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListaTecnica
        fields = "__all__"
        extra_kwargs = {
            # Código passa a ser automático (sequencial) e não editável pelo front
            "codigo": {"read_only": True, "required": False},
        }
        validators = [
            UniqueTogetherValidator(
                queryset=ListaTecnica.objects.all(),
                fields=["nome", "tipo"],
                message="Já existe uma Lista Técnica com este nome para este tipo.",
            )
        ]


# =========================
# BOM (árvore) - já usado no CRUD
# =========================
class BOMSerializer(serializers.ModelSerializer):
    componente = serializers.PrimaryKeyRelatedField(
        queryset=Produto.objects.all(),
        required=False,
        allow_null=True,
    )
    sublista = serializers.PrimaryKeyRelatedField(
        queryset=ListaTecnica.objects.all(),
        required=False,
        allow_null=True,
    )

    quant_ponderada = serializers.SerializerMethodField()

    # labels auxiliares (somente leitura)
    lista_pai_codigo = serializers.CharField(source="lista_pai.codigo", read_only=True)
    lista_pai_nome = serializers.CharField(source="lista_pai.nome", read_only=True)
    sublista_codigo = serializers.CharField(source="sublista.codigo", read_only=True)
    sublista_nome = serializers.CharField(source="sublista.nome", read_only=True)
    componente_codigo = serializers.CharField(source="componente.codigo", read_only=True)
    componente_nome = serializers.CharField(source="componente.nome", read_only=True)

    # campo percentual já existente
    ponderacao_operacao = serializers.DecimalField(
        max_digits=7,  # 3 inteiros + 4 decimais
        decimal_places=4,
        min_value=0,
        max_value=100,
    )

    class Meta:
        model = BOM
        fields = [
            "id",
            "lista_pai",
            "sublista",
            "componente",
            "quantidade",
            "ponderacao_operacao",
            "comentarios",
            "quant_ponderada",
            # read-only helpers:
            "lista_pai_codigo",
            "lista_pai_nome",
            "sublista_codigo",
            "sublista_nome",
            "componente_codigo",
            "componente_nome",
        ]

    def get_quant_ponderada(self, obj):
        return obj.quant_ponderada


# =========================
# BOM "Flat" (para /api/bom-flat/)
# =========================
class BOMFlatRowSerializer(serializers.Serializer):
    """
    Representa 1 linha do BOM achatado com campos separados para cada nível.
    Use este serializer na view de /api/bom-flat/.
    """

    # NÍVEIS (sempre sem colchetes)
    serie_codigo = serializers.CharField(allow_blank=True)
    serie_nome = serializers.CharField(allow_blank=True)

    sistema_codigo = serializers.CharField(allow_blank=True)
    sistema_nome = serializers.CharField(allow_blank=True)

    conjunto_codigo = serializers.CharField(allow_blank=True)
    conjunto_nome = serializers.CharField(allow_blank=True)

    subconjunto_codigo = serializers.CharField(allow_blank=True)
    subconjunto_nome = serializers.CharField(allow_blank=True)

    item_codigo = serializers.CharField(allow_blank=True)
    item_nome = serializers.CharField(allow_blank=True)

    # COMPONENTE (separado)
    componente_codigo = serializers.CharField(allow_blank=True)
    componente_nome = serializers.CharField(allow_blank=True)

    # QUANTITATIVOS
    quantidade = serializers.FloatField()
    ponderacao = serializers.FloatField()
    quant_ponderada = serializers.FloatField()

    # TEXTO LIVRE
    comentarios = serializers.CharField(allow_blank=True, required=False)


# =========================
# Ordens de Produção
# =========================
class OrdemProducaoSerializer(serializers.ModelSerializer):
    lista_nome = serializers.CharField(source="lista.nome", read_only=True)
    lista_codigo = serializers.CharField(source="lista.codigo", read_only=True)

    # compat: aceitar "produto" mapeando para 'lista'
    produto = serializers.PrimaryKeyRelatedField(
        source="lista",
        queryset=ListaTecnica.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = OrdemProducao
        fields = [
            "id",
            "lista",
            "lista_nome",
            "lista_codigo",
            "produto",  # write_only (compat)
            "quantidade",
            "data_entrega",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = ("criado_em", "atualizado_em")
