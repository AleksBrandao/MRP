# core/views_pedidos.py
from __future__ import annotations
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .utils.pedidos_loader import clear_cache, get_df, query, build_snapshot


@method_decorator(csrf_exempt, name="dispatch")
class UploadPedidosView(APIView):
    """
    POST /api/pedidos/upload/
      - Salva o arquivo enviado (xlsx/xls/csv) em settings.PEDIDOS_PATH
      - Limpa caches
      - Normaliza o DF e gera snapshot agregado por 'pieza' (qty = ord - recv >= 0)
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        f = request.FILES.get("file")
        if not f:
            return JsonResponse({"detail": "Arquivo 'file' não enviado."}, status=400)

        # salva com a mesma extensão do upload
        ext = Path(f.name).suffix.lower() or ".xlsx"
        base = Path(getattr(settings, "PEDIDOS_PATH", settings.BASE_DIR / "data" / "pedidos.xlsx"))
        dest_path = base.with_suffix(ext)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        with open(dest_path, "wb") as dst:
            for chunk in f.chunks():
                dst.write(chunk)

        # rebuild caches
        clear_cache()
        try:
            _ = get_df(force=True)            # normaliza e grava .pkl do DF
            snap = build_snapshot(force=True) # snapshot agregado {codigo: qty}
        except Exception as e:
            return JsonResponse({"detail": f"Erro ao processar arquivo: {e}"}, status=500)

        return JsonResponse({"ok": True, "path": str(dest_path), "codigos_no_snapshot": len(snap)})


class ConsultaPedidosView(APIView):
    """
    GET /api/pedidos/
      Parâmetros:
        pieza, org, fornecedor, search, prazo_ini, prazo_fim,
        limit (ou page_size), sort_by, sort_dir
      Retorno:
        { count, results: [...] }
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, *args, **kwargs):
        # filtros
        pieza = request.GET.get("pieza") or None
        org = request.GET.get("org") or None
        fornecedor = request.GET.get("fornecedor") or None
        search = request.GET.get("search") or None
        prazo_ini = request.GET.get("prazo_ini") or None
        prazo_fim = request.GET.get("prazo_fim") or None

        # limit (mesma semântica da tela de Estoque)
        limit_param = request.GET.get("limit") or request.GET.get("page_size") or "50"
        try:
            page_size = min(1000, max(1, int(limit_param)))
        except Exception:
            page_size = 50

        # offset opcional (por padrão, 0 porque a tela pagina no cliente)
        try:
            offset = max(0, int(request.GET.get("offset", "0") or 0))
        except Exception:
            offset = 0

        # ordenação
        sort_by = request.GET.get("sort_by") or None
        sort_dir = request.GET.get("sort_dir") or "asc"

        try:
            total, rows = query(
                pieza=pieza,
                org=org,
                fornecedor=fornecedor,
                search=search,
                prazo_ini=prazo_ini,
                prazo_fim=prazo_fim,
                limit=page_size,
                offset=offset,
                sort_by=sort_by,
                sort_dir=sort_dir,
            )
            return JsonResponse({"count": total, "results": rows})
        except FileNotFoundError:
            # ainda não foi feito upload
            return JsonResponse({"count": 0, "results": []})
        except Exception as e:
            return JsonResponse({"detail": f"Erro ao ler pedidos: {e}"}, status=500)
