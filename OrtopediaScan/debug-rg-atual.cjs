/**
 * Debug do texto OCR real que está sendo processado
 * Baseado nos logs: RG "7.753.319", CPF "010.249.990-09", data "16/SET/2016"
 * Lugar: "PORTO ALEGRE RS" - parece ser um RG do RS, não da Juliana
 */

// Texto simulado baseado nos dados extraídos dos logs
const textoReal = `INSTITUTO GERAL DE PERÍCIAS
GOVERNO DO ESTADO DO RIO GRANDE DO SUL
SECRETARIA DA SEGURANÇA PÚBLICA
REGISTRO GERAL
RG 7.753.319
NOME JULIANA SILVA MARTINS
FILIACAO
PAI: ANTONIO SILVA MARTINS
MAE: HELENA PEREIRA SILVA
DATA DE NASCIMENTO 16/SET/2016
NATURALIDADE PORTO ALEGRE RS
CPF 010.249.990-09
DATA DE EXPEDIÇÃO 21/DEZ/2012`;

// Também teste com formato mais próximo do log real
const textoComProblema = `REGISTRO 7.753.319 GERAL NOME
FILIACAO
DATA DE NASCIMENTO PORTO ALEGRE RS
16/SET/2016
CPF 010.249.990-09`;

function debugExtracao(texto, nome) {
  console.log(`\n=== DEBUG ${nome} ===`);
  console.log('Texto:', texto);
  
  // Padrões atuais do sistema
  const patterns = [
    /\*\s*RG\s+[\d\.-]+\s*\*\s*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i,
    /RG\s+[\d\.-]+\s*\n\s*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i,
    /(?:REGISTRO|RG|GERAL)[\s\S]*?\n\s*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]{10,50})\s*\n/i,
    /([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]{10,50})\s*\n?\s*FILIACAO/i,
    /RG[\s\d\.-]+\s*\*?\s*\n?\s*([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i
  ];
  
  patterns.forEach((pattern, i) => {
    const match = texto.match(pattern);
    console.log(`Padrão ${i+1}: ${match ? `"${match[1]}"` : 'Sem match'}`);
  });
  
  // Teste de padrões mais específicos para o formato atual
  console.log('\n--- Padrões específicos ---');
  
  // Buscar nome após "NOME"
  const nomeMatch = texto.match(/NOME\s+([A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]+)/i);
  console.log('Nome após NOME:', nomeMatch ? `"${nomeMatch[1]}"` : 'Sem match');
  
  // Buscar linhas que podem ser nomes
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log('\nLinhas do texto:');
  linhas.forEach((linha, i) => {
    const isNome = /^[A-ZÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ\s]{10,50}$/.test(linha) && 
                   !/REGISTRO|GERAL|FILIACAO|DATA|NASCIMENTO|NATURALIDADE|CPF|EXPEDIÇÃO/i.test(linha);
    console.log(`${i}: "${linha}" ${isNome ? '← POSSÍVEL NOME' : ''}`);
  });
}

debugExtracao(textoReal, 'TEXTO SIMULADO');
debugExtracao(textoComProblema, 'TEXTO COM PROBLEMA');