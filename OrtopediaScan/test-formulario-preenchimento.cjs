const fs = require('fs');
const fetch = require('node-fetch');

async function testFormularioPreenchimento() {
  console.log('🧪 Testando preenchimento automático do formulário...');

  try {
    // Usar a carteirinha real que sabemos que funciona
    const imagePath = './attached_assets/carteirinha_rosanaRoitman_1749540163771.jpeg';
    
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Arquivo de imagem não encontrado:', imagePath);
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    console.log('📸 Imagem carregada:', imagePath);
    console.log('📊 Tamanho do buffer:', imageBuffer.length, 'bytes');

    // Criar FormData
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('document', imageBuffer, {
      filename: 'carteirinha.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('documentType', 'insurance');

    console.log('🔄 Enviando para processamento...');

    const response = await fetch('http://localhost:5000/api/process-document', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });

    const result = await response.json();
    console.log('📋 Resultado completo:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Processamento bem-sucedido!');
      console.log('🏥 Operadora:', result.data.operadora);
      console.log('🔄 Operadora Normalizada:', result.data.normalizedOperadora);
      console.log('💳 Plano:', result.data.plano);
      console.log('🆔 Número da Carteirinha:', result.data.numeroCarteirinha);
      console.log('👤 Nome do Titular:', result.data.nomeTitular);
      console.log('🎯 Confiança:', result.data.confidence ? result.data.confidence.overall : result.metadata.confidence.overall);
      
      // Verificar se os campos necessários para o formulário estão presentes
      console.log('\n📝 Verificação de campos para formulário:');
      console.log('- normalizedOperadora:', result.data.normalizedOperadora ? '✅' : '❌');
      console.log('- plano:', result.data.plano ? '✅' : '❌');
      console.log('- numeroCarteirinha:', result.data.numeroCarteirinha ? '✅' : '❌');
      
      if (result.data.normalizedOperadora && result.data.plano) {
        console.log('\n🎉 Todos os campos necessários para preenchimento automático estão presentes!');
        console.log('O formulário deve agora preencher automaticamente:');
        console.log('- Operadora: buscar por "' + result.data.normalizedOperadora + '"');
        console.log('- Plano: "' + result.data.plano + '"');
        console.log('- Número: "' + result.data.numeroCarteirinha + '"');
      } else {
        console.log('\n❌ Alguns campos estão faltando para preenchimento completo');
      }
    } else {
      console.log('❌ Falha no processamento:', result.error);
      if (result.errors) {
        console.log('🔍 Erros:', result.errors);
      }
    }

  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

testFormularioPreenchimento();