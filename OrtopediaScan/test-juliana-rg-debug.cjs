/**
 * Debug específico para extração de nome do RG da Juliana (RS)
 */

console.log('=== DEBUG JULIANA RG - EXTRAÇÃO DE NOME ===\n');

// Texto OCR simulado baseado nos logs anteriores para RG RS
const textoJulianaRS = `16/SET/2016
VÁLIDA EM TODO O TERRITÓRIO NACIONAL
REGISTRO 7.753.319
GERAL
NOME
FILIAÇÃO
DATA DE
EXPEDIÇÃO
JULIANA COSTA DA SILVA
SERGIO LUIZ ALVES DA SILVA
MARA REGINA COSTA DA SILVA
NATURALIDADE
DATA DE NASCIMENTO
PORTO ALEGRE RS
DOC. ORIGEM
11/11/1984`;

console.log('📄 TEXTO OCR JULIANA (RS):');
console.log(textoJulianaRS);
console.log('\n📊 ANÁLISE:');
console.log('Linhas:', textoJulianaRS.split('\n').length);

// Testar padrões de nome atuais
const nomePatterns = [
  {
    name: 'Padrão 1: Nome após NOME',
    regex: /NOME[\s\n]*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+?)[\s\n]*(?:FILIACAO|FILIAÇÃO|DATA|NATURALIDADE|CPF)/i
  },
  {
    name: 'Padrão 2: Nome antes FILIAÇÃO',
    regex: /([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]*)[\s\n]*FILIAÇÃO/i
  },
  {
    name: 'Padrão 3: Entre EXPEDIÇÃO e FILIAÇÃO',
    regex: /(?:EXPEDIÇÃO|DATA\s+DE\s+EXPEDIÇÃO)[\s\n]+(?:\d{2}\/\d{2}\/\d{4}[\s\n]+)?([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]*)[\s\n]+(?:FILIAÇÃO|SERGIO|MARA)/i
  },
  {
    name: 'Padrão 4: Nome isolado em linha',
    regex: /^([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]*)$/m
  }
];

console.log('\n🔍 TESTE DOS PADRÕES:');
nomePatterns.forEach((pattern, index) => {
  console.log(`\n${pattern.name}:`);
  const match = textoJulianaRS.match(pattern.regex);
  if (match) {
    console.log(`  ✅ Match: "${match[1]}"`);
    console.log(`  🧹 Limpo: "${match[1].trim()}"`);
  } else {
    console.log('  ❌ Sem match');
  }
});

// Teste de padrão específico para o caso atual
console.log('\n🎯 PADRÕES ESPECÍFICOS PARA JULIANA:');

const padraoJuliana = /^(JULIANA\s+COSTA\s+DA\s+SILVA)$/m;
const matchJuliana = textoJulianaRS.match(padraoJuliana);
console.log('Padrão direto JULIANA:', matchJuliana ? `"${matchJuliana[1]}"` : 'Sem match');

// Buscar linha por linha
console.log('\n📋 ANÁLISE LINHA POR LINHA:');
const linhas = textoJulianaRS.split('\n').map(linha => linha.trim()).filter(linha => linha.length > 0);
linhas.forEach((linha, index) => {
  const isNome = /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}\s+[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]{3,}/.test(linha);
  console.log(`${index + 1}. "${linha}" ${isNome ? '👤 POSSÍVEL NOME' : ''}`);
});

console.log('\n💡 RECOMENDAÇÕES:');
console.log('1. Padrão simples: linha que contém exatamente "JULIANA COSTA DA SILVA"');
console.log('2. Verificar se o texto OCR real está diferente do simulado');
console.log('3. Adicionar padrão específico para capturar nome em linha isolada');
console.log('4. Considerar que nomes podem estar separados em linhas múltiplas');