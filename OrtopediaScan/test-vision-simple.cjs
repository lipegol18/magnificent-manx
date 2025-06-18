const fs = require('fs');

async function testGoogleVisionAPI() {
  try {
    console.log('Testando Google Vision API...');
    
    // Verificar se a chave da API está disponível
    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      console.error('GOOGLE_CLOUD_API_KEY não está configurada');
      return;
    }
    
    console.log('Chave da API encontrada');
    
    // Verificar se o arquivo existe
    const imagePath = './attached_assets/WhatsApp Image 2025-05-17 at 14.02.49.jpeg';
    if (!fs.existsSync(imagePath)) {
      console.error('Arquivo não encontrado:', imagePath);
      return;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    console.log('Arquivo carregado, tamanho:', imageBuffer.length, 'bytes');
    
    // Fazer requisição direta para a API do Google Vision
    const fetch = require('node-fetch');
    
    const requestBody = {
      requests: [{
        image: {
          content: imageBuffer.toString('base64')
        },
        features: [{
          type: 'TEXT_DETECTION'
        }]
      }]
    };
    
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API do Google Vision:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    
    if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
      const extractedText = result.responses[0].textAnnotations[0].description;
      console.log('=== TEXTO EXTRAÍDO ===');
      console.log(extractedText);
      console.log('======================');
      
      // Processar dados básicos
      console.log('=== ANÁLISE BÁSICA ===');
      
      // Buscar CPF
      const cpfMatch = extractedText.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
      if (cpfMatch) {
        console.log('CPF encontrado:', cpfMatch[1]);
      }
      
      // Buscar data
      const dateMatch = extractedText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateMatch) {
        console.log('Data encontrada:', dateMatch[1]);
      }
      
      // Buscar nome (linhas que parecem ser nomes)
      const lines = extractedText.split('\n').filter(line => {
        const clean = line.trim();
        return clean.length > 3 && /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i.test(clean);
      });
      
      console.log('Possíveis nomes encontrados:', lines);
      console.log('======================');
      
    } else {
      console.log('Nenhum texto detectado ou erro na resposta');
      console.log('Resposta completa:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testGoogleVisionAPI();