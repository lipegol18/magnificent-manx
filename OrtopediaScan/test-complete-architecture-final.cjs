/**
 * Teste Final da Arquitetura Modular Completa
 * Verifica todos os 5 extratores especializados
 */

const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testExtractor(imagePath, expectedOperator, expectedFeatures) {
  console.log(`\n🧪 TESTANDO: ${imagePath}`);
  console.log(`📋 Esperado: Operadora ${expectedOperator}`);
  
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
    console.log(`✅ Operadora detectada: ${data.operadora}`);
    console.log(`🏥 Nome normalizado: ${data.normalizedOperadora}`);
    console.log(`🎫 Número da carteirinha: ${data.numeroCarteirinha}`);
    console.log(`📋 Plano: ${data.plano}`);
    console.log(`👤 Titular: ${data.nomeTitular || 'Não extraído'}`);
    console.log(`📅 Data nascimento: ${data.dataNascimento || 'Não extraída'}`);
    console.log(`🆔 CNS: ${data.cns || 'Não extraído'}`);
    console.log(`🔢 ANS: ${data.ansCode || 'Não detectado'}`);
    console.log(`🎯 Método: ${data.method.type} - ${data.method.details}`);
    console.log(`📊 Confiança: ${(data.confidence.overall * 100).toFixed(1)}%`);

    // Verificações específicas
    let success = true;
    
    if (data.operadora !== expectedOperator) {
      console.log(`❌ Operadora incorreta. Esperado: ${expectedOperator}, Recebido: ${data.operadora}`);
      success = false;
    }
    
    if (!data.numeroCarteirinha) {
      console.log('❌ Número da carteirinha não extraído');
      success = false;
    }
    
    if (!data.plano) {
      console.log('❌ Plano não extraído');
      success = false;
    }

    // Verificações específicas por operadora
    if (expectedFeatures.ansRequired && !data.ansCode) {
      console.log('❌ Código ANS obrigatório não encontrado');
      success = false;
    }
    
    if (expectedFeatures.cnsExpected && !data.cns) {
      console.log('⚠️ CNS esperado mas não encontrado (pode ser aceitável)');
    }

    if (success) {
      console.log('🎉 TESTE PASSOU! Extrator funcionando corretamente');
    } else {
      console.log('💥 TESTE FALHOU! Problemas na extração');
    }
    
    return success;
    
  } catch (error) {
    console.log('❌ ERRO na requisição:', error.message);
    return false;
  }
}

async function runCompleteArchitectureTest() {
  console.log('🚀 INICIANDO TESTE DA ARQUITETURA MODULAR COMPLETA');
  console.log('=' .repeat(70));
  
  const tests = [
    {
      name: 'Sul América',
      path: 'attached_assets/5_1749884392134.jpeg',
      expectedOperator: 'SUL AMERICA',
      features: { ansRequired: true, cnsExpected: false }
    },
    {
      name: 'Bradesco',
      path: 'attached_assets/7_1749886292095.jpg', 
      expectedOperator: 'BRADESCO',
      features: { ansRequired: false, cnsExpected: true }
    },
    {
      name: 'Unimed',
      path: 'attached_assets/WhatsApp Image 2025-06-12 at 14.40.06_29c7ea64_1749743239252.jpg',
      expectedOperator: 'UNIMED',
      features: { ansRequired: true, cnsExpected: false }
    },
    {
      name: 'Porto Seguro',
      path: 'attached_assets/image_1749741184770.png',
      expectedOperator: 'PORTO',
      features: { ansRequired: false, cnsExpected: false }
    },
    {
      name: 'Amil (Carteirinha 1)',
      path: 'attached_assets/12_1749886741292.jpg',
      expectedOperator: 'AMIL',
      features: { ansRequired: false, cnsExpected: false }
    },
    {
      name: 'Amil (Carteirinha 2)',
      path: 'attached_assets/13_1749886741292.jpg',
      expectedOperator: 'AMIL',
      features: { ansRequired: true, cnsExpected: false }
    }
  ];

  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await testExtractor(test.path, test.expectedOperator, test.features);
    if (result) passed++;
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMO FINAL DOS TESTES');
  console.log('=' .repeat(70));
  console.log(`✅ Testes passaram: ${passed}/${total}`);
  console.log(`❌ Testes falharam: ${total - passed}/${total}`);
  console.log(`📈 Taxa de sucesso: ${((passed/total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('🎉 TODOS OS EXTRATORES FUNCIONANDO PERFEITAMENTE!');
    console.log('🏗️ Arquitetura modular completamente integrada');
    console.log('🔧 Sistema pronto para produção');
  } else {
    console.log('⚠️ Alguns extratores precisam de ajustes');
  }
  
  console.log('\n🔍 DETALHES DA ARQUITETURA:');
  console.log('• Sul América: ANS 006246 + padrões de texto');
  console.log('• Bradesco: Padrões de texto específicos');
  console.log('• Unimed: ANS 000701 + padrões de texto');
  console.log('• Porto Seguro: Padrões de texto específicos');
  console.log('• Amil: ANS 326305 + padrões de texto');
  console.log('• CNS: Validação matemática global');
  console.log('• Mapeamento: Planos padronizados por operadora');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  runCompleteArchitectureTest().catch(console.error);
}

module.exports = { runCompleteArchitectureTest };