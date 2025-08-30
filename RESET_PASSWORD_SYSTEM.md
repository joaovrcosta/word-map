# Sistema de Reset de Senha - Word Map

## Visão Geral

O sistema de reset de senha permite que usuários recuperem acesso à sua conta caso esqueçam a senha. O processo é seguro e utiliza códigos de verificação enviados por email.

## Funcionalidades

### 1. Solicitação de Reset

- Usuário informa seu email
- Sistema verifica se o email existe na base de dados
- Gera código de 6 dígitos único
- Envia email com o código de verificação
- Código expira em 15 minutos

### 2. Verificação do Código

- Usuário digita o código recebido por email
- Sistema valida o código e verifica se não expirou
- Se válido, permite prosseguir para definição da nova senha

### 3. Definição de Nova Senha

- Usuário define nova senha (mínimo 6 caracteres)
- Confirma a nova senha
- Sistema atualiza a senha no banco de dados
- Limpa o código de reset usado

## Arquivos do Sistema

### Actions (`src/actions/auth.ts`)

- `generateResetCode(email)`: Gera e envia código de reset
- `verifyResetCode(email, code)`: Verifica se o código é válido
- `resetPassword(email, code, newPassword)`: Altera a senha

### Página (`src/app/(home)/reset-password/page.tsx`)

- Interface em 4 etapas: Email → Código → Nova Senha → Sucesso
- Validações de formulário
- Tratamento de erros e sucesso
- Design responsivo e acessível

### Sistema de Email (`src/lib/email.ts`)

- Configuração para envio de emails
- Templates HTML e texto para emails de reset
- Simulação de envio para desenvolvimento

## Fluxo de Uso

```
1. Usuário acessa /reset-password
2. Digita email → Clica "Enviar Código"
3. Recebe email com código de 6 dígitos
4. Digita código → Clica "Verificar Código"
5. Define nova senha → Clica "Alterar Senha"
6. Recebe confirmação de sucesso
7. Redirecionado para login
```

## Segurança

- **Códigos únicos**: Cada reset gera código diferente
- **Expiração**: Códigos expiram em 15 minutos
- **Validação**: Verificação de email existente
- **Hash de senha**: Nova senha é criptografada
- **Limpeza**: Códigos são removidos após uso

## Configuração de Produção

### Email Real

Para usar em produção, substituir a função `sendEmail` em `src/lib/email.ts`:

```typescript
// Exemplo com SendGrid
import sgMail from "@sendgrid/mail";

export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    await sgMail.send({
      from: config.from,
      to: config.to,
      subject: config.subject,
      html: config.html,
      text: config.text,
    });

    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}
```

### Variáveis de Ambiente

```env
# SendGrid
SENDGRID_API_KEY=sua_chave_api

# Ou AWS SES
AWS_SES_ACCESS_KEY=sua_access_key
AWS_SES_SECRET_KEY=sua_secret_key
AWS_SES_REGION=us-east-1

# Ou Resend
RESEND_API_KEY=sua_chave_api
```

## Banco de Dados

### Schema do Usuário

```prisma
model User {
  id               Int           @id @default(autoincrement())
  name             String
  email            String        @unique
  password         String
  resetCode        String?       // Código de reset
  resetCodeExpires DateTime?     // Expiração do código
  // ... outros campos
}
```

### Migração

```bash
npx prisma migrate dev --name add_reset_password_fields
```

## Testes

### Desenvolvimento

- Códigos são logados no console
- Emails são simulados
- Funcionalidade completa para testes

### Produção

- Códigos enviados por email real
- Logs de envio para monitoramento
- Métricas de entrega e abertura

## Melhorias Futuras

1. **Rate Limiting**: Limitar tentativas de reset
2. **Auditoria**: Log de todas as tentativas de reset
3. **Notificações**: Alertar usuário sobre reset de senha
4. **Backup**: Métodos alternativos de verificação
5. **Analytics**: Métricas de uso do sistema

## Troubleshooting

### Problemas Comuns

1. **Email não recebido**

   - Verificar spam/lixo eletrônico
   - Verificar configuração de email
   - Verificar logs do servidor

2. **Código inválido**

   - Verificar se não expirou
   - Verificar se foi digitado corretamente
   - Solicitar novo código se necessário

3. **Erro de validação**
   - Verificar formato do email
   - Verificar requisitos da senha
   - Verificar confirmação de senha

### Logs Úteis

```bash
# Verificar logs de email
tail -f logs/email.log

# Verificar erros de validação
tail -f logs/auth.log

# Verificar tentativas de reset
tail -f logs/security.log
```

## Suporte

Para problemas ou dúvidas sobre o sistema de reset de senha:

- Verificar logs do sistema
- Consultar documentação da API de email
- Contatar equipe de desenvolvimento

