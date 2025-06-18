/**
 * Teste das correções de regex para extração de nome
 * Usando o texto OCR real que está causando problema
 */

// Simular o texto OCR real conforme os logs
const textoOCRReal = `REPUBLICA FEDERATIVA DO BRASIL ESTADO DE SAO PAULO SECRETARIA DA SEGURANCA PUBLICA REGISTRO GERAL 123456789 NOME DANIEL COELHO DA COSTA FILIACAO ROSA COELHO DA COSTA EDIVALDO DA COSTA NATURALIDADE SAO PAULO - SP DOC. ORIGEM SAO PAULO - SP CPF XXXXXXXXXXX CARTORIO XXXXX 342.002.171-42 ASSINATURA DO DIRETOR LEIN 7.116 DE 29/08/88 XXX DATA DE NASCIMENTO 19/DEZ/1980 XXXXXX`;

function testarPadroesNome() {
  console.log('🧪 TESTE DOS PADRÕES DE NOME CORRIGIDOS');
  console.log('='.repeat(50));
  
  // Padrões implementados na correção
  const nomePatterns = [
    // Padrão 1: NOME seguido de nome completo até FILIACAO (mais restritivo)
    /NOME\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+){1,4})\s+FILIACAO/i,
    // Padrão 2: NOME seguido de nome até quebra de linha ou campo específico
    /NOME[\s\n]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]{10,60}?)(?:\s+FILIACAO|\s+NATURALIDADE|\s+DATA|\n)/i,
    // Padrão 3: Busca mais conservadora
    /NOME\s+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]+)?)\s/i
  ];
  
  console.log('📝 Texto OCR (trecho relevante):');
  const trechoNome = textoOCRReal.substring(textoOCRReal.indexOf('NOME'), textoOCRReal.indexOf('NATURALIDADE'));
  console.log(trechoNome);
  console.log();
  
  nomePatterns.forEach((pattern, index) => {
    console.log(`🔍 Testando Padrão ${index + 1}:`);
    console.log(`   Regex: ${pattern}`);
    
    const match = textoOCRReal.match(pattern);
    if (match && match[1]) {
      const nomeExtraido = match[1].trim();
      console.log(`   ✅ Resultado: "${nomeExtraido}"`);
      
      // Validações
      const valido = nomeExtraido.length > 5 && 
                    nomeExtraido.length < 60 &&
                    !nomeExtraido.match(/FILIACAO|NATURALIDADE|DATA|REGISTRO|GERAL|CPF|EXPEDIÇÃO/i) &&
                    nomeExtraido.split(' ').length >= 2;
      
      console.log(`   📊 Válido: ${valido ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   📏 Tamanho: ${nomeExtraido.length} caracteres`);
      console.log(`   🔤 Palavras: ${nomeExtraido.split(' ').length}`);
      
      if (valido) {
        console.log(`   🎯 PADRÃO FUNCIONOU! Nome correto extraído: "${nomeExtraido}"`);
      }
    } else {
      console.log(`   ❌ Não encontrou match`);
    }
    console.log();
  });
  
  // Teste do padrão antigo (problemático)
  console.log('🔴 PADRÃO ANTIGO (Problemático):');
  const padraoAntigo = /NOME[\s\n]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+?)(?:\n|DOC\.|IDENTIDADE|FILIAÇÃO|NATURALIDADE|DATA)/i;
  const matchAntigo = textoOCRReal.match(padraoAntigo);
  if (matchAntigo && matchAntigo[1]) {
    console.log(`   ❌ Resultado problemático: "${matchAntigo[1].trim()}"`);
  }
  
  console.log('\n📋 CONCLUSÃO:');
  console.log('Padrão 1 deve extrair apenas "DANIEL COELHO DA COSTA"');
  console.log('Isso resolve o problema de capturar dados da FILIAÇÃO');
}

// Testar extração de RG
function testarPadroesRG() {
  console.log('\n🧪 TESTE DOS PADRÕES DE RG');
  console.log('='.repeat(50));
  
  const rgPatterns = [
    /REGISTRO\s+(\d{1,2}\.?\d{3}\.?\d{3}-?\d{1,2})/i,
    /REGISTRO\s+(\d+\.?\d+\.?\d+-?\d+)\s+GERAL/i,
    /(?:REGISTRO|GERAL|RG)\s*:?\s*(\d{1,2}\.?\d{3}\.?\d{3}-?\d{1,2})/i,
    /(\d{1,2}\.\d{3}\.\d{3}-?\d{1,2})/g
  ];
  
  rgPatterns.forEach((pattern, index) => {
    console.log(`🔍 Testando Padrão RG ${index + 1}:`);
    const match = textoOCRReal.match(pattern);
    if (match && match[1]) {
      const rgExtraido = match[1];
      const digits = rgExtraido.replace(/[^\d]/g, '');
      const valido = digits.length >= 7 && digits.length <= 9 && digits.length !== 11;
      
      console.log(`   ✅ RG encontrado: "${rgExtraido}"`);
      console.log(`   📏 Dígitos: ${digits.length}`);
      console.log(`   📊 Válido: ${valido ? '✅ SIM' : '❌ NÃO'}`);
    } else {
      console.log(`   ❌ Não encontrou RG`);
    }
  });
}

// Testar extração de data
function testarPadroesData() {
  console.log('\n🧪 TESTE DOS PADRÕES DE DATA');
  console.log('='.repeat(50));
  
  const datePatterns = [
    /DATA\s+DE?\s*NASCIMENTO\s+(\d{1,2}\/[A-Z]{3}\/\d{4})/i,
    /NASCIMENTO\s+(\d{1,2}\/[A-Z]{3}\/\d{4})/i,
    /(\d{1,2}\/(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/\d{4})/i,
    /DATA\s+DE?\s*NASCIMENTO\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /NASCIMENTO\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
  ];
  
  datePatterns.forEach((pattern, index) => {
    console.log(`🔍 Testando Padrão Data ${index + 1}:`);
    const match = textoOCRReal.match(pattern);
    if (match && match[1]) {
      console.log(`   ✅ Data encontrada: "${match[1]}"`);
    } else {
      console.log(`   ❌ Não encontrou data`);
    }
  });
}

// Executar todos os testes
testarPadroesNome();
testarPadroesRG();
testarPadroesData();