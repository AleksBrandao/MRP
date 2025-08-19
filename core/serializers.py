from rest_framework import serializers
from .models import Produto, BOM, OrdemProducao, ListaTecnica  

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'

class BOMSerializer(serializers.ModelSerializer):
    produto_pai_nome = serializers.CharField(source='produto_pai.nome', read_only=True)
    produto_pai_codigo = serializers.CharField(source='produto_pai.codigo', read_only=True)
    componente_nome = serializers.CharField(source='componente.nome', read_only=True)
    componente_codigo = serializers.CharField(source='componente.codigo', read_only=True)

    class Meta:
        model = BOM
        fields = [
            'id',
            'produto_pai', 'produto_pai_codigo', 'produto_pai_nome',
            'componente', 'componente_codigo', 'componente_nome',
            'quantidade',
        ]

class OrdemProducaoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = OrdemProducao
        fields = ['id', 'produto', 'produto_nome', 'quantidade', 'data_entrega']

class ListaTecnicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListaTecnica
        fields = '__all__'