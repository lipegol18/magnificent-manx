/**
 * Teste dos componentes RG individualmente
 * Usando CommonJS para evitar problemas de importação
 */

// Texto real do RG Rio Grande do Sul
const RG_RS_TEXT = `REPÚBLICA FEDERATIVA DO BRASIL
ESTADO DO RIO GRANDE DO SUL
SECRETARIA DA SEGURANÇA PÚBLICA
INSTITUTO-GERAL DE PERÍCIAS
DEPARTAMENTO DE IDENTIFICAÇÃO

CARTEIRA DE IDENTIDADE
REGISTRO GERAL

37.456.789-42

BEATRIZ SASS CORRÊA

FILIAÇÃO
MARIA HELENA SASS
JOÃO CARLOS CORRÊA

NATURALIDADE
PORTO ALEGRE - RS

12/ABR/1985

423.789.456-89

DOC. ORIGEM: CERTIDÃO DE NASCIMENTO

VÁLIDA EM TODO O TERRITÓRIO NACIONAL`;

async function testRGComponents() {
  console.log('🚀 Testando componentes RG individualmente...\n');

  try {
    // Testar detector de tipo de documento
    console.log('🔍 Testando DocumentTypeDetector...');
    const { spawn } = require('child_process');
    
    // Usar tsx para executar TypeScript
    const tsCode = `
      import { DocumentTypeDetector } from './server/services/document-extraction/detectors/document-type-detector';
      
      const text = \`${RG_RS_TEXT}\`;
      const result = DocumentTypeDetector.detectDocumentType(text);
      
      console.log('RESULTADO_DETECTOR:', JSON.stringify({
        type: result.type,
        subtype: result.subtype,
        confidence: result.confidence
      }));
    `;
    
    console.log('Executando detector de tipo...');
    
    // Criar arquivo temporário
    const fs = require('fs');
    fs.writeFileSync('./temp-test.ts', tsCode);
    
    // Executar com tsx
    const child = spawn('npx', ['tsx', './temp-test.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      child.on('close', (code) => {
        console.log('Código de saída:', code);
        if (output) {
          console.log('Saída:', output);
          
          // Extrair resultado JSON
          const match = output.match(/RESULTADO_DETECTOR:\s*({.*})/);
          if (match) {
            try {
              const result = JSON.parse(match[1]);
              console.log('\n📋 Resultado do DocumentTypeDetector:');
              console.log('Tipo:', result.type);
              console.log('Subtipo:', result.subtype);
              console.log('Confiança:', (result.confidence * 100).toFixed(1) + '%');
              
              if (result.type === 'RG_IDENTITY') {
                console.log('✅ RG detectado corretamente!');
              } else {
                console.log('❌ RG não foi detectado como identidade');
              }
            } catch (e) {
              console.log('Erro ao parsear resultado:', e.message);
            }
          }
        }
        if (errorOutput) {
          console.log('Erro:', errorOutput);
        }
        
        // Limpar arquivo temporário
        try {
          fs.unlinkSync('./temp-test.ts');
        } catch (e) {}
        
        resolve();
      });
    });

    // Testar sistema legado para comparação
    console.log('\n🔄 Testando sistema legado...');
    const legacyCode = `
      import { processIdentityDocument } from './server/services/google-vision';
      
      const text = \`${RG_RS_TEXT}\`;
      const result = processIdentityDocument(text);
      
      console.log('RESULTADO_LEGACY:', JSON.stringify({
        fullName: result.fullName,
        idNumber: result.idNumber,
        cpf: result.cpf,
        dataNascimento: result.dataNascimento
      }));
    `;
    
    fs.writeFileSync('./temp-legacy.ts', legacyCode);
    
    const legacyChild = spawn('npx', ['tsx', './temp-legacy.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    let legacyOutput = '';
    let legacyError = '';
    
    legacyChild.stdout.on('data', (data) => {
      legacyOutput += data.toString();
    });
    
    legacyChild.stderr.on('data', (data) => {
      legacyError += data.toString();
    });
    
    await new Promise((resolve) => {
      legacyChild.on('close', (code) => {
        console.log('Código de saída legacy:', code);
        if (legacyOutput) {
          console.log('Saída legacy:', legacyOutput);
          
          const match = legacyOutput.match(/RESULTADO_LEGACY:\s*({.*})/);
          if (match) {
            try {
              const result = JSON.parse(match[1]);
              console.log('\n📋 Resultado do sistema legado:');
              console.log('Nome:', result.fullName || 'Não encontrado');
              console.log('RG:', result.idNumber || 'Não encontrado');
              console.log('CPF:', result.cpf || 'Não encontrado');
              console.log('Data Nascimento:', result.dataNascimento || 'Não encontrado');
              
              if (result.fullName === 'FILIAÇÃO') {
                console.log('❌ BUG CONFIRMADO: Sistema legado extraiu "FILIAÇÃO" como nome!');
              } else if (result.fullName && result.fullName.includes('BEATRIZ')) {
                console.log('✅ Sistema legado extraiu nome correto');
              } else {
                console.log('⚠️ Sistema legado não extraiu nome ou extraiu incorretamente');
              }
            } catch (e) {
              console.log('Erro ao parsear resultado legacy:', e.message);
            }
          }
        }
        if (legacyError) {
          console.log('Erro legacy:', legacyError);
        }
        
        // Limpar arquivo temporário
        try {
          fs.unlinkSync('./temp-legacy.ts');
        } catch (e) {}
        
        resolve();
      });
    });

    console.log('\n✅ Teste de componentes finalizado');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testRGComponents();