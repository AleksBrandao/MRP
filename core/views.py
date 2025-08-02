from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse
import csv
from rest_framework import viewsets
from .models import Produto, BOM, OrdemProducao
from .serializers import ProdutoSerializer, BOMSerializer, OrdemProducaoSerializer
import openpyxl
from openpyxl.utils import get_column_letter
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework import status
import pandas as pd

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer

class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.all()
    serializer_class = BOMSerializer

class OrdemProducaoViewSet(viewsets.ModelViewSet):
    queryset = OrdemProducao.objects.all()
    serializer_class = OrdemProducaoSerializer

# Função recursiva com controle de nível e referência ao pai
def calcular_necessidades(produto, quantidade, necessidades, nivel=0, codigo_pai=None):
    boms = BOM.objects.filter(produto_pai=produto)
    for item in boms:
        print(f"Analisando: {item.componente.nome}, nível {nivel}, pai: {codigo_pai}")
        necessidade_total = quantidade * item.quantidade
        estoque_atual = item.componente.estoque
        necessidade_liquida = max(0, necessidade_total - estoque_atual)

        if item.componente.id not in necessidades:
            necessidades[item.componente.id] = {
                'codigo': item.componente.codigo,
                'nome': item.componente.nome,
                'necessario': float(necessidade_total),
                'em_estoque': float(estoque_atual),
                'faltando': float(necessidade_liquida),
                'lead_time': item.componente.lead_time,
                'data_compra': '',  # será calculado abaixo
                'nivel': nivel,
                'codigo_pai': codigo_pai,
            }
        else:
            necessidades[item.componente.id]['necessario'] += float(necessidade_total)
            necessidades[item.componente.id]['faltando'] = max(
                0,
                necessidades[item.componente.id]['necessario'] - necessidades[item.componente.id]['em_estoque']
            )

        calcular_necessidades(item.componente, necessidade_total, necessidades, nivel + 1, item.produto_pai.codigo)

# 🔁 função reutilizável para MRP
def calcular_mrp_recursivo():
    necessidades = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        calcular_necessidades(ordem.produto, ordem.quantidade, necessidades, nivel=0, codigo_pai=None)

    print("✅ Função MRP recursiva executada com sucesso!")
    print(f"🔢 Total de itens calculados: {len(necessidades)}")
    
    resultado = list(necessidades.values())
    ordens = OrdemProducao.objects.all()
    if ordens.exists():
        menor_data_entrega = min(ordem.data_entrega for ordem in ordens)
    else:
        menor_data_entrega = date.today()

    for item in resultado:
        lead = item.get("lead_time", 0)
        item["data_compra"] = (menor_data_entrega - timedelta(days=lead)).isoformat()
    return resultado
    

@api_view(['GET'])
def executar_mrp(request):
    return Response(calcular_mrp_recursivo())

@api_view(['GET'])
def exportar_mrp_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="resultado_mrp.csv"'

    writer = csv.writer(response)
    writer.writerow(['Produto', 'Necessidade'])

    resultado = calcular_mrp_recursivo()
    for item in resultado:
        writer.writerow([item['nome'], item['necessario']])

    return response

