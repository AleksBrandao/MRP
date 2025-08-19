from django.db import migrations, models
from django.db.models import Q

def migrate_lista_tecnica_forward(apps, schema_editor):
    Produto = apps.get_model("core", "Produto")
    ListaTecnica = apps.get_model("core", "ListaTecnica")
    BOM = apps.get_model("core", "BOM")

    # 1) Criar ListaTecnica para cada Produto(tipo='lista')
    mapping = {}  # old_prod_id -> new_lista_id
    for p in Produto.objects.filter(Q(tipo="lista") | Q(tipo__iexact="Lista Técnica (BOM)")):
        lt = ListaTecnica.objects.create(
            codigo=p.codigo,
            nome=p.nome,
            # Escolha segura como default: CONJUNTO (o usuário pode ajustar depois)
            tipo="CONJUNTO",
            observacoes=f"Migrado de Produto id={p.id}",
        )
        mapping[p.id] = lt.id

    # 2) Reapontar BOM.produto_pai -> BOM.lista_pai
    #    Esta migração assume que antes havia o campo produto_pai em BOM.
    if hasattr(BOM, "produto_pai_id"):
        for item in BOM.objects.all().only("id", "produto_pai_id"):
            old = getattr(item, "produto_pai_id", None)
            if old and old in mapping:
                setattr(item, "lista_pai_id", mapping[old])
                item.save(update_fields=["lista_pai_id"])

def migrate_lista_tecnica_backward(apps, schema_editor):
    # Rollback (opcional): não recriamos os Produtos antigos,
    # apenas apagamos as Listas técnicas criadas.
    ListaTecnica = apps.get_model("core", "ListaTecnica")
    ListaTecnica.objects.filter(observacoes__startswith="Migrado de Produto id=").delete()

class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_alter_listatecnica_options_listatecnica_parent_and_more"),
    ]

    operations = [
        # 1) Criar o model ListaTecnica (se ainda não foi criado)
        # migrations.CreateModel(
        #     name="ListaTecnica",
        #     fields=[
        #         ("id", models.AutoField(primary_key=True, serialize=False, auto_created=True, verbose_name="ID")),
        #         ("codigo", models.CharField(max_length=50, unique=True)),
        #         ("nome", models.CharField(max_length=255)),
        #         ("tipo", models.CharField(max_length=20, choices=[("SERIE","Série"),("SISTEMA","Sistema"),("CONJUNTO","Conjunto"),("SUBCONJUNTO","Subconjunto"),("ITEM","Item")], default="CONJUNTO")),
        #         ("observacoes", models.TextField(blank=True, default="")),
        #         ("criado_em", models.DateTimeField(auto_now_add=True)),
        #         ("atualizado_em", models.DateTimeField(auto_now=True)),
        #         ("parent", models.ForeignKey(null=True, blank=True, to="core.listatecnica", on_delete=models.SET_NULL, related_name="filhos")),
        #     ],
        #     options={"ordering": ["codigo"]},
        # ),

        # 2) Adicionar campo lista_pai na BOM (temporário para migração)
        migrations.AddField(
            model_name="bom",
            name="lista_pai",
            field=models.ForeignKey(null=True, blank=True, to="core.listatecnica", on_delete=models.CASCADE, related_name="itens"),
        ),

        # 3) Migrar dados
        migrations.RunPython(migrate_lista_tecnica_forward, migrate_lista_tecnica_backward),

        # 4) Remover produto_pai antigo e deixar lista_pai definitivo
        migrations.RemoveField(model_name="bom", name="produto_pai"),

        # 5) Tornar lista_pai obrigatório
        migrations.AlterField(
            model_name="bom",
            name="lista_pai",
            field=models.ForeignKey(null=False, blank=False, to="core.listatecnica", on_delete=models.CASCADE, related_name="itens"),
        ),
    ]
