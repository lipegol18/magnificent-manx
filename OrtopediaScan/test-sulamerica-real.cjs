const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Simular upload de carteirinha Sul América real usando dados OCR conhecidos
async function testSulAmericaReal() {
  console.log('🧪 Testando nova arquitetura com dados reais Sul América...\n');
  
  // Criar um arquivo temporário simulando a carteirinha processada
  const sulAmericaText = `
18:52
ROSANA ROITMAN
PRODUTO
557
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

  // Criar arquivo temporário
  const tempFile = 'temp_sulamerica_test.txt';
  fs.writeFileSync(tempFile, sulAmericaText);
  
  try {
    const form = new FormData();
    form.append('document', fs.createReadStream(tempFile));
    form.append('documentType', 'insurance');
    
    console.log('🔄 Enviando dados Sul América para nova arquitetura...\n');
    
    const response = await axios.post('http://localhost:5000/api/process-document', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('📊 RESULTADO DA NOVA ARQUITETURA:');
    console.log('Status:', response.status);
    console.log('Architecture:', response.data.metadata?.architecture);
    console.log('Version:', response.data.metadata?.version);
    console.log('Success:', response.data.success);
    
    if (response.data.success) {
      console.log('\n✅ DADOS EXTRAÍDOS PELA NOVA ARQUITETURA:');
      console.log('Operadora:', response.data.data.operadora);
      console.log('Nome:', response.data.data.nomeTitular);
      console.log('Número Carteirinha:', response.data.data.numeroCarteirinha);
      console.log('Plano:', response.data.data.plano);
      console.log('Data Nascimento:', response.data.data.dataNascimento);
      console.log('CNS:', response.data.data.cns);
      console.log('Código ANS:', response.data.data.ansCode);
      
      if (response.data.metadata?.architecture === 'modular') {
        console.log('\n🎯 SUCESSO: Nova arquitetura modular funcionando perfeitamente!');
        console.log('Confidence:', response.data.metadata.confidence);
        console.log('Detection Method:', response.data.metadata.detectionMethod);
        
        // Validar dados específicos Sul América
        const isValidSulAmerica = 
          response.data.data.numeroCarteirinha?.includes('88888') &&
          response.data.data.ansCode === '006246' &&
          response.data.data.operadora?.includes('SUL');
          
        if (isValidSulAmerica) {
          console.log('\n✨ VALIDAÇÃO: Sul América detectada corretamente!');
        }
      }
    } else {
      console.log('\n❌ ERRO no processamento:');
      console.log(response.data.error);
      if (response.data.errors) {
        console.log('Detalhes:', response.data.errors);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.response?.data || error.message);
  } finally {
    // Limpar arquivo temporário
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

testSulAmericaReal();