@api_view(['GET'])
def exportar_mrp_excel(request):
    from openpyxl import Workbook
    from openpyxl.utils import get_column_letter

    resultado = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        adicionar_detalhes_recursivo(
            produto=ordem.produto,
            qtd_produto_op=ordem.quantidade,
            ordem_id=ordem.id,
            produto_final_nome=ordem.produto.nome,
            resultado=resultado
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "MRP Detalhado"

    # Cabeçalhos
    headers = [
        "OP", "Produto Final", "Qtd OP", "Qtd por Unidade", "Qtd Necessária",
        "Componente", "Data Necessidade", "Em Estoque", "Faltando", "Saldo Estoque"
    ]
    ws.append(headers)

    for comp in resultado.values():
        estoque_disponivel = comp["em_estoque"]
        for d in comp["detalhes"]:
            faltando = max(0, d["qtd_necessaria"] - estoque_disponivel)
            saldo = estoque_disponivel - d["qtd_necessaria"]
            data = OrdemProducao.objects.get(id=int(d["ordem_producao"])).data_entrega.strftime("%d/%m/%Y")

            ws.append([
                d["ordem_producao"],
                d["produto_final"],
                d["qtd_produto"],
                d["qtd_componente_por_unidade"],
                d["qtd_necessaria"],
                f"{comp['codigo_componente']} - {comp['nome_componente']}",
                data,
                estoque_disponivel,
                faltando,
                saldo
            ])

            estoque_disponivel = max(0, saldo)

    # Ajustar largura das colunas
    for col in ws.columns:
        max_length = max(len(str(cell.value)) if cell.value else 0 for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max_length + 2

    # Resposta
    response = HttpResponse(content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response["Content-Disposition"] = 'attachment; filename="mrp_detalhado.xlsx"'
    wb.save(response)
    return response


@api_view(["GET"])
def historico_produto(request, produto_id):
    try:
        produto = Produto.objects.get(id=produto_id)
    except Produto.DoesNotExist:
        return Response({"erro": "Produto não encontrado"}, status=404)

    historico = produto.history.all().order_by("-history_date")

    data = []
    for versao in historico:
        data.append({
            "estoque": versao.estoque,
            "data": versao.history_date,
            "usuario": versao.history_user.username if versao.history_user else "Desconhecido",
            "tipo": versao.history_type,
        })

    return Response(data)

@api_view(["GET"])
def historico_todos_os_produtos(request):
    from .models import Produto

    todos = []
    for produto in Produto.objects.all():
        for versao in produto.history.all().order_by("-history_date"):
            todos.append({
                "produto_id": produto.id,
                "produto_nome": produto.nome,
                "estoque": versao.estoque,
                "usuario": versao.history_user.username if versao.history_user else "Desconhecido",
                "tipo": versao.history_type,
                "data": versao.history_date,
            })
    
    # Ordenar por data descrescente
    todos.sort(key=lambda x: x["data"], reverse=True)

    return Response(todos)

@api_view(['GET'])
def mrp_detalhado(request):
    resultado = {}
    ordens = OrdemProducao.objects.all()

    for ordem in ordens:
        adicionar_detalhes_recursivo(
            produto=ordem.produto,
            qtd_produto_op=ordem.quantidade,
            ordem_id=ordem.id,
            produto_final_nome=ordem.produto.nome,
            resultado=resultado
        )

    return Response(list(resultado.values()))


def adicionar_detalhes_recursivo(produto, qtd_produto_op, ordem_id, produto_final_nome, resultado, nivel=0):
    boms = BOM.objects.filter(produto_pai=produto)

    for bom in boms:
        total = qtd_produto_op * bom.quantidade
        comp = bom.componente
        comp_id = comp.id

        if comp_id not in resultado:
            resultado[comp_id] = {
                "codigo_componente": comp.codigo,
                "nome_componente": comp.nome,
                "total_necessario": 0,
                "em_estoque": comp.estoque,
                "faltando": 0,
                "detalhes": []
            }

        resultado[comp_id]["total_necessario"] += total
        resultado[comp_id]["faltando"] = max(
            0,
            resultado[comp_id]["total_necessario"] - resultado[comp_id]["em_estoque"]
        )

        resultado[comp_id]["detalhes"].append({
            "ordem_producao": str(ordem_id),
            "produto_final": produto_final_nome,
            "qtd_produto": qtd_produto_op,
            "qtd_componente_por_unidade": bom.quantidade,
            "qtd_necessaria": total
        })

        # RECURSIVIDADE
        adicionar_detalhes_recursivo(comp, total, ordem_id, produto_final_nome, resultado, nivel + 1)

class ImportarBOMView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"error": "Nenhum arquivo enviado."}, status=400)

        df = pd.read_excel(excel_file)
        df = df.fillna("")

        pilha = {}

        for _, row in df.iterrows():
            nivel = int(row["NÍVEL BOM"])
            cod_componente = row["Código do Componente"]
            nome_componente = row["Descrição do Componente"]
            tipo = row["Tipo"]
            unidade = row["Unidade"]
            qtd = row["Quantidade"]

            componente, _ = Produto.objects.get_or_create(
                codigo=cod_componente,
                defaults={"nome": nome_componente, "tipo": tipo, "unidade": unidade}
            )
            componente.nome = nome_componente
            componente.tipo = tipo
            componente.unidade = unidade
            componente.save()

            pilha[nivel] = componente

            if nivel > 1:
                pai = pilha[nivel - 1]
                BOM.objects.update_or_create(
                    produto_pai=pai,
                    componente=componente,
                    defaults={"quantidade": qtd, "nivel": nivel}
                )

        return Response({"message": "Importação realizada com sucesso."}, status=status.HTTP_200_OK)

class ImportarBOMFuncional(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        from .models import Fabricante  # certifique-se de importar

        excel_file = request.FILES.get("file")
        if not excel_file:
            return Response({"error": "Arquivo não enviado."}, status=400)

        df = pd.read_excel(excel_file)
        df.columns = df.columns.str.strip()

        for _, row in df.iterrows():
            try:
                sistema = row["SISTEMA"]
                conjunto = row["CONJUNTO"]
                subconjunto = row["SUB-CONJUNTO"]
                item = row["ITEM"]
                componente_nome = row["COMPONENTES"]
                fabricante_nome = row.get("FABRICANTE", "").strip()
                codigo_fabricante = row.get("CODIGO FABRICANTE", "").strip()
                cod_gmao = row.get("CODIGO GMAO", "")
                quantidade = row.get("QUANT. P/ 1 TREM", 1)
                unidade = row.get("UNIDADE", "")
                serie = row.get("SÉRIE", "")
                comentario = row.get("COMENTARIOS", "")
                ponderacao = row.get("PONDERAÇÃO OPERAÇÃO", "")

                # Criação dos níveis hierárquicos como produtos
                sistema_obj, _ = Produto.objects.get_or_create(
                    nome=sistema, tipo="Sistema"
                )
                conjunto_obj, _ = Produto.objects.get_or_create(
                    nome=conjunto, tipo="Conjunto"
                )
                subconjunto_obj, _ = Produto.objects.get_or_create(
                    nome=subconjunto, tipo="Subconjunto"
                )
                item_obj, _ = Produto.objects.get_or_create(
                    nome=item, tipo="Item"
                )

                # Criação ou atualização do Fabricante
                fabricante_obj = None
                if fabricante_nome:
                    fabricante_obj, _ = Fabricante.objects.get_or_create(
                        nome=fabricante_nome,
                        defaults={"codigo": codigo_fabricante}
                    )
                    if not fabricante_obj.codigo and codigo_fabricante:
                        fabricante_obj.codigo = codigo_fabricante
                        fabricante_obj.save()

                # Criação do componente
                componente_obj, _ = Produto.objects.get_or_create(
                    nome=componente_nome,
                    tipo="Componente",
                    defaults={
                        "codigo_gmao": cod_gmao,
                        "unidade": unidade,
                        "serie": serie,
                        "fabricante": fabricante_obj
                    },
                )

                # Atualização de dados caso já existam
                componente_obj.codigo_gmao = cod_gmao
                componente_obj.unidade = unidade
                componente_obj.serie = serie
                componente_obj.fabricante = fabricante_obj
                componente_obj.save()

                # Registro na tabela BOM (Item → Componente)
                BOM.objects.update_or_create(
                    produto_pai=item_obj,
                    componente=componente_obj,
                    defaults={
                        "quantidade": quantidade,
                        "comentario": comentario,
                        "ponderacao": ponderacao,
                    },
                )
            except Exception as e:
                print(f"Erro ao processar linha: {row}\n{e}")
                continue  # ignora erro e segue com a próxima linha

        return Response({"message": "Importação funcional concluída com sucesso!"}, status=200)
