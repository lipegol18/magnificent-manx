const fs = require('fs');
const path = require('path');

async function testModularArchitecture() {
  console.log('🧪 Testando nova arquitetura modular...\n');
  
  const imagePath = path.join(__dirname, 'attached_assets/WhatsApp Image 2025-06-12 at 14.40.06_29c7ea64_1749743239252.jpg');
  
  if (!fs.existsSync(imagePath)) {
    console.error('❌ Arquivo não encontrado:', imagePath);
    return;
  }
  
  // Simular upload via FormData
  const FormData = require('form-data');
  const axios = require('axios');
  
  const form = new FormData();
  form.append('document', fs.createReadStream(imagePath));
  form.append('documentType', 'insurance');
  
  try {
    console.log('🔄 Enviando carteirinha Sul América para processamento...\n');
    
    const response = await axios.post('http://localhost:5000/api/process-document', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('📊 RESPOSTA DO SERVIDOR:');
    console.log('Status:', response.status);
    console.log('Architecture:', response.data.metadata?.architecture);
    console.log('Version:', response.data.metadata?.version);
    console.log('Success:', response.data.success);
    
    if (response.data.success) {
      console.log('\n✅ DADOS EXTRAÍDOS:');
      console.log('Operadora:', response.data.data.operadora);
      console.log('Nome:', response.data.data.nomeTitular);
      console.log('Número Carteirinha:', response.data.data.numeroCarteirinha);
      console.log('Plano:', response.data.data.plano);
      console.log('Data Nascimento:', response.data.data.dataNascimento);
      console.log('CNS:', response.data.data.cns);
      console.log('Código ANS:', response.data.data.ansCode);
      
      if (response.data.metadata?.architecture === 'modular') {
        console.log('\n🎯 SUCESSO: Nova arquitetura modular funcionando!');
      } else {
        console.log('\n⚠️ ATENÇÃO: Sistema ainda usando arquitetura legacy');
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
  }
}

// Adicionar axios como dependência se não existir
async function installAxios() {
  try {
    require('axios');
    require('form-data');
  } catch (e) {
    console.log('📦 Instalando dependências...');
    const { execSync } = require('child_process');
    execSync('npm install axios form-data', { stdio: 'inherit' });
  }
}

installAxios().then(() => {
  testModularArchitecture();
});