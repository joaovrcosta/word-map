const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash("123456", 12);

    // Criar usuário de teste
    const user = await prisma.user.create({
      data: {
        name: "Usuário Teste",
        email: "teste@teste.com",
        password: hashedPassword,
      },
    });

    console.log("Usuário de teste criado com sucesso:", {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });

    // Criar um vault de teste
    const vault = await prisma.vault.create({
      data: {
        name: "Meu Primeiro Vault",
        userId: user.id,
      },
    });

    console.log("Vault de teste criado:", {
      id: vault.id,
      name: vault.name,
      userId: vault.userId,
    });
  } catch (error) {
    console.error("Erro ao criar usuário de teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
