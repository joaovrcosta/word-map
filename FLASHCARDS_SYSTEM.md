# Sistema de Flashcards - WordMap

## Visão Geral

O sistema de flashcards do WordMap é inspirado no Anki e implementa um algoritmo de repetição espaçada para otimizar o aprendizado de vocabulário em inglês. O sistema foca em apresentar palavras com base no nível de dificuldade do usuário, priorizando palavras que precisam de mais prática.

## Funcionalidades Principais

### 🎯 **Repetição Espaçada Inteligente**

- Palavras difíceis (nível 1-2) aparecem com mais frequência
- Palavras conhecidas (nível 3-4) aparecem com menos frequência
- Sistema adaptativo baseado no feedback do usuário

### 📊 **Sistema de Confiança (4 Níveis)**

1. **Nível 1 - Não lembro** (Vermelho): Revisão diária
2. **Nível 2 - Difícil** (Laranja): Revisão frequente
3. **Nível 3 - Bom** (Verde): Revisão a cada 3 dias
4. **Nível 4 - Fácil** (Azul): Revisão semanal

### 🏆 **Sistema de Gamificação**

- Conquistas baseadas no número de palavras estudadas
- Badges para diferentes marcos de progresso
- Estatísticas de performance (palavras/minuto, taxa de conclusão)
- Resumo detalhado ao final de cada sessão

## Estrutura dos Arquivos

### Server Actions

- **`src/actions/flashcards.ts`**: Ações do servidor para flashcards
  - `getFlashcardWords()`: Busca palavras de um vault específico
  - `getVaultForFlashcards()`: Busca informações do vault
  - `updateWordProgress()`: Atualiza progresso da palavra
  - `createFlashcardSession()`: Cria nova sessão de estudo
  - `filterWordsForReview()`: Filtra palavras para revisão

### Componentes

- **`src/components/flashcards/FlashcardDeck.tsx`**: Componente principal que gerencia o deck
- **`src/components/flashcards/Flashcard.tsx`**: Componente individual do flashcard
- **`src/components/flashcards/SessionSummary.tsx`**: Resumo da sessão concluída
- **`src/components/flashcards/index.ts`**: Exportações dos componentes

### Páginas

- **`src/app/(home)/home/flashcards/page.tsx`**: Página principal de seleção de vaults
- **`src/app/(home)/home/vault/[id]/flashcards/page.tsx`**: Página de flashcards de um vault específico
- **`src/app/(home)/home/vault/[id]/page.tsx`**: Página de detalhes do vault com acesso aos flashcards

## Como Usar

### 1. **Acessar Flashcards**

- Via sidebar: `Flashcards` → Selecionar vault
- Via página de vaults: Botão roxo do cérebro em cada vault
- Via página individual do vault: Botão "Iniciar Flashcards"

### 2. **Estudar com Flashcards**

- Clique em "Iniciar Sessão de Estudo"
- Veja a palavra em inglês
- Tente lembrar a tradução
- Clique em "Mostrar Tradução"
- Avalie seu conhecimento (1-4)
- Confirme para ir para a próxima palavra

### 3. **Sistema de Avaliação**

- **Não lembro (1)**: Palavra muito difícil, aparecerá frequentemente
- **Difícil (2)**: Palavra com dificuldade, revisão regular
- **Bom (3)**: Palavra conhecida, revisão espaçada
- **Fácil (4)**: Palavra dominada, revisão ocasional

## Algoritmo de Repetição Espaçada

### Filtro de Palavras

```typescript
// Palavras com confiança baixa sempre aparecem
if (word.confidence <= 2) return true;

// Palavras de nível 3: 50% de chance de aparecer
if (word.confidence === 3) return Math.random() < 0.5;

// Palavras de nível 4: 25% de chance de aparecer
if (word.confidence === 4) return Math.random() < 0.25;
```

### Cálculo de Próxima Revisão

- **Nível 1-2**: Revisão frequente (1-2 dias)
- **Nível 3**: Revisão moderada (3-5 dias)
- **Nível 4**: Revisão espaçada (7+ dias)

## Estatísticas e Gamificação

### Métricas de Sessão

- **Palavras Estudadas**: Total de palavras revisadas
- **Tempo de Sessão**: Duração em minutos
- **Taxa de Conclusão**: Porcentagem de palavras completadas
- **Palavras por Minuto**: Velocidade de estudo

### Conquistas Disponíveis

- **Estudioso**: 10+ palavras em uma sessão
- **Dedicado**: 25+ palavras em uma sessão
- **Mestre**: 50+ palavras em uma sessão
- **Eficiente**: Sessão rápida (≤30 min) com 10+ palavras
- **Perfeito**: 100% de conclusão da sessão

## Navegação e UX

### Funcionalidades de Navegação

- **Navegação por teclado**: Setas para navegar entre palavras
- **Progresso visual**: Barra de progresso da sessão
- **Pausar sessão**: Possibilidade de pausar e retomar
- **Estatísticas em tempo real**: Acompanhamento do progresso

### Design Responsivo

- **Mobile-first**: Interface otimizada para dispositivos móveis
- **Cards interativos**: Feedback visual imediato
- **Cores semânticas**: Sistema de cores consistente
- **Animações suaves**: Transições fluidas entre estados

## Integração com o Sistema

### Sidebar

- Link direto para flashcards no menu lateral
- Ícone de cérebro para identificação visual

### Vaults

- Botão de flashcards em cada vault na listagem
- Página dedicada para cada vault com acesso direto
- Estatísticas de palavras para revisão

### Persistência de Dados

- Progresso salvo automaticamente
- Atualização de confiança das palavras
- Histórico de sessões (futuro)

## Benefícios do Sistema

### 🧠 **Aprendizado Eficiente**

- Foco nas palavras que precisam de mais atenção
- Redução do tempo de estudo através da priorização inteligente
- Reforço de palavras já conhecidas sem sobrecarga

### 📈 **Progresso Mensurável**

- Estatísticas detalhadas de performance
- Acompanhamento de evolução ao longo do tempo
- Feedback imediato sobre o aprendizado

### 🎮 **Engajamento Gamificado**

- Sistema de conquistas e badges
- Metas de estudo claras
- Feedback positivo e motivacional

### 🔄 **Flexibilidade de Uso**

- Sessões de duração variável
- Possibilidade de pausar e retomar
- Acesso a diferentes vaults de forma independente

## Próximas Melhorias

### Funcionalidades Futuras

- [ ] Histórico detalhado de sessões
- [ ] Estatísticas de longo prazo
- [ ] Configurações de algoritmo personalizáveis
- [ ] Modo de estudo por categoria
- [ ] Exportação de progresso
- [ ] Sincronização entre dispositivos
- [ ] Lembretes de estudo
- [ ] Modo de estudo colaborativo

### Otimizações Técnicas

- [ ] Cache de sessões
- [ ] Preload de próximas palavras
- [ ] Algoritmo de repetição espaçada mais sofisticado
- [ ] Análise de curva de esquecimento
- [ ] Integração com analytics de aprendizado

---

_Sistema implementado com Next.js, TypeScript, Prisma e Shadcn UI_

