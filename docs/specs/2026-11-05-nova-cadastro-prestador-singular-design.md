# UNIVERSO NOVA
## Especificação Técnica — Cadastro de Prestador de Serviços Singular

- **Data:** 2026-11-05
- **Estado:** Versão para revisão do utilizador
- **Produto:** NOVA COMERCIAL
- **Arquitectura:** Híbrida — NOVA CORE + NOVA COMERCIAL + NOVA BILLING
- **Branch:** `feature/nova-singular-provider-registration-design`

---

## 1. Objectivo e âmbito

Definir o cadastro autónomo de Prestadores de Serviços Singulares no UNIVERSO NOVA, permitindo inscrição, identificação, gestão profissional e fiscal e, quando legalmente elegível, acesso à facturação.

O cadastro de Prestador Singular é um percurso independente do cadastro de Empresa/Colectivo.

Esta especificação cobre o desenho funcional e os contratos lógicos entre módulos. Não declara qualquer funcionalidade como implementada ou activa.

## 2. Arquitectura e responsabilidades

### 2.1 NOVA CORE

Responsável por:
- Identidade global da conta.
- Autenticação e gestão de sessões.
- Credenciais e recuperação de acesso.
- Permissões e controlo de acesso.
- Estado global da conta.

O NOVA CORE deve manter apenas os dados de identidade necessários à autenticação e à gestão da conta. Não deve duplicar desnecessariamente os dados profissionais e fiscais do NOVA COMERCIAL.

### 2.2 NOVA COMERCIAL

Responsável por:
- Perfil profissional do prestador.
- Dados pessoais e de identificação necessários ao cadastro.
- Actividade económica e serviços prestados.
- Dados fiscais e situação cadastral.
- Elegibilidade para funcionalidades comerciais e fiscais.
- Histórico e auditoria das operações do cadastro.

### 2.3 NOVA BILLING / Motor Fiscal

Responsável por:
- Gestão de planos e subscrições.
- Verificação das condições de acesso à facturação.
- Aplicação de regras fiscais configuradas e legalmente validadas.
- Preparação de integração com mecanismos oficiais da AGT.

A arquitectura não pressupõe que SSO ou integração AGT estejam activos.

## 3. Tipos de cadastro

O sistema disponibilizará dois percursos independentes:
1. **Empresa / Colectivo**.
2. **Prestador de Serviços Singular**.

A escolha do tipo de cadastro determina os campos, validações e regras aplicáveis. Os registos de um tipo não devem ser convertidos implicitamente no outro.

## 4. Dados do Prestador Singular

### 4.1 Identificação
- Número do Bilhete de Identidade — obrigatório.
- Nome completo conforme o documento.
- Data de nascimento.
- Nacionalidade.
- Data de emissão e validade, quando aplicável.

Não será obrigatório carregar imagens da frente e do verso do BI. Qualquer recolha adicional dependerá de necessidade legal demonstrada e de aprovação própria.

### 4.2 Dados fiscais
- NIF.
- Situação cadastral perante a AGT.
- Actividade económica.
- Enquadramento tributário.
- Regime fiscal aplicável, após validação.

### 4.3 Dados profissionais
- Actividade profissional.
- Serviços prestados.
- Descrição da actividade.
- Contactos profissionais.

### 4.4 Contactos e endereço
- Telefone.
- Correio electrónico.
- Endereço.
- Localidade e província.

A implementação deverá recolher apenas os dados necessários à finalidade declarada e às obrigações legais aplicáveis.

## 5. Fluxo de cadastro

1. Criar conta no NOVA CORE.
2. Escolher o percurso Prestador de Serviços Singular.
3. Preencher os dados de identificação.
4. Registar contactos e endereço.
5. Indicar a actividade profissional.
6. Declarar a situação fiscal e informar o NIF, se disponível.
7. Aceitar as declarações e consentimentos aplicáveis.
8. Submeter o cadastro.
9. Executar as verificações necessárias.
10. Activar apenas as funcionalidades permitidas.

O fluxo deverá permitir guardar um rascunho e retomar o preenchimento sem expor dados pessoais a utilizadores não autorizados.

## 6. Cadastro sem NIF

O sistema permitirá iniciar e submeter o cadastro sem NIF, quando legalmente admissível.

O estado será **Pendente de regularização fiscal**.

Nesse estado:
- O utilizador poderá consultar e completar o seu perfil.
- Poderá actualizar os dados permitidos.
- Receberá orientação para regularização fiscal.
- Não poderá emitir facturas quando a legislação exigir NIF e validação fiscal.

A ausência de NIF não será tratada como aprovação fiscal nem como dispensa de obrigações legais.

## 7. Estados do cadastro

| Estado | Descrição |
|---|---|
| Rascunho | Cadastro incompleto |
| Pendente de regularização fiscal | Falta regularização necessária |
| Em validação | Dados submetidos para verificação |
| Validado | Dados e enquadramento confirmados |
| Activo | Funcionalidades autorizadas disponíveis |
| Suspenso | Conta ou actividade temporariamente suspensa |
| Rejeitado | Cadastro não aprovado, com motivo registado |

As transições entre estados deverão ser controladas por regras explícitas, permissões e registo de auditoria. A passagem a **Activo** não deve, por si só, conceder elegibilidade fiscal que não tenha sido verificada.

## 8. Protecção de dados e segurança

