import { useState } from "react";
import axios from "axios";

export default function ImportarBOM() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState("");

  const handleUpload = async () => {
    if (!arquivo) {
      setMensagem("Por favor, selecione um arquivo.");
      return;
    }

    const formData = new FormData();
    formData.append("file", arquivo);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/importar-bom/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setMensagem(res.data.message || "Importação realizada com sucesso.");
    } catch (err) {
      setMensagem("Erro ao importar o arquivo.");
      console.error(err);
    }
  };

  return (
    <div className="p-4 border rounded shadow-md max-w-md">
      <h2 className="text-lg font-bold mb-2">Importar BOM</h2>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        className="mb-2"
      />
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Enviar
      </button>
      {mensagem && <p className="mt-2">{mensagem}</p>}
    </div>
  );
}
