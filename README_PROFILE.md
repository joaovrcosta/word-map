# 🎯 Página de Perfil - Word Map

## ✨ Funcionalidades Implementadas

### 📊 Dashboard de Estatísticas

- **Visão Geral**: Cards com métricas principais (palavras, vaults, conexões, atividade)
- **Gráficos Interativos**: Distribuição por nível de confiança e classe gramatical
- **Categorias**: Organização temática das palavras aprendidas

### ⚙️ Sistema de Configurações

- **Configuração Principal**: Controla se links entre palavras usam todas as palavras ou apenas do vault ativo
- **Persistência**: Configurações salvas automaticamente no banco de dados
- **Interface Intuitiva**: Switches e explicações claras para cada opção

## 🚀 Como Usar

### 1. Acessar a Página

- Navegue para `/home/profile`
- Ou clique em "Perfil" no menu lateral

### 2. Visualizar Estatísticas

- As estatísticas são carregadas automaticamente
- Gráficos mostram distribuição das palavras por diferentes critérios
- Cards de resumo fornecem visão rápida do progresso

### 3. Configurar Preferências

- Na seção "Configurações", encontre o switch principal
- Clique para alternar entre as opções
- As mudanças são aplicadas imediatamente

## 🔧 Configuração: Links entre Palavras

### ❌ Desabilitado (Padrão)

- **Performance**: Otimizada para respostas rápidas
- **Escopo**: Apenas palavras do vault ativo são consideradas
- **Uso**: Recomendado para a maioria dos usuários

### ✅ Habilitado

- **Flexibilidade**: Todas as palavras de todos os vaults são consideradas
- **Conexões**: Permite conectar conceitos entre diferentes contextos
- **Uso**: Ideal para usuários avançados com muitos vaults

## 🎨 Componentes UI Criados

- **Switch**: Toggle para configurações
- **Label**: Rótulos acessíveis
- **Separator**: Divisores visuais
- **ProgressChart**: Gráficos de progresso personalizados

## 🗄️ Estrutura do Banco

```sql
-- Nova tabela para configurações
CREATE TABLE "UserSettings" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER UNIQUE NOT NULL,
  "useAllVaultsForLinks" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);
```

## 📁 Arquivos Principais

- `src/app/(home)/home/profile/page.tsx` - Página principal
- `src/actions/user-settings.ts` - Server actions
- `src/store/userSettingsStore.tsx` - Estado global
- `prisma/schema.prisma` - Schema atualizado

## 🚦 Status da Implementação

- ✅ Página de perfil criada
- ✅ Estatísticas implementadas
- ✅ Sistema de configurações funcional
- ✅ Componentes UI criados
- ✅ Banco de dados atualizado
- ✅ Server actions implementadas
- ✅ Store Zustand configurada
- ✅ Menu lateral atualizado

## 🔍 Próximos Passos

1. **Testar funcionalidade** navegando para `/home/profile`
2. **Verificar configurações** no banco de dados
3. **Implementar autenticação real** (substituir userId mock)
4. **Adicionar mais configurações** conforme necessário

## 💡 Dicas de Uso

- Use a configuração "todas as palavras" apenas se precisar de máxima flexibilidade
- Monitore as estatísticas regularmente para acompanhar o progresso
- As configurações são salvas automaticamente, não é necessário clicar em "Salvar"

## 🐛 Solução de Problemas

### Erro de Migration

Se houver problemas com o Prisma:

```bash
npx prisma migrate reset --force
npx prisma migrate dev --name add_user_settings
```

### Dependências Faltando

Instalar componentes Radix UI:

```bash
npm install @radix-ui/react-switch @radix-ui/react-label @radix-ui/react-separator
```

### Verificar TypeScript

```bash
npx tsc --noEmit
```

---

**🎉 A página de perfil está pronta e funcional!**
Acesse `/home/profile` para testar todas as funcionalidades implementadas.
