# core/urls.py
from rest_framework.routers import DefaultRouter
from .views import ProdutoViewSet, BOMViewSet, OrdemProducaoViewSet

router = DefaultRouter()
router.register(r'produtos', ProdutoViewSet)
router.register(r'boms', BOMViewSet)
router.register(r'ordens', OrdemProducaoViewSet)

urlpatterns = router.urls
