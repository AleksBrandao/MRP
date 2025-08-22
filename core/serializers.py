from rest_framework import serializers
from .models import Produto, ListaTecnica, BOM, OrdemProducao

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = "__all__"

class ListaTecnicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListaTecnica
        fields = "__all__"

class BOMSerializer(serializers.ModelSerializer):
    componente = serializers.PrimaryKeyRelatedField(
        queryset=Produto.objects.all(),
        required=False,
        allow_null=True
    )
    sublista = serializers.PrimaryKeyRelatedField(
        queryset=ListaTecnica.objects.all(),
        required=False,
        allow_null=True
    )
    quant_ponderada = serializers.SerializerMethodField()
    lista_pai_codigo = serializers.CharField(source='lista_pai.codigo', read_only=True)
    lista_pai_nome = serializers.CharField(source='lista_pai.nome', read_only=True)
    sublista_codigo = serializers.CharField(source='sublista.codigo', read_only=True)
    sublista_nome = serializers.CharField(source='sublista.nome', read_only=True)
    componente_codigo = serializers.CharField(source='componente.codigo', read_only=True)
    componente_nome = serializers.CharField(source='componente.nome', read_only=True)
    ponderacao_operacao = serializers.DecimalField(
    max_digits=7,       # 3 inteiros + 4 decimais
    decimal_places=4,
    min_value=0,
    max_value=100
)

    class Meta:
        model = BOM
        fields = [
            "id", "lista_pai", "sublista", "componente",
            "quantidade", "ponderacao_operacao", "comentarios",
            "quant_ponderada",
            "lista_pai_codigo", "lista_pai_nome",
            "sublista_codigo", "sublista_nome",
            "componente_codigo", "componente_nome"
        ]

    def get_quant_ponderada(self, obj):
        return obj.quant_ponderada



class OrdemProducaoSerializer(serializers.ModelSerializer):
    lista_nome = serializers.CharField(source='lista.nome', read_only=True)
    lista_codigo = serializers.CharField(source='lista.codigo', read_only=True)

    # (opcional) compat: aceitar "produto" mapeando para 'lista'
    # Remova quando o front não enviar mais "produto".
    produto = serializers.PrimaryKeyRelatedField(
        source='lista',
        queryset=ListaTecnica.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = OrdemProducao
        fields = [
            "id",
            "lista", "lista_nome", "lista_codigo",
            "produto",          # write_only compat
            "quantidade",
            "data_entrega",
            "criado_em", "atualizado_em",
        ]
        read_only_fields = ("criado_em", "atualizado_em")
