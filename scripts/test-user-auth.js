const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testUserAuth() {
  try {
    console.log("🔍 Testando autenticação de usuário...\n");

    // 1. Verificar se há usuários no banco
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`📊 Total de usuários encontrados: ${users.length}`);

    if (users.length === 0) {
      console.log("❌ Nenhum usuário encontrado no banco de dados");
      console.log(
        "💡 Execute o script create-test-user.js para criar um usuário de teste"
      );
      return;
    }

    // 2. Mostrar usuários
    console.log("\n👥 Usuários encontrados:");
    users.forEach((user, index) => {
      console.log(
        `  ${index + 1}. ID: ${user.id}, Nome: ${user.name}, Email: ${
          user.email
        }`
      );
    });

    // 3. Verificar configurações de usuário
    console.log("\n⚙️ Verificando configurações de usuário...");
    const userSettings = await prisma.userSettings.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(
      `📋 Total de configurações encontradas: ${userSettings.length}`
    );

    if (userSettings.length === 0) {
      console.log("⚠️ Nenhuma configuração de usuário encontrada");
      console.log(
        "💡 As configurações serão criadas automaticamente quando o usuário acessar o perfil"
      );
    } else {
      userSettings.forEach((setting, index) => {
        console.log(
          `  ${index + 1}. Usuário: ${setting.user.name} (${
            setting.user.email
          })`
        );
        console.log(
          `     - Usar todos os vaults para links: ${setting.useAllVaultsForLinks}`
        );
        console.log(
          `     - Criado em: ${setting.createdAt.toLocaleString("pt-BR")}`
        );
      });
    }

    // 4. Verificar vaults
    console.log("\n🗄️ Verificando vaults...");
    const vaults = await prisma.vault.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            words: true,
          },
        },
      },
    });

    console.log(`📦 Total de vaults encontrados: ${vaults.length}`);

    if (vaults.length === 0) {
      console.log("⚠️ Nenhum vault encontrado");
      console.log(
        "💡 Crie um vault através da interface para começar a adicionar palavras"
      );
    } else {
      vaults.forEach((vault, index) => {
        console.log(`  ${index + 1}. Nome: ${vault.name}`);
        console.log(`     - Usuário: ${vault.user.name} (${vault.user.email})`);
        console.log(`     - Palavras: ${vault._count.words}`);
        console.log(
          `     - Criado em: ${vault.createdAt.toLocaleString("pt-BR")}`
        );
      });
    }

    // 5. Verificar palavras
    console.log("\n📝 Verificando palavras...");
    const words = await prisma.word.findMany({
      include: {
        vault: {
          select: {
            name: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log(`📚 Total de palavras encontradas: ${words.length}`);

    if (words.length === 0) {
      console.log("⚠️ Nenhuma palavra encontrada");
      console.log(
        "💡 Adicione palavras através da interface para começar a usar o sistema"
      );
    } else {
      // Mostrar algumas palavras como exemplo
      const sampleWords = words.slice(0, 5);
      console.log("\n📖 Exemplos de palavras:");
      sampleWords.forEach((word, index) => {
        console.log(
          `  ${index + 1}. "${word.name}" (${word.grammaticalClass})`
        );
        console.log(`     - Vault: ${word.vault.name}`);
        console.log(`     - Usuário: ${word.vault.user.name}`);
        console.log(`     - Traduções: ${word.translations.join(", ")}`);
        console.log(`     - Confiança: ${word.confidence}/4`);
      });

      if (words.length > 5) {
        console.log(`  ... e mais ${words.length - 5} palavras`);
      }
    }

    console.log("\n✅ Teste de autenticação concluído com sucesso!");
    console.log("\n💡 Próximos passos:");
    console.log("   1. Faça login com um dos usuários listados acima");
    console.log(
      "   2. Acesse a página de perfil para verificar as estatísticas"
    );
    console.log("   3. Se houver problemas, verifique os logs do servidor");
  } catch (error) {
    console.error("❌ Erro durante o teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o teste
testUserAuth();

