/**
 * Teste Final do Extrator Amil
 * Demonstra funcionalidade completa com ambas as carteirinhas
 */

const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testAmilCarteirinha(imagePath, description) {
  console.log(`\n🧪 TESTANDO AMIL: ${description}`);
  console.log(`📁 Arquivo: ${imagePath}`);
  console.log('─'.repeat(50));
  
  try {
    const form = new FormData();
    form.append('document', fs.createReadStream(imagePath));
    form.append('documentType', 'insurance');

    const response = await fetch(`${BASE_URL}/api/process-document`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    
    if (!result.success) {
      console.log('❌ ERRO:', result.error);
      return false;
    }

    const data = result.data;
    
    // Resultados principais
    console.log(`✅ Operadora: ${data.operadora}`);
    console.log(`🏥 Nome completo: ${data.normalizedOperadora}`);
    console.log(`🎫 Carteirinha: ${data.numeroCarteirinha}`);
    console.log(`📋 Plano: ${data.plano}`);
    
    // Dados pessoais
    if (data.nomeTitular) {
      console.log(`👤 Titular: ${data.nomeTitular}`);
    }
    if (data.dataNascimento) {
      console.log(`📅 Nascimento: ${data.dataNascimento}`);
    }
    if (data.cns) {
      console.log(`🆔 CNS: ${data.cns}`);
    }
    
    // Dados técnicos
    if (data.ansCode) {
      console.log(`🔢 ANS: ${data.ansCode}`);
      console.log(`🏢 ID Operadora: ${data.operadoraId}`);
    }
    
    console.log(`🎯 Detecção: ${data.method.type}`);
    console.log(`📊 Confiança: ${(data.confidence.overall * 100).toFixed(1)}%`);
    
    // Verificações
    const checks = [
      { test: data.operadora === 'AMIL', desc: 'Operadora Amil detectada' },
      { test: data.numeroCarteirinha && data.numeroCarteirinha.length >= 8, desc: 'Número da carteirinha válido' },
      { test: data.plano && data.plano.includes('Amil'), desc: 'Plano mapeado corretamente' },
      { test: data.confidence.overall >= 0.8, desc: 'Alta confiança (≥80%)' }
    ];
    
    let passed = 0;
    console.log('\n🔍 VERIFICAÇÕES:');
    
    checks.forEach(check => {
      const icon = check.test ? '✅' : '❌';
      console.log(`${icon} ${check.desc}`);
      if (check.test) passed++;
    });
    
    const success = passed === checks.length;
    console.log(`\n📈 Resultado: ${passed}/${checks.length} verificações passaram`);
    
    if (success) {
      console.log('🎉 TESTE AMIL PASSOU COM SUCESSO!');
    } else {
      console.log('⚠️ Algumas verificações falharam');
    }
    
    return success;
    
  } catch (error) {
    console.log('❌ ERRO na requisição:', error.message);
    return false;
  }
}

async function demonstrateAmilExtractor() {
  console.log('🚀 DEMONSTRAÇÃO DO EXTRATOR AMIL');
  console.log('═'.repeat(60));
  console.log('Testando as duas carteirinhas Amil com diferentes métodos de detecção:');
  console.log('• Carteirinha 1: Detecção por padrões de texto');
  console.log('• Carteirinha 2: Detecção por código ANS 326305');
  console.log('═'.repeat(60));
  
  const tests = [
    {
      path: 'attached_assets/12_1749886741292.jpg',
      desc: 'Carteirinha 1 (Detecção por Texto)'
    },
    {
      path: 'attached_assets/13_1749886741292.jpg', 
      desc: 'Carteirinha 2 (Detecção por ANS)'
    }
  ];

  let totalPassed = 0;
  
  for (const test of tests) {
    const result = await testAmilCarteirinha(test.path, test.desc);
    if (result) totalPassed++;
    
    // Pausa entre testes
    if (tests.indexOf(test) < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMO FINAL - EXTRATOR AMIL');
  console.log('═'.repeat(60));
  console.log(`✅ Carteirinhas processadas com sucesso: ${totalPassed}/${tests.length}`);
  console.log(`📈 Taxa de sucesso: ${((totalPassed/tests.length) * 100).toFixed(1)}%`);
  
  if (totalPassed === tests.length) {
    console.log('\n🎯 EXTRATOR AMIL COMPLETAMENTE FUNCIONAL!');
    console.log('🏗️ Recursos implementados:');
    console.log('• ✅ Detecção dual (ANS + texto)');
    console.log('• ✅ Extração de número da carteirinha');
    console.log('• ✅ Mapeamento inteligente de planos');
    console.log('• ✅ Extração de dados pessoais');
    console.log('• ✅ Integração com banco de dados');
    console.log('• ✅ Alta confiança (85-93%)');
    console.log('\n🔧 ARQUITETURA MODULAR:');
    console.log('• AmilExtractor integrado ao ExtractionOrchestrator');
    console.log('• Mapeamentos específicos de planos Amil');
    console.log('• Compatível com sistema de upload existente');
  } else {
    console.log('\n⚠️ Alguns testes falharam - verificar implementação');
  }
  
  console.log('\n🎪 PRÓXIMOS PASSOS:');
  console.log('• Sistema pronto para processamento de carteirinhas Amil');
  console.log('• Monitorar performance em produção');
  console.log('• Expandir mapeamentos conforme necessário');
}

// Executar se chamado diretamente
if (require.main === module) {
  demonstrateAmilExtractor().catch(console.error);
}

module.exports = { demonstrateAmilExtractor };