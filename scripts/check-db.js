const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("🔍 Verificando banco de dados...\n");

    // Verificar usuários
    const users = await prisma.user.findMany();
    console.log(`👥 Usuários encontrados: ${users.length}`);
    users.forEach((user) => {
      console.log(
        `  - ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}`
      );
    });

    // Verificar vaults
    const vaults = await prisma.vault.findMany();
    console.log(`\n📦 Vaults encontrados: ${vaults.length}`);
    vaults.forEach((vault) => {
      console.log(
        `  - ID: ${vault.id}, Nome: ${vault.name}, UserID: ${vault.userId}`
      );
    });

    // Verificar palavras
    const words = await prisma.word.findMany();
    console.log(`\n📚 Palavras encontradas: ${words.length}`);

    // Verificar configurações de usuário
    const userSettings = await prisma.userSettings.findMany();
    console.log(`\n⚙️ Configurações de usuário: ${userSettings.length}`);
    userSettings.forEach((setting) => {
      console.log(
        `  - UserID: ${setting.userId}, UseAllVaults: ${setting.useAllVaultsForLinks}`
      );
    });

    // Tentar criar um vault de teste
    console.log("\n🧪 Testando criação de vault...");
    try {
      const testVault = await prisma.vault.create({
        data: {
          name: "Vault de Teste",
          userId: 1,
        },
      });
      console.log("✅ Vault criado com sucesso:", testVault.name);

      // Deletar o vault de teste
      await prisma.vault.delete({
        where: { id: testVault.id },
      });
      console.log("🗑️ Vault de teste removido");
    } catch (error) {
      console.error("❌ Erro ao criar vault de teste:", error.message);
      console.error("Detalhes:", error);
    }
  } catch (error) {
    console.error("❌ Erro ao verificar banco:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
