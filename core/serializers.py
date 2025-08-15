# core/serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Produto, BOM, OrdemProducao, ListaTecnica


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = "__all__"


class BOMSerializer(serializers.ModelSerializer):
    # Campos que você já tinha (mantidos p/ compatibilidade)
    produto_pai_nome = serializers.CharField(source="produto_pai.nome", read_only=True)
    produto_pai_codigo = serializers.CharField(source="produto_pai.codigo", read_only=True)
    componente_nome = serializers.CharField(source="componente.nome", read_only=True)
    componente_codigo = serializers.CharField(source="componente.codigo", read_only=True)

    # Objetos completos (usáveis direto no front)
    produto_pai_obj = serializers.SerializerMethodField(read_only=True)
    componente_obj  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BOM
        fields = [
            "id",
            "produto_pai", "produto_pai_codigo", "produto_pai_nome", "produto_pai_obj",
            "componente", "componente_codigo", "componente_nome", "componente_obj",
            "quantidade",
        ]
        validators = [
            UniqueTogetherValidator(
                queryset=BOM.objects.all(),
                fields=["produto_pai", "componente"],
                message="Já existe essa relação entre produto pai e componente.",
            )
        ]

    def get_produto_pai_obj(self, obj):
        p = obj.produto_pai
        return {"id": p.id, "codigo": p.codigo, "nome": p.nome}

    def get_componente_obj(self, obj):
        c = obj.componente
        return {"id": c.id, "codigo": c.codigo, "nome": c.nome}

    def validate_quantidade(self, value):
        if value is None or float(value) <= 0:
            raise serializers.ValidationError("Quantidade deve ser maior que zero.")
        return value

    def validate(self, data):
        """
        Evita autorreferência e ciclos: pai -> ... -> comp -> ... -> pai
        Suporta partial update (usa self.instance quando campo não vier no payload).
        """
        pai = data.get("produto_pai") or getattr(self.instance, "produto_pai", None)
        comp = data.get("componente") or getattr(self.instance, "componente", None)

        if pai and comp:
            if pai.id == comp.id:
                raise serializers.ValidationError("O produto pai não pode referenciar a si mesmo.")

            if self._cria_ciclo(pai_id=pai.id, comp_id=comp.id):
                raise serializers.ValidationError("Essa relação criaria um ciclo na estrutura (BOM).")

        return data

    def _cria_ciclo(self, pai_id: int, comp_id: int) -> bool:
        """
        DFS iterativo: se alcançarmos pai_id a partir de comp_id, há ciclo.
        """
        stack = [comp_id]
        visit = set()
        while stack:
            cur = stack.pop()
            if cur in visit:
                continue
            visit.add(cur)
            if cur == pai_id:
                return True
            filhos = (BOM.objects
                        .filter(produto_pai_id=cur)
                        .values_list("componente_id", flat=True))
            stack.extend(filhos)
        return False


class OrdemProducaoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)

    class Meta:
        model = OrdemProducao
        fields = ["id", "produto", "produto_nome", "quantidade", "data_entrega"]

class ListaTecnicaSerializer(serializers.ModelSerializer):
    parent_codigo = serializers.CharField(source="parent.codigo", read_only=True)
    parent_nome = serializers.CharField(source="parent.nome", read_only=True)

    class Meta:
        model = ListaTecnica
        fields = [
            "id", "codigo", "nome", "tipo",
            "parent", "parent_codigo", "parent_nome",
            "observacoes", "criado_em", "atualizado_em"
        ]

    def validate(self, data):
        # delega validações de regra de negócio ao clean()
        instance = ListaTecnica(**{**getattr(self, "initial_data", {}), **data})
        instance.clean()
        return data