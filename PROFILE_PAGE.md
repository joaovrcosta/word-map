# Página de Perfil - Word Map

## Visão Geral

A página de perfil foi criada para fornecer aos usuários uma visão completa de suas estatísticas de aprendizado e permitir a configuração de preferências do sistema.

## Funcionalidades Implementadas

### 📊 Estatísticas Visuais

1. **Cards de Resumo**

   - Total de palavras aprendidas
   - Número de vaults criados
   - Total de conexões entre palavras
   - Atividade recente (últimos 30 dias)

2. **Gráficos e Visualizações**
   - **Nível de Confiança**: Distribuição das palavras por nível de aprendizado (1-4)
   - **Classe Gramatical**: Contagem de palavras por tipo (substantivo, verbo, etc.)
   - **Categorias**: Palavras organizadas por categoria temática

### ⚙️ Configurações do Usuário

#### Configuração Principal: Links entre Palavras

**Opção**: "Usar todas as palavras para links"

- **Desabilitado (padrão)**: Ao criar links entre palavras, apenas as palavras do vault ativo são consideradas
- **Habilitado**: Todas as palavras de todos os vaults são consideradas para criar links

**Como funciona:**

- Quando desabilitado: Performance otimizada, sugestões mais focadas
- Quando habilitado: Maior flexibilidade para conectar conceitos entre diferentes contextos

### 🎨 Interface do Usuário

- Design responsivo com grid adaptativo
- Cards organizados logicamente
- Gráficos de progresso visuais
- Switches intuitivos para configurações
- Loading states e feedback visual

## Estrutura Técnica

### Arquivos Criados/Modificados

1. **`src/app/(home)/home/profile/page.tsx`** - Página principal do perfil
2. **`src/actions/user-settings.ts`** - Server actions para configurações e estatísticas
3. **`src/store/userSettingsStore.tsx`** - Store Zustand para estado das configurações
4. **`src/components/ui/switch.tsx`** - Componente Switch
5. **`src/components/ui/label.tsx`** - Componente Label
6. **`src/components/ui/separator.tsx`** - Componente Separator
7. **`src/components/ui/progress-chart.tsx`** - Componente de gráfico de progresso
8. **`prisma/schema.prisma`** - Schema atualizado com modelo UserSettings

### Banco de Dados

**Nova Tabela: `UserSettings`**

```sql
model UserSettings {
  id                    Int      @id @default(autoincrement())
  userId                Int      @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  useAllVaultsForLinks  Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### Server Actions

- **`getUserSettings(userId)`**: Busca configurações do usuário
- **`upsertUserSettings(userId, useAllVaultsForLinks)`**: Cria/atualiza configurações
- **`getUserStats(userId)`**: Busca estatísticas completas do usuário

## Como Usar

### Acessando a Página

1. Navegue para `/home/profile` na aplicação
2. A página está acessível através do menu lateral (ícone de usuário)

### Configurando Preferências

1. Na seção "Configurações", encontre o switch "Usar todas as palavras para links"
2. Clique no switch para alternar entre as opções
3. As configurações são salvas automaticamente no banco de dados

### Visualizando Estatísticas

- As estatísticas são carregadas automaticamente
- Os gráficos mostram dados em tempo real
- As informações são organizadas por categoria para fácil compreensão

## Benefícios de Performance

### Configuração Desabilitada (Recomendada para a maioria dos usuários)

- Queries mais rápidas ao buscar palavras para links
- Menor uso de memória
- Resposta mais rápida da interface

### Configuração Habilitada (Para usuários avançados)

- Maior flexibilidade na criação de conexões
- Possibilidade de conectar conceitos entre diferentes contextos
- Útil para usuários com muitos vaults e palavras

## Próximos Passos Sugeridos

1. **Implementar autenticação real** para substituir o userId mock
2. **Adicionar mais configurações** como:
   - Tema da interface (claro/escuro)
   - Idioma preferido
   - Notificações de prática
3. **Expandir estatísticas** com:
   - Gráficos de progresso ao longo do tempo
   - Comparação com metas de aprendizado
   - Relatórios de performance
4. **Otimizações de performance**:
   - Cache de estatísticas
   - Lazy loading de dados
   - Paginação para usuários com muitas palavras

## Considerações de Segurança

- Todas as actions são server-side
- Validação de userId para evitar acesso não autorizado
- Revalidação automática de cache após mudanças
- Tratamento de erros robusto

## Suporte

Para dúvidas ou problemas com a implementação, consulte:

- Logs do console para erros
- Verificação do banco de dados para configurações
- Validação das migrations do Prisma
