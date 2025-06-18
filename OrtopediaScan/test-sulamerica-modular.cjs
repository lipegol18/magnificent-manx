const fs = require('fs');

// Test the Sul América extractor directly
async function testSulAmericaExtractor() {
  console.log('🧪 Testando extrator modular Sul América...\n');
  
  // Import the Sul América extractor directly
  try {
    const { sulAmericaExtractor } = await import('./server/services/document-extraction/extractors/sulamerica-extractor.js');
    
    // Simulate Sul América card text (from previous successful extraction)
    const testText = `
      18:52
      ROSANA ROITMAN
      PRODUTO
      557
      <
      PLANO
      ESPECIAL 100
      Email
      CÓDIGO DE IDENTIFICAÇÃO
      88888 4872 8768 0017
      ACOMODAÇÃO
      APARTAMENTO
      COBERTURA
      AMBULATORIAL + HOSPITALAR + OBSTETRICIA
      EMPRESA
      81F2Q MR TRAUMA CIA LTDA
      CARÊNCIAS:
      CENTRAL DE SERVIÇOS SULAMÉRICA SAÚDE
      CAPITAIS E ÁREAS METROPOLITANAS 4004 5900
      DEMAIS REGIÕES 0800 970 0500
      Copiar
      ID
      APRESENTAR DOCUMENTO DE IDENTIFICAÇÃO COM FOTO
      REFERENCIADO CONSULTAR VALIDADE NOS CANAIS DE ATENDIMENTO
      5G
      52
      NASCIMENTO
      08/04/1965
      CNS
      703601098762138
      ANS - N° 006246
      WWW.SULAMERICA.COM.BR
    `;
    
    console.log('📄 Texto de teste Sul América preparado');
    console.log('🔄 Executando extrator modular...\n');
    
    const result = await sulAmericaExtractor.extract(testText);
    
    console.log('📊 RESULTADO DO EXTRATOR MODULAR:');
    console.log('Success:', result.success);
    console.log('Confidence:', result.confidence);
    console.log('Method:', result.method);
    
    if (result.success) {
      console.log('\n✅ DADOS EXTRAÍDOS:');
      console.log('Nome:', result.data.nomeTitular);
      console.log('Número:', result.data.numeroCarteirinha);
      console.log('Plano:', result.data.plano);
      console.log('Data Nascimento:', result.data.dataNascimento);
      console.log('CNS:', result.data.cns);
      console.log('Código ANS:', result.data.ansCode);
      console.log('Operadora:', result.data.operadora);
      
      console.log('\n🎯 SUCESSO: Extrator modular Sul América funcionando!');
    } else {
      console.log('\n❌ FALHA no extrator modular:');
      console.log('Erros:', result.errors);
    }
    
  } catch (error) {
    console.error('❌ Erro ao importar o extrator:', error.message);
    console.log('\nTentando testar arquitetura completa...');
    await testCompleteArchitecture();
  }
}

async function testCompleteArchitecture() {
  try {
    const { documentExtractionService } = await import('./server/services/document-extraction/index.js');
    
    console.log('🔄 Testando arquitetura completa com buffer simulado...');
    
    // Create a simple test buffer (this won't work for real OCR but tests the architecture)
    const testBuffer = Buffer.from('test');
    
    const result = await documentExtractionService.processInsuranceCard(testBuffer);
    
    console.log('📊 Resultado da arquitetura completa:', result.success ? 'SUCESSO' : 'FALHA');
    
    if (result.errors) {
      console.log('Erros:', result.errors);
    }
    
  } catch (error) {
    console.error('❌ Erro na arquitetura completa:', error.message);
  }
}

testSulAmericaExtractor();