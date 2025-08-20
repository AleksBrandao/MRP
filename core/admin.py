from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Produto, BOM, OrdemProducao, ListaTecnica

@admin.register(Produto)
class ProdutoAdmin(SimpleHistoryAdmin):
    list_display = ("codigo", "nome", "estoque", "lead_time", "tipo")
    search_fields = ("codigo", "nome")
    list_filter = ("lead_time", "tipo")

@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ("lista_pai", "componente", "sublista", "quantidade")
    search_fields = (
        "lista_pai__codigo", "lista_pai__nome",
        "componente__codigo", "componente__nome",
    )
    autocomplete_fields = ("lista_pai", "componente")

@admin.register(OrdemProducao)
class OrdemProducaoAdmin(admin.ModelAdmin):
     list_display = ("lista", "quantidade", "data_entrega")
     search_fields = ("lista__codigo", "lista__nome")
     autocomplete_fields = ("lista",)
     date_hierarchy = "data_entrega"

@admin.register(ListaTecnica)   # ⬅️ registrar aqui
class ListaTecnicaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome", "tipo", "atualizado_em")
    list_filter = ("tipo",)
    search_fields = ("codigo", "nome")
    ordering = ("codigo",)
    readonly_fields = ("criado_em", "atualizado_em")
