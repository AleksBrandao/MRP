from rest_framework import serializers
from .models import Produto, BOM, OrdemProducao, ListaTecnica  

class ProdutoSerializer(serializers.ModelSerializer):
    # Torna tipo opcional e com default
    tipo = serializers.ChoiceField(
        choices=getattr(Produto, "TIPO_CHOICES", None),
        required=False,
        default="produto"
    )

    class Meta:
        model = Produto
        fields = '__all__'

    def create(self, validated_data):
        validated_data.setdefault("tipo", "produto")  # 👈 fallback
        return super().create(validated_data)

class BOMSerializer(serializers.ModelSerializer):
    lista_pai_codigo = serializers.CharField(source="lista_pai.codigo", read_only=True)
    lista_pai_nome = serializers.CharField(source="lista_pai.nome", read_only=True)
    componente_codigo = serializers.CharField(source="componente.codigo", read_only=True)
    componente_nome = serializers.CharField(source="componente.nome", read_only=True)

    class Meta:
        model = BOM
        fields = [
            "id",
            "lista_pai", "lista_pai_codigo", "lista_pai_nome",
            "componente", "componente_codigo", "componente_nome",
            "quantidade",
        ]

class OrdemProducaoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = OrdemProducao
        fields = ['id', 'produto', 'produto_nome', 'quantidade', 'data_entrega']

class ListaTecnicaSerializer(serializers.ModelSerializer):
    parent_codigo = serializers.CharField(source="parent.codigo", read_only=True)
    parent_nome = serializers.CharField(source="parent.nome", read_only=True)

    class Meta:
        model = ListaTecnica
        fields = [
            "id", "codigo", "nome", "tipo", "observacoes",
            "parent", "parent_codigo", "parent_nome",
            "criado_em", "atualizado_em",
        ]