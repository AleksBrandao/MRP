from decimal import Decimal, ROUND_HALF_UP   # ✅ importa o ROUND_HALF_UP
from django.contrib import admin
from django.db.models import F, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce            # ✅ para tratar NULL -> 100
from .models import Produto, ListaTecnica, BOM, OrdemProducao


def dash(v):
    return "—" if v in (None, "", 0) else v


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    search_fields = ("codigo", "nome", "fabricante", "codigo_fabricante")
    list_display = ("codigo", "nome", "fabricante", "codigo_fabricante", "unidade",
                    "estoque", "lead_time", "tipo")
    list_filter = ("tipo",)
    ordering = ("codigo",)
    list_per_page = 50


class BOMInline(admin.TabularInline):
    model = BOM
    fk_name = "lista_pai"
    extra = 0
    autocomplete_fields = ("componente", "sublista")
    fields = ("componente", "sublista", "quantidade", "ponderacao_operacao",
              "quant_ponderada_inline", "comentarios")
    readonly_fields = ("quant_ponderada_inline",)

    def quant_ponderada_inline(self, obj):
        if not obj:
            return "—"
        q = Decimal(obj.quantidade or 0)
        p_raw = obj.ponderacao_operacao
        p = Decimal(100 if p_raw is None else p_raw)     # None -> 100, 0 -> 0
        return (q * p / Decimal(100)).quantize(Decimal("0.0000"), rounding=ROUND_HALF_UP)
    quant_ponderada_inline.short_description = "Quant. Ponderada"


@admin.register(ListaTecnica)
class ListaTecnicaAdmin(admin.ModelAdmin):
    search_fields = ("codigo", "nome", "observacoes")
    list_display = ("codigo", "nome", "tipo", "criado_em")
    ordering = ("codigo",)
    inlines = (BOMInline,)


@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = (
        "col_lista_pai",
        "col_sublista",
        "col_componente",
        "quantidade",
        "col_ponderacao",
        "col_quant_ponderada",
        "comentarios_short",
    )
    list_display_links = ("col_lista_pai", "col_componente")
    list_select_related = ("lista_pai", "sublista", "componente")
    search_fields = (
        "lista_pai__codigo", "lista_pai__nome",
        "sublista__codigo", "sublista__nome",
        "componente__codigo", "componente__nome",
        "comentarios",
    )
    list_filter = ("lista_pai",)
    ordering = ("lista_pai__codigo", "id")
    list_per_page = 50
    autocomplete_fields = ("lista_pai", "sublista", "componente")

    fields = (
        "lista_pai",
        "componente",
        "sublista",
        "quantidade",
        "ponderacao_operacao",
        "quant_ponderada_view",
        "comentarios",
    )
    readonly_fields = ("quant_ponderada_view",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # ✅ Coalesce: se ponderacao_operacao for NULL -> 100 (mantém ordenação e valor)
        return qs.annotate(
            quant_ponderada_calc=ExpressionWrapper(
                F("quantidade") * Coalesce(F("ponderacao_operacao"), Value(100.0)) / Value(100.0),
                output_field=DecimalField(max_digits=14, decimal_places=4),
            )
        )

    @admin.display(ordering="lista_pai__codigo", description="Lista Pai")
    def col_lista_pai(self, obj):
        lp = obj.lista_pai
        if not lp:
            return "—"
        cod = (lp.codigo or "").strip()
        nom = (lp.nome or "").strip()
        return f"[{cod}] {nom}" if cod else nom

    @admin.display(ordering="sublista__codigo", description="Sublista")
    def col_sublista(self, obj):
        sl = obj.sublista
        if not sl:
            return "—"
        cod = (sl.codigo or "").strip()
        nom = (sl.nome or "").strip()
        return f"[{cod}] {nom}" if cod else nom

    @admin.display(ordering="componente__codigo", description="Componente")
    def col_componente(self, obj):
        cp = obj.componente
        if not cp:
            return "—"
        cod = (cp.codigo or "").strip()
        nom = (cp.nome or "").strip()
        return f"[{cod}] {nom}" if cod else nom

    @admin.display(description="Ponderação")
    def col_ponderacao(self, obj):
        p = obj.ponderacao_operacao
        return "100%" if p is None else f"{int(p)}%"

    @admin.display(ordering="quant_ponderada_calc", description="Quant. Ponderada")
    def col_quant_ponderada(self, obj):
        # Quando ponderação é None, o annotate já tratou como 100%
        val = getattr(obj, "quant_ponderada_calc", None)
        return "—" if val is None else Decimal(val).quantize(Decimal("0.0000"))

    @admin.display(description="Comentários")
    def comentarios_short(self, obj):
        txt = (obj.comentarios or "").strip()
        return txt if len(txt) <= 60 else txt[:57] + "…"

    def quant_ponderada_view(self, obj):
        if not obj:
            return "—"
        q = Decimal(obj.quantidade or 0)
        p_raw = obj.ponderacao_operacao
        p = Decimal(100 if p_raw is None else p_raw)       # None -> 100, 0 -> 0
        return (q * p / Decimal(100)).quantize(Decimal("0.0000"))
    quant_ponderada_view.short_description = "Quant. Ponderada"