- Dados pessoais e fiscais em armazenamento privado.
- Controlo de acesso baseado em funções e permissões.
- Separação entre identidade, perfil profissional e informação fiscal.
- BI oculto em relatórios gerais e notificações.
- Registo de consultas e alterações relevantes.
- Protecção contra acesso entre contas e empresas.
- Conservação e eliminação segundo os prazos e obrigações legais aplicáveis.
- Credenciais privilegiadas nunca disponibilizadas no frontend.
- Dados sensíveis não devem ser usados como identificadores públicos nem incluídos em logs técnicos desnecessários.

O acesso administrativo a dados pessoais deverá ser limitado, justificado e auditável.

## 9. Comunicação entre módulos

### NOVA CORE → NOVA COMERCIAL

Transmissão do identificador da conta e do contexto de autenticação autorizado. O NOVA COMERCIAL associa o seu perfil profissional à identidade global sem duplicar credenciais.

### NOVA COMERCIAL → NOVA CORE

Pedidos de alteração do estado global da conta ou de permissões, através de contratos de integração definidos e validados.

### NOVA COMERCIAL → NOVA BILLING

Transmissão do estado mínimo de elegibilidade necessário à contratação e facturação. Não transmitir o número do BI ou outros dados pessoais sem necessidade demonstrada.

### Motor Fiscal → AGT

Integração apenas através de mecanismos oficiais documentados e autorizados.

Todas as interfaces deverão possuir autenticação, autorização, validação de dados, protecção contra repetição indevida de operações, tratamento de falhas e rastreabilidade. A indisponibilidade de um módulo não deverá provocar activação permissiva por defeito.

## 10. Regras do motor fiscal

O motor fiscal deverá considerar:
- Tipo de contribuinte.
- Actividade económica.
- Enquadramento tributário.
- Regime fiscal aplicável.
- Obrigações e regras em vigor.
- Tipo de documento fiscal permitido.

Não serão inventadas taxas, isenções, regimes ou regras fiscais. As regras deverão ter fonte normativa, data de vigência, versão e processo de revisão.

A emissão de documentos não poderá ser apresentada como validada pela AGT sem confirmação efectiva através do mecanismo oficial aplicável.

A numeração, séries, impostos, arquivo e documentos rectificativos deverão respeitar as regras legais e técnicas confirmadas. A integração oficial AGT constitui um trabalho separado, dependente de documentação e autorização.

## 11. Tratamento de erros e situações excepcionais

| Situação | Comportamento esperado |
|---|---|
| BI duplicado | Impedir duplicação automática e encaminhar para verificação segura |
| NIF inválido | Manter cadastro sem habilitar facturação |
| Dados inconsistentes | Colocar em validação e indicar os campos a corrigir |
| Falha de comunicação entre módulos | Não activar permissões por defeito; permitir repetição segura |
| AGT indisponível | Não declarar validação fiscal externa |
| Acesso não autorizado | Negar acesso e registar ocorrência sem expor dados sensíveis |
| Falha de gravação | Informar o utilizador e preservar a integridade dos dados |
| Repetição de submissão | Evitar duplicação de registos e operações |

## 12. Testes de aceitação

1. Cadastro singular sem NIF.
2. Cadastro singular com NIF informado.
3. Bloqueio de facturação sem elegibilidade.
4. Detecção e tratamento de BI duplicado.
5. Separação de dados entre empresas e prestadores.
6. Protecção contra acesso indevido a dados pessoais.
7. Suspensão e reactivação de conta.
8. Falha de comunicação entre módulos.
9. Registo de auditoria das operações relevantes.
10. Verificação de permissões e isolamento entre organizações.
11. Integridade dos dados após operações interrompidas ou repetidas.
12. Preservação integral dos módulos escolares no projecto Supabase partilhado.
13. Ausência de dados pessoais sensíveis em logs, notificações e relatórios gerais.
14. Verificação de que estados pendentes ou inválidos nunca habilitam facturação.

## 13. Limites e exclusões

Esta especificação não declara como existentes ou activos:
- SSO global.
- Consulta automática de BI.
- Integração AGT.
- Certificação de facturação electrónica.
- Validação fiscal automática.
- Motor fiscal em produção.

A implementação destes elementos dependerá de documentação, validação técnica, enquadramento legal e autorizações próprias.

## 14. Estratégia de implementação futura

Após revisão e aprovação desta especificação:
1. Preparar plano técnico de implementação.
2. Auditar novamente os ficheiros, branches e interfaces existentes no GitHub.
3. Identificar componentes reutilizáveis e dependências.
4. Preparar alterações numa branch própria.
5. Implementar com testes automatizados e revisão de segurança.
6. Validar isolamento, segurança e regressões.
7. Apresentar resultados e evidências antes de qualquer deploy.

A aprovação desta especificação não autoriza, por si só, migrações, alterações de produção, integração externa ou deploy.

## 15. Regra de preservação

O desenvolvimento deverá aproveitar a estrutura existente do repositório `ivanioalberto83-cmyk/NOVA-COMERCIAL-`, sem criar uma arquitectura paralela.

No Supabase NOVA TODDLE ESCOLAR (`rojyxfjaidyvtmsmefcf`), o schema `nova_comercial` deverá permanecer isolado do schema escolar `public`.

Nenhuma alteração às tabelas escolares, políticas RLS, autenticação, armazenamento, funções ou dados escolares será permitida por esta especificação.

---

**Fim da especificação — versão para revisão do utilizador.**
