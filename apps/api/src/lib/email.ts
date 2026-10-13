// Configuração para envio de emails
// Em produção, usar serviços como SendGrid, AWS SES, ou Resend

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    // Em produção, implementar envio real de email
    // Por enquanto, apenas log para desenvolvimento

    console.log("=== EMAIL ENVIADO ===");
    console.log("De:", config.from);
    console.log("Para:", config.to);
    console.log("Assunto:", config.subject);
    console.log("HTML:", config.html);
    console.log("=====================");

    // Simular delay de envio
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}

export function generateResetEmailHtml(email: string, code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset de Senha - Word Map</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Reset de Senha</h1>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Olá! Você solicitou um reset de senha para sua conta no Word Map.
        </p>
        
        <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="color: #374151; margin-bottom: 15px;">Seu Código de Verificação</h2>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; font-family: monospace;">
            ${code}
          </div>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
          Este código expira em 15 minutos por questões de segurança.
        </p>
        
        <p style="font-size: 14px; color: #6b7280;">
          Se você não solicitou este reset, ignore este email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #9ca3af;">
          Word Map - Sistema de Aprendizado de Idiomas
        </p>
      </div>
    </body>
    </html>
  `;
}

export function generateResetEmailText(email: string, code: string): string {
  return `
Reset de Senha - Word Map

Olá! Você solicitou um reset de senha para sua conta no Word Map.

Seu Código de Verificação: ${code}

Este código expira em 15 minutos por questões de segurança.

Se você não solicitou este reset, ignore este email.

---
Word Map - Sistema de Aprendizado de Idiomas
  `;
}
