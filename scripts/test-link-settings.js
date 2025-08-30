const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLinkSettings() {
  try {
    console.log('🧪 Testando configurações de links...\n');

    // 1. Verificar usuário existente
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }
    console.log(`✅ Usuário encontrado: ${user.name} (ID: ${user.id})`);

    // 2. Verificar/criar configurações
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    });

    if (!userSettings) {
      console.log('📝 Criando configurações padrão...');
      userSettings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          useAllVaultsForLinks: false // Padrão: apenas vault atual
        }
      });
      console.log('✅ Configurações criadas');
    } else {
      console.log(`⚙️ Configurações encontradas: useAllVaultsForLinks = ${userSettings.useAllVaultsForLinks}`);
    }

    // 3. Verificar vaults existentes
    const vaults = await prisma.vault.findMany({
      where: { userId: user.id }
    });
    console.log(`\n📦 Vaults encontrados: ${vaults.length}`);

    if (vaults.length === 0) {
      console.log('📝 Criando vaults de teste...');
      
      const vault1 = await prisma.vault.create({
        data: {
          name: 'Vault 1 - Teste',
          userId: user.id
        }
      });

      const vault2 = await prisma.vault.create({
        data: {
          name: 'Vault 2 - Teste',
          userId: user.id
        }
      });

      console.log('✅ Vaults criados');
      vaults.push(vault1, vault2);
    }

    vaults.forEach(vault => {
      console.log(`  - ${vault.name} (ID: ${vault.id})`);
    });

    // 4. Verificar palavras existentes
    let words = await prisma.word.findMany({
      where: { vault: { userId: user.id } }
    });
    console.log(`\n📚 Palavras encontradas: ${words.length}`);

    if (words.length === 0) {
      console.log('📝 Criando palavras de teste...');
      
      // Palavras no Vault 1
      const word1 = await prisma.word.create({
        data: {
          name: 'casa',
          grammaticalClass: 'substantivo',
          category: 'habitação',
          translations: ['house', 'home'],
          confidence: 3,
          isSaved: true,
          vaultId: vaults[0].id
        }
      });

      const word2 = await prisma.word.create({
        data: {
          name: 'carro',
          grammaticalClass: 'substantivo',
          category: 'transporte',
          translations: ['car'],
          confidence: 2,
          isSaved: true,
          vaultId: vaults[0].id
        }
      });

      // Palavras no Vault 2
      const word3 = await prisma.word.create({
        data: {
          name: 'livro',
          grammaticalClass: 'substantivo',
          category: 'educação',
          translations: ['book'],
          confidence: 4,
          isSaved: true,
          vaultId: vaults[1].id
        }
      });

      const word4 = await prisma.word.create({
        data: {
          name: 'computador',
          grammaticalClass: 'substantivo',
          category: 'tecnologia',
          translations: ['computer'],
          confidence: 1,
          isSaved: true,
          vaultId: vaults[1].id
        }
      });

      words = [word1, word2, word3, word4];
      console.log('✅ Palavras criadas');
    }

    words.forEach(word => {
      const vault = vaults.find(v => v.id === word.vaultId);
      console.log(`  - ${word.name} (${word.grammaticalClass}) - Vault: ${vault?.name}`);
    });

    // 5. Testar configuração atual
    console.log(`\n🔧 Testando configuração atual: useAllVaultsForLinks = ${userSettings.useAllVaultsForLinks}`);
    
    if (!userSettings.useAllVaultsForLinks) {
      console.log('📋 Com configuração DESABILITADA:');
      console.log('   - Apenas palavras do vault atual devem aparecer para links');
      console.log('   - Palavras de outros vaults devem ser filtradas');
    } else {
      console.log('📋 Com configuração HABILITADA:');
      console.log('   - Todas as palavras de todos os vaults devem aparecer para links');
    }

    // 6. Simular busca de palavras linkáveis (como na função getLinkableWords)
    console.log('\n🔍 Simulando busca de palavras linkáveis...');
    
    const currentWord = words[0]; // Usar a primeira palavra como exemplo
    console.log(`Palavra atual: "${currentWord.name}" (Vault: ${vaults.find(v => v.id === currentWord.vaultId)?.name})`);

    // Simular filtro baseado na configuração
    let filteredWords = words.filter(w => w.id !== currentWord.id);
    
    if (!userSettings.useAllVaultsForLinks) {
      // Filtrar apenas palavras do vault atual
      filteredWords = filteredWords.filter(w => w.vaultId === currentWord.vaultId);
      console.log('✅ Filtro aplicado: apenas palavras do vault atual');
    } else {
      console.log('✅ Filtro aplicado: todas as palavras de todos os vaults');
    }

    console.log(`\n📝 Palavras disponíveis para link (após filtro):`);
    filteredWords.forEach(word => {
      const vault = vaults.find(v => v.id === word.vaultId);
      console.log(`  - ${word.name} (${word.grammaticalClass}) - Vault: ${vault?.name}`);
    });

    console.log(`\n📊 Resumo:`);
    console.log(`  - Total de palavras: ${words.length}`);
    console.log(`  - Palavras disponíveis para link: ${filteredWords.length}`);
    console.log(`  - Configuração ativa: ${userSettings.useAllVaultsForLinks ? 'Todos os vaults' : 'Apenas vault atual'}`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLinkSettings();
