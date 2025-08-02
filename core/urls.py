from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImportarBOMView
from .views import ImportarBOMFuncional
from .views import (
    ProdutoViewSet,
    BOMViewSet,
    OrdemProducaoViewSet,
    executar_mrp,
    exportar_mrp_excel,
    historico_todos_os_produtos,
    historico_produto,
    mrp_detalhado,  # 👈 novo endpoint
)

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet)
router.register(r'bom', BOMViewSet)
router.register(r'ordens', OrdemProducaoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/mrp/', executar_mrp),
    path('api/mrp/excel/', exportar_mrp_excel),
    path("api/exportar-mrp-excel/", exportar_mrp_excel),
    path('api/mrp/detalhado/', mrp_detalhado),  # ✅ novo endpoint
    path("api/historico-produto/<int:produto_id>/", historico_produto),
    path("api/historico-todos/", historico_todos_os_produtos),
    path("api/importar-bom/", ImportarBOMView.as_view(), name="importar-bom"),
    path("api/importar-bom-funcional/", ImportarBOMFuncional.as_view(), name="importar-bom-funcional"),
]
