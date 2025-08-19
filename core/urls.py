from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import criar_lista_tecnica
from .views import (
    ProdutoViewSet,
    BOMViewSet,
    OrdemProducaoViewSet,
    executar_mrp,
    exportar_mrp_excel,
    exportar_mrp_csv,            # <- se estiver usando CSV
    historico_produto,
    historico_todos_os_produtos,
    mrp_detalhado,
    ComponenteViewSet,
    ListaTecnicaViewSet,
)

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet)
router.register(r'bom', BOMViewSet)  # 👈 ESSA LINHA PRECISA EXISTIR
router.register(r'ordens', OrdemProducaoViewSet)
router.register(r'componentes', ComponenteViewSet, basename='componente')
router.register(r'listas-tecnicas', ListaTecnicaViewSet, basename='lista-tecnica')

urlpatterns = [
    path('api/', include(router.urls)),
    # path('api/listas-tecnicas/', criar_lista_tecnica),  # sobrescreve o ViewSet, se houver
    path('api/mrp/', executar_mrp),
    path('api/mrp/detalhado/', mrp_detalhado),

    # Excel
    path('api/mrp/excel/', exportar_mrp_excel),            # novo caminho
    path('api/exportar-mrp-excel/', exportar_mrp_excel),   # compatibilidade com o front antigo

    # CSV (opcional)
    path('api/exportar-mrp-csv/', exportar_mrp_csv),

    # Histórico
    path('api/historico-produto/<int:produto_id>/', historico_produto),
    path('api/historico-todos/', historico_todos_os_produtos),
]
