# MedSync Mobile App - Mockups

Este diretório contém maquetes visuais em formato SVG das principais telas do aplicativo mobile MedSync. Essas maquetes demonstram o design, layout e fluxo de usuário planejados para a aplicação mobile.

## Telas Disponíveis

1. **Home Screen** (`home-screen.svg`)
   - Tela inicial com acesso rápido às principais funcionalidades
   - Exibe atividade recente do usuário
   - Botões de acesso direto para criação de ordem e digitalização

2. **Pacientes** (`patients-screen.svg`)
   - Lista de pacientes cadastrados
   - Informações básicas como nome, CPF, plano de saúde e idade
   - Botão para adicionar novo paciente

3. **Detalhes do Paciente** (`patient-detail-screen.svg`)
   - Informações completas do paciente
   - Lista de ordens médicas associadas
   - Documentos digitalizados do paciente

4. **Digitalização de Documento** (`scan-document-screen.svg`)
   - Interface da câmera para captura de documentos
   - Guia de enquadramento
   - Controles de captura

5. **Resultado da Digitalização** (`document-result-screen.svg`)
   - Visualização do documento capturado
   - Texto extraído por OCR
   - Categorização e salvamento do documento

6. **Catálogo OPME** (`opme-catalog-screen.svg`)
   - Lista de itens OPME disponíveis
   - Informações detalhadas como código, fabricante e preço
   - Filtros por categoria

7. **Nova Ordem Médica** (`create-order-screen.svg`)
   - Fluxo de criação de ordem em etapas
   - Seleção de hospital, paciente, procedimento e materiais
   - Progresso visual das etapas

8. **Relatórios** (`reports-screen.svg`)
   - Filtros por tipo de relatório e período
   - Visualização de dados de procedimentos, materiais ou hospitais
   - Totalizações e exportação

## Design System

As maquetes seguem o design system da aplicação web MedSync, adaptado para interfaces mobile:

- **Tema Escuro**: Fundo escuro (#121212) para melhor visualização e menor fadiga visual
- **Cores Primárias**: Tons de roxo/azul (#4f46e5) para ações principais e destaques
- **Tipografia**: Clara e legível com hierarquia de informações bem definida
- **Navegação**: Barra inferior com tabs para as principais seções do aplicativo
- **Cards**: Elementos com cantos arredondados para apresentação de informações

## Uso das Maquetes

Estas maquetes servem como referência para o desenvolvimento da versão mobile do MedSync. Elas ilustram o layout, fluxo de informações e design geral que deve ser implementado com React Native, seguindo os padrões e as diretrizes estabelecidas no [MOBILE_APP_GUIDE.md](../../MOBILE_APP_GUIDE.md).

## Tecnologia

Os mockups foram criados em formato SVG (Scalable Vector Graphics), que permite visualização em qualquer escala sem perda de qualidade. Podem ser abertos em qualquer navegador web moderno ou editor de imagens vetoriais.