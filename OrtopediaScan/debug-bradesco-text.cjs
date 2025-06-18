/**
 * Debug para analisar o texto OCR da carteirinha Bradesco
 */
const fs = require('fs');

// Simular o texto que provavelmente está sendo extraído
const simulatedBradescoText = `
BRADESCO SAÚDE S/A
CARTÃO DE IDENTIFICAÇÃO DO BENEFICIÁRIO
SAÚDE TOP
Nº 705005481813853
Validade: 12/2025
Nome: JOÃO DA SILVA
CPF: 123.456.789-00
Data Nascimento: 14/03/1973
`;

console.log('🔍 ANALISANDO TEXTO DA CARTEIRINHA BRADESCO\n');
console.log('Texto simulado:');
console.log(simulatedBradescoText);
console.log('\n' + '='.repeat(50) + '\n');

function testBradescoPatterns(text) {
  const normalizedText = text.toUpperCase();
  console.log('Texto normalizado:');
  console.log(normalizedText);
  console.log('\n' + '-'.repeat(30) + '\n');
  
  // 1. Testar planos compostos
  console.log('1. TESTANDO PLANOS COMPOSTOS:');
  const composedPlans = [
    'SAUDE TOP',
    'SAÚDE TOP',
    'SAUDE PLUS',
    'SAÚDE PLUS',
    'SAUDE PREMIUM'
  ];
  
  for (const plan of composedPlans) {
    if (normalizedText.includes(plan)) {
      console.log(`✅ Encontrado: ${plan}`);
    } else {
      console.log(`❌ Não encontrado: ${plan}`);
    }
  }
  
  console.log('\n2. TESTANDO PADRÕES REGEX:');
  
  // 2. Testar padrões regex
  const patterns = [
    { name: 'SAUDE + palavra', regex: /SAU?DE\s+([A-ZÁÊÔÇ]{2,15})/g },
    { name: 'SAÚDE + palavra', regex: /SAÚDE\s+([A-ZÁÊÔÇ]{2,15})/g },
    { name: 'Qualquer SAUDE', regex: /SAU?DE\s+(\w+)/g },
    { name: 'Linha com SAUDE', regex: /.*SAU?DE.*([A-Z]{3,})/g }
  ];
  
  patterns.forEach(({ name, regex }) => {
    console.log(`\nTestando: ${name}`);
    const matches = [...normalizedText.matchAll(regex)];
    if (matches.length > 0) {
      matches.forEach((match, i) => {
        console.log(`  Match ${i + 1}: ${match[0]} → Grupo: ${match[1] || 'N/A'}`);
      });
    } else {
      console.log(`  ❌ Nenhum match encontrado`);
    }
  });
  
  console.log('\n3. ANÁLISE LINHA POR LINHA:');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line);
  lines.forEach((line, i) => {
    console.log(`Linha ${i + 1}: "${line}"`);
    if (line.includes('SAUDE') || line.includes('SAÚDE')) {
      console.log(`  → Contém SAUDE/SAÚDE!`);
    }
    if (line.includes('TOP')) {
      console.log(`  → Contém TOP!`);
    }
  });
  
  console.log('\n4. BUSCA MANUAL POR "TOP":');
  if (normalizedText.includes('TOP')) {
    console.log('✅ A palavra "TOP" está presente no texto');
    
    // Encontrar contexto ao redor de TOP
    const topIndex = normalizedText.indexOf('TOP');
    const before = normalizedText.substring(Math.max(0, topIndex - 20), topIndex);
    const after = normalizedText.substring(topIndex + 3, Math.min(normalizedText.length, topIndex + 20));
    
    console.log(`Contexto: "${before}[TOP]${after}"`);
  } else {
    console.log('❌ A palavra "TOP" NÃO está presente no texto');
  }
}

testBradescoPatterns(simulatedBradescoText);

console.log('\n' + '='.repeat(50));
console.log('🎯 RECOMENDAÇÕES PARA CORREÇÃO:');
console.log('1. Verificar se o texto contém "SAÚDE" com acento');
console.log('2. Buscar por padrões em linhas separadas');
console.log('3. Considerar que TOP pode estar em linha diferente');
console.log('4. Adicionar logs detalhados no extrator real');