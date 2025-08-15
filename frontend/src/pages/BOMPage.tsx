import { useEffect, useMemo, useState } from "react";
import { ListasTecnicasAPI, ComponentesAPI, BOMAPI } from "../services/api";

type Node = {
  id: number;
  codigo: string;
  nome: string;
  children: (Node & { rel_id?: number })[];
  rel_id?: number; // id da relação pai->este nó (útil para excluir)
};

type ProdutoOpt = { id: number; codigo: string; nome: string };

export default function BOMPage() {
  const [roots, setRoots] = useState<ProdutoOpt[]>([]);
  const [allProdutos, setAllProdutos] = useState<ProdutoOpt[]>([]);
  const [rootId, setRootId] = useState<number | "">("");
  const [tree, setTree] = useState<Node | null>(null);
  const [open, setOpen] = useState(false);
  const [parentForAdd, setParentForAdd] = useState<number | null>(null);
  const [novoCompId, setNovoCompId] = useState<number | "">("");
  const [quantidade, setQuantidade] = useState<number>(1);

  // carrega possíveis raízes a partir das relações já existentes
  const loadRoots = async () => {
    const [rels, prods] = await Promise.all([
      ListasTecnicasAPI.list(),       // linhas da BOM
      ComponentesAPI.list(),          // catálogo de produtos (no banco é 'produto')
    ]);
    const uniqPai = new Map<number, ProdutoOpt>();
    prods.data.forEach((p: any) => { /* catálogo para selects */
      // normaliza shape
    });
    // map de produtos para lookup rápido por id
    const mapP: Record<number, ProdutoOpt> = {};
    prods.data.forEach((p: any) => (mapP[p.id] = { id: p.id, codigo: p.codigo, nome: p.nome }));
    setAllProdutos(Object.values(mapP));

    rels.data.forEach((r: any) => {
      const pai = mapP[r.produto_pai] || r.produto_pai_obj;
      if (pai) uniqPai.set(pai.id, { id: pai.id, codigo: pai.codigo, nome: pai.nome });
    });
    setRoots(Array.from(uniqPai.values()));
  };

  const loadTree = async (id: number) => {
    const r = await BOMAPI.tree(id);
    setTree(r.data);
  };

  useEffect(() => { loadRoots(); }, []);
  useEffect(() => { if (rootId) loadTree(Number(rootId)); }, [rootId]);

  const onAdd = async () => {
    if (!parentForAdd || !novoCompId || quantidade <= 0) return;
    await ListasTecnicasAPI.create({
      produto_pai: parentForAdd,
      componente: Number(novoCompId),
      quantidade: Number(quantidade),
    });
    setOpen(false);
    setNovoCompId("");
    setQuantidade(1);
    if (rootId) loadTree(Number(rootId));
  };

  const onDeleteRel = async (relId?: number) => {
    if (!relId) return;
    if (confirm("Excluir esta relação?")) {
      await ListasTecnicasAPI.remove(relId);
      if (rootId) loadTree(Number(rootId));
    }
  };

  // UI recursiva da árvore
  const NodeView = ({ node, depth = 0 }: { node: Node; depth?: number }) => (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-1">
        <span className="text-gray-700" style={{ paddingLeft: depth * 12 }}>
          <span className="font-mono">{node.codigo}</span> — {node.nome}
        </span>
        {/* ações por nó */}
        <button
          className="text-blue-600 text-sm underline"
          onClick={() => { setParentForAdd(node.id); setOpen(true); }}
        >
          + adicionar item
        </button>
        {node.rel_id && (
          <button
            className="text-red-600 text-sm underline"
            onClick={() => onDeleteRel(node.rel_id)}
          >
            excluir relação
          </button>
        )}
      </div>
      {node.children?.map((c) => (
        <NodeView key={`${c.id}-${c.rel_id ?? "r"}`} node={c} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">BOM — Estrutura Hierárquica</h1>
        <div className="flex gap-2">
          <select
            className="border rounded-xl px-3 py-2"
            value={rootId}
            onChange={(e) => setRootId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Selecione um produto raiz…</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>{`${r.codigo} — ${r.nome}`}</option>
            ))}
          </select>
          {rootId && (
            <button className="px-3 py-2 rounded-xl border" onClick={() => loadTree(Number(rootId))}>
              Atualizar
            </button>
          )}
        </div>
      </div>

      {!rootId && <p className="text-gray-600">Escolha um produto raiz para visualizar a árvore.</p>}
      {rootId && tree && <NodeView node={tree} />}

      {/* Modal adicionar item */}
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[640px] shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">Adicionar item</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-gray-700">Componente / Sublista</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  value={novoCompId}
                  onChange={(e) => setNovoCompId(Number(e.target.value))}
                >
                  <option value="">Selecione…</option>
                  {allProdutos.map((p) => (
                    <option key={p.id} value={p.id}>{`${p.codigo} — ${p.nome}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Quantidade</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2 mt-1"
                  min={0}
                  step={0.0001}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 rounded-xl border" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white" onClick={onAdd}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
