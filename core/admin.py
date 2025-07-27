from django.contrib import admin
from .models import Produto, BOM, OrdemProducao

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nome', 'estoque', 'lead_time')
    search_fields = ('codigo', 'nome')
    list_filter = ('lead_time',)

@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ('produto_pai', 'componente', 'quantidade')
    search_fields = ('produto_pai__nome', 'componente__nome')

@admin.register(OrdemProducao)
class OrdemProducaoAdmin(admin.ModelAdmin):
    list_display = ('produto', 'quantidade', 'data_entrega')
    list_filter = ('data_entrega',)
    search_fields = ('produto__nome',)
