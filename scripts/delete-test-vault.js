const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deleteTestVault() {
  try {
    console.log("Procurando vault de teste...");

    // Buscar o vault de teste
    const vault = await prisma.vault.findFirst({
      where: {
        name: "Meu Primeiro Vault",
      },
      include: {
        words: true,
      },
    });

    if (!vault) {
      console.log("Vault de teste não encontrado");
      return;
    }

    console.log("Vault encontrado:", {
      id: vault.id,
      name: vault.name,
      palavras: vault.words.length,
    });

    // Deletar as palavras primeiro
    if (vault.words.length > 0) {
      console.log("Deletando palavras associadas...");
      for (const word of vault.words) {
        await prisma.word.delete({
          where: {
            id: word.id,
          },
        });
        console.log(`Palavra "${word.name}" deletada`);
      }
    }

    // Agora deletar o vault
    await prisma.vault.delete({
      where: {
        id: vault.id,
      },
    });

    console.log("✅ Vault de teste deletado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao deletar vault de teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestVault();
