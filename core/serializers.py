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
    parent_codigo = serializers.CharField(source="parent.codigo", read_only=True)
    parent_nome = serializers.CharField(source="parent.nome", read_only=True)

    class Meta:
        model = ListaTecnica
        fields = [
            "id", "codigo", "nome", "tipo", "observacoes",
            "parent", "parent_codigo", "parent_nome",
            "criado_em", "atualizado_em",
        ]

    def validate(self, attrs):
        parent = attrs.get("parent") if "parent" in attrs else getattr(self.instance, "parent", None)
        tipo = attrs.get("tipo") if "tipo" in attrs else getattr(self.instance, "tipo", None)

        if parent and tipo:
            ordem = ["SERIE", "SISTEMA", "CONJUNTO", "SUBCONJUNTO", "ITEM"]
            if tipo in ordem and parent.tipo in ordem:
                if ordem.index(tipo) - ordem.index(parent.tipo) != 1:
                    raise serializers.ValidationError({
                        "parent": f"O pai de '{tipo}' deve ser do tipo '{ordem[ordem.index(tipo)-1]}'."
                    })
        return attrs