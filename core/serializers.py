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
    # nomes bonitos para exibição
    lista_pai_nome = serializers.CharField(source='lista_pai.nome', read_only=True)
    lista_pai_codigo = serializers.CharField(source='lista_pai.codigo', read_only=True)
    componente_nome = serializers.CharField(source='componente.nome', read_only=True)
    componente_codigo = serializers.CharField(source='componente.codigo', read_only=True)

    # (opcional) compat: aceitar "produto_pai" no POST/PUT mapeando para 'lista_pai'
    produto_pai = serializers.PrimaryKeyRelatedField(
        source='lista_pai',
        queryset=ListaTecnica.objects.all(),
        write_only=True,
        required=False
    )

    class Meta:
        model = BOM
        fields = [
            "id",
            # FK correta (lista_pai) + derivados
            "lista_pai", "lista_pai_codigo", "lista_pai_nome",
            # compatibilidade temporária:
            "produto_pai",
            # componente + derivados
            "componente", "componente_codigo", "componente_nome",
            "quantidade",
        ]

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
