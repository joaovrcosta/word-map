# 📥📤 Funcionalidades de Importação e Exportação de Palavras

## 🎯 Visão Geral

Este projeto agora inclui funcionalidades completas para **importar** e **exportar** palavras de seus vaults de estudo de idiomas. Isso permite:

- ✅ **Backup** de suas palavras
- ✅ **Migração** entre dispositivos
- ✅ **Compartilhamento** de vocabulários
- ✅ **Integração** com outras ferramentas

## 🚀 Como Usar

### 📤 Exportar Palavras

1. **Acesse** a página principal (`/home`)
2. **Selecione** um vault no dropdown
3. **Clique** no botão "Importar/Exportar"
4. **Escolha** a aba "Exportar"
5. **Clique** em "Exportar Palavras"
6. **Salve** o arquivo JSON que será baixado

O arquivo exportado incluirá:

- Nome do vault
- Data da exportação
- Total de palavras
- Todas as palavras com seus dados completos

### 📥 Importar Palavras

1. **Acesse** a página principal (`/home`)
2. **Selecione** um vault de destino
3. **Clique** no botão "Importar/Exportar"
4. **Escolha** a aba "Importar"
5. **Clique** em "Selecionar Arquivo JSON"
6. **Escolha** um arquivo JSON válido
7. **Aguarde** a importação ser processada

## 📋 Formato do Arquivo JSON

O arquivo deve seguir esta estrutura:

```json
{
  "vaultName": "Nome do Vault",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "totalWords": 3,
  "words": [
    {
      "name": "palavra",
      "grammaticalClass": "substantivo",
      "category": "categoria",
      "translations": ["tradução1", "tradução2"],
      "confidence": 2,
      "isSaved": false,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

### 📝 Campos Obrigatórios

- `name`: Nome da palavra
- `grammaticalClass`: Classe gramatical

### 📝 Campos Opcionais

- `category`: Categoria da palavra
- `translations`: Array de traduções
- `confidence`: Grau de confiança (1-4)
- `isSaved`: Se a palavra está salva
- `createdAt` e `updatedAt`: Timestamps

## ⚠️ Regras de Importação

- **Palavras duplicadas** são automaticamente ignoradas
- **Validação** de dados obrigatórios
- **Tratamento de erros** com feedback detalhado
- **Cache atualizado** automaticamente após importação

## 🔧 Arquivos Técnicos

### Actions (Backend)

- `exportVaultWords()`: Exporta palavras de um vault
- `importWordsToVault()`: Importa palavras para um vault

### Componente (Frontend)

- `ImportExportWords`: Interface de usuário com tabs

### Localização

- `src/actions/actions.ts` - Funções de backend
- `src/components/import-export-words.tsx` - Componente de UI

## 🧪 Testando

1. **Exporte** um vault existente
2. **Modifique** o arquivo JSON se desejar
3. **Importe** em outro vault ou mesmo vault
4. **Verifique** se as palavras foram importadas corretamente

## 📱 Interface do Usuário

- **Design responsivo** para mobile e desktop
- **Feedback visual** durante operações
- **Tratamento de erros** com mensagens claras
- **Integração** com o sistema de cache existente

## 🚀 Próximas Melhorias

- [ ] Suporte a formato CSV
- [ ] Importação em lote de múltiplos arquivos
- [ ] Sincronização com serviços externos
- [ ] Histórico de importações/exportações
- [ ] Templates de vocabulário pré-definidos

---

**✨ Funcionalidade implementada com sucesso!**

Agora você pode facilmente fazer backup e compartilhar seus vocabulários de estudo de idiomas.
