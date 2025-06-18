/**
 * Teste do extrator Bradesco
 * Valida a extração de dados das carteirinhas Bradesco
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testBradescoExtractor() {
  console.log('🧪 Testando extrator Bradesco...');
  
  const testCases = [
    {
      file: './attached_assets/carterinha Bradesco.jpeg',
      expectedOperator: 'BRADESCO',
      expectedProvider: 'Bradesco Saúde'
    },
    {
      file: './attached_assets/carterinha bradesco_1749540163772.jpeg',
      expectedOperator: 'BRADESCO',
      expectedProvider: 'Bradesco Saúde'
    }
  ];

  for (const testCase of testCases) {
    if (!fs.existsSync(testCase.file)) {
      console.log(`⚠️ Arquivo não encontrado: ${testCase.file}`);
      continue;
    }

    console.log(`\n📸 Testando: ${testCase.file}`);
    
    try {
      const formData = new FormData();
      formData.append('document', fs.createReadStream(testCase.file));
      formData.append('documentType', 'insurance');

      const response = await fetch('http://localhost:5000/api/process-document', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        console.log('❌ Falha no processamento:', result.error);
        continue;
      }

      console.log('✅ Processamento bem-sucedido!');
      console.log('🏥 Operadora:', result.data.operadora);
      console.log('🔄 Operadora Normalizada:', result.data.normalizedOperadora);
      console.log('💳 Plano:', result.data.plano || 'Não identificado');
      console.log('🆔 Número da Carteirinha:', result.data.numeroCarteirinha || 'Não identificado');
      console.log('👤 Nome do Titular:', result.data.nomeTitular || 'Não identificado');
      console.log('📅 Data de Nascimento:', result.data.dataNascimento || 'Não identificada');
      console.log('🎯 Confiança:', result.data.confidence?.overall || result.metadata?.confidence?.overall || 'N/A');

      // Validações
      const validations = [];
      
      if (result.data.operadora === testCase.expectedOperator) {
        validations.push('✅ Operadora correta');
      } else {
        validations.push('❌ Operadora incorreta');
      }

      if (result.data.normalizedOperadora === testCase.expectedProvider) {
        validations.push('✅ Operadora normalizada correta');
      } else {
        validations.push('❌ Operadora normalizada incorreta');
      }

      if (result.data.numeroCarteirinha && result.data.numeroCarteirinha.length >= 10) {
        validations.push('✅ Número da carteirinha extraído');
      } else {
        validations.push('❌ Número da carteirinha não extraído');
      }

      console.log('\n📝 Validações:');
      validations.forEach(v => console.log(v));

    } catch (error) {
      console.log('❌ Erro no teste:', error.message);
    }
  }
}

// Executar teste
testBradescoExtractor().catch(console.error);