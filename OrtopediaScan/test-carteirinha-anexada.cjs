const fs = require('fs');
const path = require('path');

async function testCarteirinhaAnexada() {
  console.log('=== TESTE DA CARTEIRINHA ANEXADA ===\n');
  
  const imagePath = path.join(__dirname, 'attached_assets/WhatsApp Image 2025-05-27 at 09.43.31 (1).jpeg');
  
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Arquivo não encontrado: ${imagePath}`);
      return;
    }
    
    console.log('📄 Processando carteirinha anexada...');
    
    // Codificar imagem para base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      console.error('❌ GOOGLE_CLOUD_API_KEY não encontrada');
      return;
    }
    
    // Fazer requisição para Google Vision API
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION'
              }
            ]
          }
        ]
      })
    });
    
    const result = await response.json();
    
    if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
      const extractedText = result.responses[0].textAnnotations[0].description;
      
      console.log('=== TEXTO EXTRAÍDO ===');
      console.log(extractedText);
      console.log('======================\n');
      
      // Processar dados da carteirinha
      const data = {};
      
      // Lista de operadoras conhecidas
      const operadoras = [
        { name: "Bradesco Saúde", keys: ["BRADESCO", "BRADESCO SAUDE"] },
        { name: "Unimed", keys: ["UNIMED"] },
        { name: "Amil", keys: ["AMIL"] },
        { name: "SulAmérica", keys: ["SULAMERICA", "SULAMÉRICA"] },
        { name: "Hapvida", keys: ["HAPVIDA"] },
        { name: "NotreDame Intermédica", keys: ["NOTREDAME", "INTERMEDICA"] },
        { name: "Golden Cross", keys: ["GOLDEN CROSS"] }
      ];
      
      // Buscar operadora
      for (const operadora of operadoras) {
        if (operadora.keys.some(key => extractedText.toUpperCase().includes(key))) {
          data.operadora = operadora.name;
          break;
        }
      }
      
      // Extrair nome do titular
      const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (const line of lines) {
        // Buscar linha que parece ser um nome completo
        if (line.length > 5 && /^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+$/i.test(line)) {
          // Ignorar linhas com palavras da operadora ou outros textos padrão
          const ignoreWords = ['BRADESCO', 'UNIMED', 'AMIL', 'HAPVIDA', 'PLANO', 'SAUDE', 'CARTEIRINHA', 'VÁLIDO', 'ATÉ'];
          if (!ignoreWords.some(word => line.toUpperCase().includes(word))) {
            data.nomeTitular = line;
            break;
          }
        }
      }
      
      // Extrair número da carteirinha
      const cardNumberPatterns = [
        /CARTEIRA[:\s]*(\d+[\-\s]?\d*)/i,
        /MATRICULA[:\s]*(\d+[\-\s]?\d*)/i,
        /CARTAO NACIONAL DE SAUDE[:\s]*(\d+)/i,
        /(\d{10,})/
      ];
      
      for (const pattern of cardNumberPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          data.numeroCarteirinha = match[1].replace(/\s+/g, '');
          break;
        }
      }
      
      // Extrair CPF
      const cpfMatch = extractedText.match(/(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/);
      if (cpfMatch) {
        data.cpf = cpfMatch[1];
      }
      
      // Extrair data de nascimento
      const dateMatch = extractedText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateMatch) {
        data.dataNascimento = dateMatch[1];
      }
      
      console.log('=== DADOS EXTRAÍDOS ===');
      console.log(`Operadora: ${data.operadora || 'NÃO DETECTADA'}`);
      console.log(`Nome do Titular: ${data.nomeTitular || 'NÃO DETECTADO'}`);
      console.log(`Número da Carteirinha: ${data.numeroCarteirinha || 'NÃO DETECTADO'}`);
      console.log(`CPF: ${data.cpf || 'NÃO DETECTADO'}`);
      console.log(`Data de Nascimento: ${data.dataNascimento || 'NÃO DETECTADA'}`);
      console.log('========================');
      
    } else {
      console.error('❌ Erro na resposta da API:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar carteirinha:', error);
  }
}

testCarteirinhaAnexada();