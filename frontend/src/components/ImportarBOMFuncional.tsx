import { useState } from "react";
import axios from "axios";

export default function ImportarBOMFuncional() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleUpload = async () => {
    if (!arquivo) {
      setMensagem("Selecione um arquivo Excel (.xlsx).");
      return;
    }

    const formData = new FormData();
    formData.append("file", arquivo);

    setCarregando(true);
    setMensagem("");

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/importar-bom-funcional/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setMensagem(res.data.message || "Importação concluída com sucesso!");
    } catch (err) {
      setMensagem("Erro ao importar o arquivo. Verifique o formato do Excel.");
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-md max-w-xl mx-auto shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center">Importar Árvore de Peças (Layout Funcional)</h2>

      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        className="mb-4 block w-full"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        disabled={carregando}
      >
        {carregando ? "Importando..." : "Importar"}
      </button>

      {mensagem && (
        <p className="mt-4 text-center font-medium text-gray-700">{mensagem}</p>
      )}
    </div>
  );
}
