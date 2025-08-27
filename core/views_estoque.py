from __future__ import annotations
from pathlib import Path
from decimal import Decimal

from django.conf import settings
from django.http import JsonResponse
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# utils do estoque (já existentes)
from .utils.estoque_loader import query, clear_cache, get_df

# >>> imports para atualizar Produtos
from .models import Produto


@method_decorator(csrf_exempt, name="dispatch")
class UploadEstoqueView(APIView):
    """
    POST /api/estoque/upload/?zerar_nao_encontrados=1
      - Salva o arquivo (xlsx/csv) em settings.ESTOQUE_PATH
      - Recarrega cache
      - Soma Bis Qty por Pieza
      - Atualiza Produto.estoque (Componentes)
      - (opcional) zera estoque de componentes que não vieram no arquivo
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        f = request.FILES.get("file")
        if not f:
            return JsonResponse({"detail": "Arquivo 'file' não enviado."}, status=400)

        # parâmetro opcional para zerar quem não veio no upload
        zerar_nao_encontrados = str(request.GET.get("zerar_nao_encontrados", "0")).lower() in ("1","true","t","yes","y")

        # salva o arquivo na pasta configurada
        ext = Path(f.name).suffix.lower() or ".xlsx"
        dest_path: Path = settings.ESTOQUE_PATH.with_suffix(ext)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as dst:
            for chunk in f.chunks():
                dst.write(chunk)

        # invalida cache e pré-carrega o DF normalizado
        clear_cache()
        try:
            df = get_df(force=True)  # ← sua rotina já normaliza nomes/formatos
        except Exception as e:
            return JsonResponse({"detail": f"Erro ao normalizar arquivo: {e}"}, status=500)

        # --- Soma Bis Qty por Pieza e aplica em Produto.estoque ---
        try:
            if "pieza" not in df.columns or "bis_qty" not in df.columns:
                return JsonResponse({"detail": "Colunas obrigatórias não encontradas (pieza, bis_qty)."}, status=400)

            # soma por código
            serie = df.groupby("pieza", dropna=True)["bis_qty"].sum()

            # dicionário {codigo: Decimal}
            somas_por_codigo = {
                str(cod).strip(): Decimal(str(qtd))
                for cod, qtd in serie.items() if str(cod).strip()
            }
            codigos_no_arquivo = list(somas_por_codigo.keys())

            # busca apenas componentes cujo código está no arquivo
            componentes = list(
                Produto.objects.filter(tipo__iexact="componente", codigo__in=codigos_no_arquivo)
            )

            atualizados = 0
            for comp in componentes:
                novo = somas_por_codigo.get(comp.codigo, Decimal("0"))
                if comp.estoque != novo:
                    comp.estoque = novo
                    atualizados += 1

            zerados = 0
            with transaction.atomic():
                if componentes:
                    Produto.objects.bulk_update(componentes, ["estoque"], batch_size=1000)

                if zerar_nao_encontrados:
                    outros = list(
                        Produto.objects.filter(tipo__iexact="componente")
                        .exclude(codigo__in=codigos_no_arquivo)
                    )
                    for comp in outros:
                        if comp.estoque != 0:
                            comp.estoque = Decimal("0")
                            zerados += 1
                    if outros:
                        Produto.objects.bulk_update(outros, ["estoque"], batch_size=1000)

            return JsonResponse({
                "ok": True,
                "path": str(dest_path),
                "encontrados_no_arquivo": len(codigos_no_arquivo),
                "produtos_atualizados": atualizados,
                "produtos_zerados": zerados if zerar_nao_encontrados else 0,
            })

        except Exception as e:
            return JsonResponse({"detail": f"Erro ao aplicar estoque em Produtos: {e}"}, status=500)


class ConsultaEstoqueView(APIView):
    """
    GET /api/estoque/
      ?pieza=...
      &org=...
      &warehouse=...
      &search=...
      &limit=100
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, *args, **kwargs):
        pieza = request.GET.get("pieza") or None
        org = request.GET.get("org") or None
        warehouse = request.GET.get("warehouse") or None
        search = request.GET.get("search") or None

        # paginação
        page = max(1, int(request.GET.get("page", "1") or 1))
        page_size = min(1000, max(1, int(request.GET.get("page_size", "50") or 50)))
        offset = (page - 1) * page_size

        # ordenação
        sort_by = request.GET.get("sort_by") or None
        sort_dir = request.GET.get("sort_dir") or "asc"

        try:
            total, rows = query(
                pieza=pieza, org=org, warehouse=warehouse, search=search,
                limit=page_size, offset=offset, sort_by=sort_by, sort_dir=sort_dir
            )
            return JsonResponse({
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": rows
            })
        except FileNotFoundError:
            return JsonResponse({"count": 0, "page": page, "page_size": page_size, "results": []})
        except Exception as e:
            return JsonResponse({"detail": f"Erro ao ler arquivo: {e}"}, status=500)
