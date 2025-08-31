"use client";

import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { exportVaultWords, importWordsToVault } from "@/actions/actions";
import { useQueryClient } from "@tanstack/react-query";

interface ImportExportWordsProps {
  vaultId: number;
  vaultName: string;
  wordCount: number;
}

export function ImportExportWords({
  vaultId,
  vaultName,
  wordCount,
}: ImportExportWordsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Função para exportar palavras
  const handleExport = async () => {
    if (wordCount === 0) {
      alert("Não há palavras para exportar neste vault.");
      return;
    }

    console.log("Frontend: Iniciando exportação...", {
      vaultId,
      vaultName,
      wordCount,
    });
    setIsExporting(true);

    try {
      console.log("Frontend: Chamando exportVaultWords...");

      // Teste simples primeiro
      console.log(
        "Frontend: Teste - vaultId é válido?",
        typeof vaultId === "number" && vaultId > 0
      );
      console.log("Frontend: Teste - vaultId valor:", vaultId);

      // Teste com timeout para ver se a função está sendo chamada
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout - função não respondeu")),
          10000
        )
      );

      const exportPromise = exportVaultWords(vaultId);
      const exportData = (await Promise.race([
        exportPromise,
        timeoutPromise,
      ])) as string;

      console.log("Frontend: Dados exportados recebidos:", exportData);

      // Criar e baixar o arquivo
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vaultName}_palavras_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Frontend: Arquivo baixado com sucesso");
      alert(`Exportação concluída! ${wordCount} palavra(s) exportada(s).`);
    } catch (error) {
      console.error("Frontend: Erro na exportação:", error);
      alert(
        `Erro ao exportar palavras: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Função para importar palavras
  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = await importWordsToVault(vaultId, text);

      setImportResult(result);

      if (result.success) {
        // Atualizar o cache para mostrar as novas palavras
        queryClient.invalidateQueries({ queryKey: ["vaults"] });
        alert(
          `Importação concluída! ${result.importedCount} palavra(s) importada(s).`
        );
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      alert(
        "Erro ao importar palavras. Verifique se o arquivo está no formato correto."
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Função para selecionar arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  // Função para abrir seletor de arquivo
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText size={16} className="mr-2" />
          Importar/Exportar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar/Exportar Palavras</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("export")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "export"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Download size={16} className="inline mr-2" />
              Exportar
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "import"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Upload size={16} className="inline mr-2" />
              Importar
            </button>
          </div>

          {/* Conteúdo da aba Exportar */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Download className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-medium text-blue-900">Exportar Palavras</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Exporte todas as {wordCount} palavra(s) do vault "{vaultName}"
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  O arquivo será salvo em formato JSON
                </p>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting || wordCount === 0}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Exportar Palavras
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Conteúdo da aba Importar */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Upload className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-medium text-green-900">
                  Importar Palavras
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Importe palavras de um arquivo JSON para o vault "{vaultName}"
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Palavras duplicadas serão ignoradas
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                onClick={openFileSelector}
                disabled={isImporting}
                className="w-full"
                variant="outline"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Selecionar Arquivo JSON
                  </>
                )}
              </Button>

              {/* Resultado da importação */}
              {importResult && (
                <Alert
                  className={
                    importResult.success
                      ? "border-green-200 bg-green-50"
                      : "border-yellow-200 bg-yellow-50"
                  }
                >
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">
                        {importResult.success
                          ? "Importação concluída!"
                          : "Importação parcialmente concluída"}
                      </p>
                      <p className="text-sm">
                        {importResult.importedCount} palavra(s) importada(s) com
                        sucesso
                      </p>
                      {importResult.errors.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">
                            Erros encontrados:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-yellow-700">
                            {importResult.errors
                              .slice(0, 3)
                              .map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            {importResult.errors.length > 3 && (
                              <li>
                                ... e mais {importResult.errors.length - 3}{" "}
                                erro(s)
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
