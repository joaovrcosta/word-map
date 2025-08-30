const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log("👤 Criando usuário de teste...\n");

    // Verificar se já existe um usuário
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      console.log("✅ Usuário já existe:", existingUser.name);
      return existingUser;
    }

    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash("123456", 10);

    const testUser = await prisma.user.create({
      data: {
        name: "Usuário Teste",
        email: "teste@example.com",
        password: hashedPassword,
      },
    });

    console.log("✅ Usuário criado com sucesso:");
    console.log(`  - ID: ${testUser.id}`);
    console.log(`  - Nome: ${testUser.name}`);
    console.log(`  - Email: ${testUser.email}`);

    return testUser;
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error.message);
    console.error("Detalhes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
