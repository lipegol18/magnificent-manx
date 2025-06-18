/**
 * Debug para entender a confusão entre documentos
 * 
 * Daniel (SP): RG 48.151.623-42, CPF 342.002.171-42, Data 19/DEZ/1980
 * Juliana (RS): RG 7.753.319, CPF 010.249.990-09, Data 16/SET/2016
 */

console.log('=== ANÁLISE DA CONFUSÃO DE DOCUMENTOS ===');

// Dados extraídos dos logs recentes
const ultimoProcessamento = {
  rg: '7.753.319',
  cpf: '010.249.990-09', 
  data: '2016-09-16',
  local: 'PORTO ALEGRE RS'
};

const danielEsperado = {
  rg: '48.151.623-42',
  cpf: '342.002.171-42',
  data: '19/DEZ/1980',
  local: 'SAO PAULO - SP'
};

const julianaEsperado = {
  rg: '7.753.319', // ou similar
  cpf: '010.249.990-09',
  data: '16/SET/2016', 
  local: 'PORTO ALEGRE RS'
};

console.log('\n📋 ÚLTIMO PROCESSAMENTO:');
console.log('RG:', ultimoProcessamento.rg);
console.log('CPF:', ultimoProcessamento.cpf);
console.log('Data:', ultimoProcessamento.data);
console.log('Local:', ultimoProcessamento.local);

console.log('\n🔍 IDENTIFICAÇÃO:');
if (ultimoProcessamento.cpf === danielEsperado.cpf) {
  console.log('✅ Este é o RG do DANIEL');
  console.log('❌ Mas RG está errado:', ultimoProcessamento.rg, '≠', danielEsperado.rg);
  console.log('❌ E data está errada:', ultimoProcessamento.data, '≠', danielEsperado.data);
} else if (ultimoProcessamento.cpf === julianaEsperado.cpf) {
  console.log('✅ Este é o RG da JULIANA');
  console.log('✅ RG está correto:', ultimoProcessamento.rg);
  console.log('✅ Data está correta:', ultimoProcessamento.data);
} else {
  console.log('❓ Documento não identificado');
}

console.log('\n🚨 PROBLEMAS IDENTIFICADOS:');
console.log('1. Sistema pode estar processando arquivo errado');
console.log('2. Cache ou sessão pode estar mantendo dados antigos');
console.log('3. Upload pode estar enviando arquivo diferente do esperado');

console.log('\n💡 SOLUÇÕES SUGERIDAS:');
console.log('1. Verificar qual arquivo está sendo realmente processado');
console.log('2. Limpar cache/sessão do navegador');
console.log('3. Fazer upload novamente garantindo arquivo correto');
console.log('4. Adicionar logs para identificar arquivo processado');