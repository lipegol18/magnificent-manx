/**
 * Teste de produção com imagem RG real
 * Verifica se a nova arquitetura corrigida funciona com imagens reais
 */

const fs = require('fs');
const https = require('https');

// Simular a API de processamento de documento
async function testRealRGImage() {
  console.log('🧪 TESTE DE PRODUÇÃO - Nova Arquitetura RG Corrigida');
  console.log('=' .repeat(60));
  
  try {
    // Carregar imagem RG real (Daniel - São Paulo)
    const imagePath = './attached_assets/09_1749896127298.png';
    
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Imagem de teste não encontrada:', imagePath);
      return;
    }
    
    console.log('📁 Carregando imagem RG real:', imagePath);
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('📊 Tamanho da imagem:', imageBuffer.length, 'bytes');
    
    // Simular chamada para a API
    console.log('🔄 Enviando para API de processamento...');
    
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test-rg.png');
    
    // Fazer requisição para a API local
    const response = await fetch('http://localhost:5000/api/process-document', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      console.log('❌ Erro na API:', response.status, response.statusText);
      return;
    }
    
    const result = await response.json();
    console.log('📋 Resposta da API recebida');
    
    // Analisar resultado
    console.log('\n📊 ANÁLISE DO RESULTADO:');
    console.log('Status:', result.success ? '✅ SUCESSO' : '❌ FALHA');
    
    if (result.success) {
      console.log('Método usado:', result.method?.type || 'Não especificado');
      console.log('Arquitetura:', result.architecture || 'Não especificado');
      
      console.log('\n📝 DADOS EXTRAÍDOS:');
      console.log('Nome:', result.normalizedName || result.extractedData?.fullName || 'Não extraído');
      console.log('CPF:', result.normalizedCpf || result.extractedData?.cpf || 'Não extraído');
      console.log('RG:', result.extractedData?.rg || 'Não extraído');
      console.log('Data Nascimento:', result.normalizedBirthDate || result.extractedData?.birthDate || 'Não extraído');
      
      console.log('\n📈 CONFIANÇA:');
      if (result.confidence) {
        console.log('Geral:', (result.confidence.overall * 100).toFixed(1) + '%');
        console.log('Nome:', (result.confidence.name * 100).toFixed(1) + '%');
        console.log('CPF:', (result.confidence.cpf * 100).toFixed(1) + '%');
      }
      
      // Verificar se usou nova arquitetura
      if (result.method?.type === 'INTEGRATED_EXTRACTION' || result.architecture === 'unified') {
        console.log('\n✅ SUCESSO: Nova arquitetura integrada funcionando!');
        console.log('✅ Correção aplicada - RG não tenta identificar operadora');
        console.log('✅ Lógica legada eficaz integrada');
      } else {
        console.log('\n⚠️  ATENÇÃO: Sistema usou fallback legado');
        console.log('Motivo:', result.method?.details || 'Não especificado');
      }
      
    } else {
      console.log('Erro:', result.error || 'Erro não especificado');
      console.log('Detalhes:', result.errors?.join(', ') || 'Nenhum detalhe');
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

// Verificar se o servidor está rodando
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:5000/api/user');
    return response.status !== 500; // Qualquer resposta que não seja erro interno
  } catch (error) {
    return false;
  }
}

// Executar teste
async function runTest() {
  console.log('🔍 Verificando status do servidor...');
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('❌ Servidor não está rodando ou não está acessível');
    console.log('Execute "npm run dev" primeiro');
    return;
  }
  
  console.log('✅ Servidor está rodando\n');
  await testRealRGImage();
}

runTest();