# UNIVERSO NOVA — Identidade Visual e Design System

**Data:** 2026-11-05  
**Versão:** 1.0  
**Estado:** Implementação inicial na branch de desenvolvimento; sujeito a revisão visual final.  
**Direcção aprovada:** Executivo Premium.  
**Tema padrão:** Claro. **Tema alternativo:** Escuro opcional.

## 1. Objectivo

Estabelecer uma identidade transversal para o UNIVERSO NOVA, com ambiente empresarial luminoso, acolhedor, sofisticado e legível. A identidade deve transmitir profissionalismo, confiança, modernidade, clareza operacional e coerência entre produtos.

## 2. Identidade cromática

| Token | Valor | Utilização |
|---|---|---|
| brand-primary | #294766 | Azul institucional |
| brand-secondary | #527493 | Azul secundário |
| brand-accent | #B58B50 | Dourado discreto |
| background | #F5F6F4 | Fundo principal |
| surface | #FFFFFF | Cartões e painéis |
| surface-soft | #EDF1F3 | Superfícies secundárias |
| text-primary | #263442 | Texto principal |
| text-secondary | #64717D | Texto secundário com contraste AA sobre o fundo principal |
| border | #DCE3E7 | Separadores |
| success | #34765A | Sucesso |
| warning | #A96E24 | Avisos |
| danger | #B94A48 | Erros |

## 3. Tipografia

Inter é a família tipográfica de referência, com alternativas de sistema. A hierarquia utiliza títulos destacados, texto de leitura confortável e informação auxiliar legível. Indicadores numéricos devem manter alinhamento consistente.

## 4. Layout e componentes

- Cabeçalho compacto com marca, navegação e controlo de tema.
- Fundo geral claro e superfícies brancas.
- Navegação discreta, com estados activos claros.
- Cartões com contornos suaves, espaçamento generoso e sombras subtis.
- Botões com hierarquia visual clara.
- Tabelas, formulários, alertas e gráficos devem reutilizar os mesmos tokens.
- Layout responsivo para computador, tablet e telemóvel.
- Foco de teclado visível e movimento reduzido respeitado.

## 5. Modo escuro

O tema claro é o padrão. O tema escuro é opcional, accionado pelo utilizador e guardado localmente no navegador. A preferência visual não altera autenticação, autorização ou permissões.

Tokens escuros comuns às duas páginas:

| Token | Valor |
|---|---|
| background | #17212B |
| surface | #202D38 |
| surface-soft | #293947 |
| border | #3B4B59 |
| text-primary | #F5F6F4 |
| text-secondary | #B6C1CB |
| brand-primary | #7FA5C4 |
| brand-secondary | #9DBCD5 |
| brand-contrast | #17212B |
| brand-accent | #D9B77A |

O dourado #B58B50 é reservado a acentos gráficos e não a texto corrido sobre superfícies claras ou fundos de marca. Em blocos CTA, os rótulos usam a cor de contraste do próprio bloco; o azul secundário é usado nos pequenos textos sobre superfícies claras. Os textos auxiliares usam #64717D para cumprir o contraste mínimo WCAG 2.1 AA no fundo #F5F6F4.

## 6. Logótipo

Foi criado o primeiro lockup vectorial do UNIVERSO NOVA em assets/galeria/universo-nova-logo-oficial.svg. O símbolo combina um N azul com uma órbita dourada; o wordmark usa azul institucional. A composição inclui “ECOSSISTEMA DIGITAL” e o lema “Inovar • Integrar • Crescer”.

O logótipo é a primeira versão gráfica integrada nesta branch. A validação final de marca deverá incluir legibilidade em tamanhos pequenos, versões monocromáticas, fundos claros/escuros e exportações para favicon e aplicações.

## 7. Âmbito implementado

- Actualização da apresentação visual de index.html e comercial/index.html com os mesmos tokens cromáticos.
- Tema claro e escuro alinhados nas duas páginas, com contraste de texto secundário corrigido.
- Inclusão do logótipo vectorial em assets/galeria/.
- Tema claro como padrão e alternância para tema escuro.
- Preservação do conteúdo institucional, navegação e ligações de produtos existentes.

## 8. Fora do âmbito

- Alterações à branch main.
- Alterações a bases de dados, NOVA CORE, autenticação ou permissões.
- Deploy ou publicação em produção.
- Criação de logótipos específicos dos produtos.
- Alterações aos destinos externos dos produtos.

## 9. Critérios de verificação

1. O portal apresenta o logótipo a partir do caminho relativo versionado.
2. O tema claro é apresentado por defeito.
3. O botão alterna entre claro e escuro e conserva a preferência local.
4. A navegação e as ligações originais permanecem presentes.
5. Os layouts adaptam-se a ecrãs pequenos.
6. O HTML, CSS e JavaScript são inspeccionados e validados antes de qualquer PR ou deploy.
7. A identidade mantém contraste legível e foco visível.

## 10. Estado

A implementação inicial encontra-se limitada à branch feature/universo-nova-portal-v1. Não foi alterada a branch main nem foi efectuado deploy. A revisão visual em navegadores e dispositivos reais continua necessária antes de considerar a identidade finalizada.
