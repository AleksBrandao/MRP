# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # ViewSets
    ComponentesViewSet,
    MateriasPrimasViewSet,
    BOMViewSet,
    OrdemProducaoViewSet,
    # Endpoints de função
    executar_mrp,
    exportar_mrp_csv,
    exportar_mrp_excel,
    historico_produto,
    historico_todos_os_produtos,
    mrp_detalhado,
    ListaTecnicaViewSet,
)

router = DefaultRouter()
router.register(r'componentes', ComponentesViewSet, basename='componentes')
router.register(r'materias-primas', MateriasPrimasViewSet, basename='materias-primas')
# router.register(r'listas-tecnicas', BOMViewSet, basename='listas-tecnicas')
router.register(r'ordens', OrdemProducaoViewSet, basename='ordens')
router.register(r"listas-tecnicas", ListaTecnicaViewSet, basename="listas-tecnicas")

urlpatterns = [
    path('api/', include(router.urls)),
    # MRP agregados/detalhados
    path('api/mrp/', executar_mrp),
    path('api/mrp/csv/', exportar_mrp_csv),
    path('api/mrp/excel/', exportar_mrp_excel),
    path('api/mrp/detalhado/', mrp_detalhado),
    # Histórico
    path('api/historico-produto/<int:produto_id>/', historico_produto),
    path('api/historico-todos/', historico_todos_os_produtos),
]
