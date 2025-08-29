# 🧪 Teste do Sistema de Login

## ✅ Usuário de Teste Criado

**Email:** `teste@teste.com`  
**Senha:** `123456`

## 🔍 Como Testar

1. **Acesse a aplicação** em `http://localhost:3001` (ou a porta que aparecer no terminal)

2. **Vá para `/login`** ou clique em "Entrar"

3. **Use as credenciais de teste:**

   - Email: `teste@teste.com`
   - Senha: `123456`

4. **Clique em "Entrar"**

## 📊 O que Deve Acontecer

- ✅ Login bem-sucedido
- ✅ Redirecionamento para `/home`
- ✅ Cookie `auth-token` criado
- ✅ Acesso às rotas protegidas

## 🐛 Se Não Funcionar

### Verifique o Console do Navegador

- Abra as Ferramentas do Desenvolvedor (F12)
- Vá para a aba "Console"
- Procure por mensagens de erro ou logs

### Verifique o Terminal

- O servidor deve mostrar logs do middleware e das actions
- Procure por mensagens de erro

### Possíveis Problemas

1. **Banco de dados não conectado**
2. **Variáveis de ambiente não configuradas**
3. **Erro no JWT_SECRET**
4. **Problema com cookies**

## 🔧 Solução de Problemas

### 1. Verificar Banco de Dados

```bash
npx prisma studio
```

### 2. Verificar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="sua_url_do_banco"
JWT_SECRET="sua_chave_secreta"
```

### 3. Recriar Usuário de Teste

```bash
node scripts/create-test-user.js
```

## 📝 Logs Esperados

No console do navegador:

```
Tentando fazer login com: {email: "teste@teste.com", password: "123456"}
Login bem-sucedido: {id: 2, name: "Usuário Teste", ...}
```

No terminal do servidor:

```
Middleware executando para: /home
Token encontrado: true
Token válido, payload: {userId: 2, email: "teste@teste.com", ...}
```

## 🎯 Próximos Passos

Após o login funcionar:

1. Teste a criação de vaults
2. Teste a adição de palavras
3. Teste o logout
4. Teste o registro de novos usuários
