from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProdutoViewSet, BOMViewSet, OrdemProducaoViewSet
from .views import mrp_resultado
from .views import exportar_mrp_excel

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet)
router.register(r'bom', BOMViewSet)
router.register(r'ordens', OrdemProducaoViewSet)


urlpatterns = [
    path('api/', include(router.urls)),
    path('api/mrp/', mrp_resultado),
    path('api/mrp/excel/', exportar_mrp_excel),
]
