/**
 * Teste final do Bradesco com nova arquitetura separada
 */
const { ExtractionOrchestrator } = require('./server/services/document-extraction/core/extraction-orchestrator.ts');
const fs = require('fs');

async function testBradescoWithNewArchitecture() {
  console.log('\n=== TESTE BRADESCO - NOVA ARQUITETURA SEPARADA ===\n');
  
  try {
    const imagePath = './attached_assets/WhatsApp Image 2025-06-12 at 14.40.06_29c7ea64_1749743239252.jpg';
    
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Imagem de teste não encontrada:', imagePath);
      return;
    }
    
    console.log('📸 Processando carteirinha Bradesco...');
    
    const imageBuffer = fs.readFileSync(imagePath);
    const orchestrator = new ExtractionOrchestrator();
    
    console.log('🔄 Iniciando processamento com nova arquitetura...');
    const result = await orchestrator.processDocument(imageBuffer);
    
    console.log('\n📊 RESULTADO COMPLETO:');
    console.log('- Sucesso:', result.success);
    console.log('- Operadora:', result.data.operadora);
    console.log('- Normalizada:', result.data.normalizedOperadora);
    console.log('- Número:', result.data.numeroCarteirinha);
    console.log('- Plano:', result.data.plano);
    console.log('- Data Nascimento:', result.data.dataNascimento);
    console.log('- Confiança:', result.confidence.overall);
    console.log('- Método:', result.method.type);
    
    if (result.success && result.data.normalizedOperadora === 'BRADESCO') {
      console.log('\n✅ TESTE PASSOU - Bradesco detectado e dados extraídos corretamente');
    } else {
      console.log('\n❌ TESTE FALHOU - Dados não extraídos corretamente');
    }
    
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }
}

testBradescoWithNewArchitecture();