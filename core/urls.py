from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
)

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet)
router.register(r'boms', BOMViewSet)          # padronizei no plural (opcional)
router.register(r'ordens', OrdemProducaoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
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
