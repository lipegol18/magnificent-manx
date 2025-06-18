/**
 * Análise da diferença de formatação de texto entre método novo e antigo
 * Investigando se o texto OCR vem em formato diferente
 */

console.log('=== ANÁLISE: FORMATAÇÃO DE TEXTO OCR ===\n');

// Baseado nos logs recentes - formato do método antigo (com quebras de linha)
const textoMetodoAntigo = `16/SET/2016
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

// Formato que pode estar vindo do método novo (linha corrida)
const textoMetodoNovo = `16/SET/2016 VÁLIDA EM TODO O TERRITÓRIO NACIONAL REGISTRO 7.753.319 GERAL NOME FILIAÇÃO DATA DE EXPEDIÇÃO JULIANA COSTA DA SILVA SERGIO LUIZ ALVES DA SILVA MARA REGINA COSTA DA SILVA NATURALIDADE DATA DE NASCIMENTO PORTO ALEGRE RS DOC. ORIGEM 11/11/1984`;

console.log('📊 COMPARAÇÃO DE FORMATOS:\n');

console.log('🔹 MÉTODO ANTIGO (com quebras de linha):');
console.log('Linhas:', textoMetodoAntigo.split('\n').length);
console.log('Caracteres:', textoMetodoAntigo.length);
console.log('Primeiro trecho:', textoMetodoAntigo.substring(0, 100) + '...\n');

console.log('🔹 MÉTODO NOVO (linha corrida):');
console.log('Linhas:', textoMetodoNovo.split('\n').length);
console.log('Caracteres:', textoMetodoNovo.length);
console.log('Primeiro trecho:', textoMetodoNovo.substring(0, 100) + '...\n');

console.log('🔍 TESTE DE PADRÕES DE EXTRAÇÃO:\n');

// Testar padrões de nome com ambos os formatos
const patterns = [
  {
    name: 'Nome após NOME (com quebra)',
    regex: /NOME\s*\n\s*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i
  },
  {
    name: 'Nome após NOME (sem quebra)',
    regex: /NOME\s+([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+?)(?:\s+[A-Z]{2,})/i
  },
  {
    name: 'Nome antes FILIAÇÃO (com quebra)',
    regex: /([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]{10,50})\s*\n\s*FILIAÇÃO/i
  },
  {
    name: 'Nome antes FILIAÇÃO (sem quebra)',
    regex: /([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]{10,50})\s+FILIAÇÃO/i
  }
];

patterns.forEach(pattern => {
  console.log(`\n${pattern.name}:`);
  
  const matchAntigo = textoMetodoAntigo.match(pattern.regex);
  const matchNovo = textoMetodoNovo.match(pattern.regex);
  
  console.log(`  Método antigo: ${matchAntigo ? `"${matchAntigo[1]}"` : 'Sem match'}`);
  console.log(`  Método novo: ${matchNovo ? `"${matchNovo[1]}"` : 'Sem match'}`);
});

console.log('\n💡 CONCLUSÕES:');
console.log('1. Quebras de linha facilitam identificação de campos isolados');
console.log('2. Texto corrido dificulta separação entre campos');
console.log('3. Padrões regex precisam ser adaptados para cada formato');
console.log('4. Método antigo pode estar usando API diferente ou pós-processamento');

console.log('\n🎯 RECOMENDAÇÕES:');
console.log('1. Verificar qual API OCR cada método está usando');
console.log('2. Comparar parâmetros de formatação das APIs');
console.log('3. Adicionar normalização de texto se necessário');
console.log('4. Manter padrões híbridos para ambos os formatos');