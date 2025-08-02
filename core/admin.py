from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Produto, BOM, OrdemProducao

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome', 'tipo', 'get_fabricante')

    def get_fabricante(self, obj):
        return obj.fabricante.nome if obj.fabricante else "-"
    get_fabricante.short_description = 'Fabricante'


@admin.register(BOM)
class BOMAdmin(admin.ModelAdmin):
    list_display = ('produto_pai', 'componente', 'quantidade')
    search_fields = ('produto_pai__nome', 'componente__nome')

@admin.register(OrdemProducao)
class OrdemProducaoAdmin(admin.ModelAdmin):
    list_display = ('produto', 'quantidade', 'data_entrega')
    list_filter = ('data_entrega',)
    search_fields = ('produto__nome',)
