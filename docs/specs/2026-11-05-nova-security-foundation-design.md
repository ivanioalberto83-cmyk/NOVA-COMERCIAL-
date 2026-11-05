# NOVA SECURITY FOUNDATION — Especificação de Arquitectura

**Data:** 2026-11-05  
**Estado:** Proposta arquitectural aprovada para revisão documental  
**Repositório:** `ivanioalberto83-cmyk/NOVA-COMERCIAL-`  
**Branch de trabalho:** `feature/nova-security-foundation-design`  
**Base:** `feature/universo-nova-portal-v1`  
**Âmbito:** Fase 13 — primeira entrega técnica da fundação de segurança

## 1. Objectivo

Estabelecer no repositório NOVA COMERCIAL a fundação técnica inicial do NOVA SECURITY CORE, integrada na arquitectura do UNIVERSO NOVA. A fundação deverá permitir autenticação, gestão de sessões, autorização contextual, isolamento multiempresa, auditoria e protecção das APIs.

Esta especificação descreve a arquitectura e os critérios de implementação. **Não declara que qualquer serviço de segurança já esteja implementado ou operacional.**

## 2. Contexto verificado do repositório

A auditoria de leitura de 2026-11-05 confirmou:

- Repositório público `ivanioalberto83-cmyk/NOVA-COMERCIAL-`.
- Branch predefinida: `main`.
- A branch `main` contém apenas `README.md`.
- A branch `feature/universo-nova-portal-v1` contém `README.md` e `index.html`, que apresenta o portal institucional do UNIVERSO NOVA.
- O portal identifica integrações e serviços como capacidades previstas; o conteúdo consultado não demonstra backend, autenticação central, API operacional ou base de dados neste repositório.

A branch desta especificação parte de `feature/universo-nova-portal-v1` para preservar o portal existente. Não se altera `main`.

## 3. Decisões arquitecturais

### 3.1 Stack aprovada

- **Backend:** NestJS.
- **Linguagem:** TypeScript.
- **Base de dados:** PostgreSQL.
- **ORM e migrações:** Prisma.
- **Autenticação HTTP:** estratégia JWT com tokens de acesso de curta duração e sessões revogáveis.
- **Autorização:** RBAC combinado com atributos de contexto (ABAC).
- **Validação:** DTOs e validação explícita de entradas.
- **Testes:** testes unitários, integração e testes de segurança multiempresa.

A escolha da stack não constitui autorização para provisionar serviços externos ou ligar a produção.

### 3.2 Princípios

1. Zero Trust: cada pedido e cada operação são autorizados; não existe confiança implícita.
2. Menor privilégio por defeito.
3. Separação entre identidade global, associação a empresas e permissões por produto/módulo.
4. Isolamento de dados entre empresas e entre produtos.
5. Negação por defeito quando o contexto ou a autorização não puderem ser determinados.
6. Auditoria de acções sensíveis, com minimização de dados pessoais e segredos.
7. Segredos, chaves e credenciais nunca são incluídos no código ou em ficheiros versionados.
8. A interface do NOVA INDEX não é uma fronteira de segurança; a autorização é aplicada no backend.
9. Agentes de IA não recebem permissões superiores às do contexto e identidade que os autorizam.
10. Nenhuma integração obtém acesso directo e irrestrito às bases de dados de outro produto.

## 4. Arquitectura lógica

### 4.1 Camadas

- **NOVA INDEX:** ponto de entrada e experiência de navegação; não concede permissões.
- **NOVA CORE:** serviços transversais de identidade, contexto empresarial e governação, sujeitos a contratos e limites de acesso.
- **NOVA SECURITY CORE:** políticas, sessões, autorização, auditoria e controlos de segurança.
- **NOVA COMERCIAL:** produto ERP que consome os serviços autorizados e mantém os seus dados operacionais.
- **Outros produtos:** integram-se por APIs autenticadas e contratos versionados; mantêm isolamento próprio.

### 4.2 Módulos iniciais do serviço NestJS

1. `health`: estado técnico não sensível e readiness.
2. `identity`: identidade e credenciais.
3. `sessions`: criação, renovação, revogação e expiração de sessões.
4. `organizations`: associações e contexto empresarial.
5. `authorization`: políticas RBAC/ABAC e decisões de acesso.
6. `audit`: registo de eventos de segurança e acções sensíveis.
7. `security-policy`: políticas globais e parâmetros de segurança.
8. `api-clients`: identidades técnicas e credenciais de integração, numa fase controlada.

Os módulos devem ter interfaces explícitas e responsabilidades separadas. Não criar microserviços independentes nesta primeira entrega; iniciar como aplicação modular NestJS, mantendo fronteiras que permitam extracção futura quando justificada.

## 5. Identidade, autenticação e sessões

- Identificadores internos não devem depender de nomes, emails ou números de telefone.
- Credenciais de palavra-passe, caso sejam geridas localmente, devem ser protegidas com Argon2id e parâmetros revistos antes da implementação.
- Respostas de autenticação não devem revelar se uma conta existe.
- Tokens de acesso devem ter duração curta e conter apenas os atributos estritamente necessários.
- Refresh tokens devem ser aleatórios, armazenados apenas sob forma protegida (hash), rodados na renovação e revogáveis.
- A sessão deve permitir revogação por utilizador, dispositivo e evento de risco.
- MFA é obrigatório para contas privilegiadas antes da activação operacional dessas contas.
- Recuperação de conta e gestão de factores MFA exigem fluxo próprio, registo de auditoria e protecção contra abuso.
- Não armazenar tokens, palavras-passe, segredos ou códigos MFA em logs.

A escolha entre gestão local de credenciais e federação com um fornecedor de identidade deverá ser validada antes da implementação de autenticação real. A primeira implementação deve manter esta fronteira isolada para permitir integração futura sem reescrever autorização e auditoria.

## 6. Autorização RBAC + ABAC

A autorização combina:

- **RBAC:** papéis e permissões atribuídos de forma explícita.
- **ABAC:** atributos do utilizador, empresa, produto, módulo, recurso, acção, estado e contexto da sessão.
- **Escopo:** uma decisão deve incluir empresa, produto e recurso sempre que aplicável.
- **Negação por defeito:** ausência de política, contexto incompleto ou erro de avaliação resulta em acesso negado.
- **Separação de funções:** operações incompatíveis podem exigir aprovação independente.
- **Privilégios administrativos:** acesso privilegiado separado, limitado temporalmente e auditado.

Não assumir que um papel com o mesmo nome tem os mesmos poderes em todos os produtos. Os papéis devem ser associados a permissões e escopos definidos por política.

## 7. Isolamento multiempresa e multiproduto

- Cada recurso empresarial deve estar associado a um identificador de empresa/tenant.
- O tenant activo é validado no servidor a partir de uma associação autorizada; nunca é aceite apenas porque o cliente o enviou.
- As consultas e operações devem aplicar o escopo do tenant em todas as camadas relevantes.
- Testes negativos devem provar que um utilizador de uma empresa não consegue ler, alterar, enumerar ou inferir recursos de outra.
- Integrações entre produtos usam identidades técnicas, escopos e APIs explicitamente autorizados.
- Não partilhar tabelas operacionais entre produtos por conveniência.
- A eventual utilização de Row-Level Security no PostgreSQL deve ser desenhada e testada em conjunto com a camada de aplicação; não é substituída por filtros de interface.

## 8. Auditoria e eventos de segurança

O registo de auditoria deve ser append-only ao nível da aplicação, com acesso de escrita limitado ao serviço de auditoria e acesso de leitura controlado.

Campos mínimos propostos:

- identificador do evento;
- data/hora UTC;
- tipo e severidade;
- actor (utilizador ou identidade técnica);
- empresa e produto em contexto, quando aplicável;
- acção e recurso;
- resultado (permitido, negado, falhado);
- identificador de correlação;
- origem técnica minimizada, quando necessária;
- metadados não secretos e sujeitos a política de retenção.

Nunca registar palavras-passe, tokens, chaves privadas, códigos MFA ou conteúdo documental sensível sem necessidade e base devidamente avaliada. A protecção contra adulteração, retenção e exportação para armazenamento externo será uma etapa posterior, com desenho específico.

## 9. Modelo lógico inicial

O seguinte é um modelo lógico proposto, não representa tabelas já existentes:

- `security_users`
- `security_credentials`
- `security_mfa_factors`
- `security_sessions`
- `security_organizations`
- `security_memberships`
- `security_products`
- `security_roles`
- `security_permissions`
- `security_role_permissions`
- `security_membership_roles`
- `security_policies`
- `security_api_clients`
- `security_audit_events`
- `security_alerts`

As relações, índices, restrições, política de eliminação e estratégia de migrações serão detalhados no plano de implementação. Não executar migrações nesta fase documental.

## 10. Segurança das APIs

- TLS obrigatório em todos os ambientes expostos.
- Validação de esquema e limites de tamanho em todos os pedidos.
- Autenticação e autorização no servidor em cada endpoint protegido.
- Rate limiting e protecção contra abuso nos endpoints de autenticação e recuperação.
- CORS restritivo por ambiente.
- Protecção contra enumeração, replay e reutilização de refresh tokens.
- Gestão de erros sem stack traces ou dados internos expostos ao cliente.
- Versionamento de APIs e contratos explícitos para integrações.
- Segredos fornecidos por mecanismo de configuração seguro, nunca por commit.

## 11. Estrutura de código proposta

A estrutura exacta será confirmada na fase de implementação, mas a proposta inicial é:

```text
apps/
  security-api/
    src/
      modules/
        identity/
        sessions/
        organizations/
        authorization/
        audit/
        security-policy/
        api-clients/
      common/
      main.ts
    test/
packages/
  security-contracts/
  security-test-utils/
prisma/
  schema.prisma
  migrations/
docs/
  specs/
  security/
```

O portal institucional existente deve permanecer preservado. Não migrar nem substituir `index.html` nesta primeira entrega.

## 12. Estratégia de testes e critérios de aceitação

A fundação só poderá ser considerada tecnicamente validada quando existirem evidências reproduzíveis de que:

1. A aplicação arranca em ambiente local de teste sem credenciais reais.
2. Migrações são aplicadas numa base de dados descartável e o esquema pode ser validado.
3. Utilizadores não autenticados não acedem a endpoints protegidos.
4. Sessões expiradas ou revogadas são rejeitadas.
5. Refresh tokens antigos não podem ser reutilizados após rotação.
6. Um utilizador não acede a dados de outra empresa, mesmo manipulando identificadores no pedido.
7. Permissões são verificadas no servidor e não apenas na interface.
8. Ausência de política ou contexto resulta em negação.
9. Acções sensíveis geram eventos de auditoria sem expor segredos.
10. Credenciais e segredos não aparecem no repositório nem nos logs de teste.
11. Os testes unitários e de integração passam.
12. O portal institucional continua presente e inalterado.

Os resultados devem ser reportados com comandos executados, saída relevante e limitações. Não declarar conformidade legal ou certificação de segurança apenas com estes testes.

## 13. Fases de execução

### Fase 13.1-A — Esqueleto e contratos
- Estrutura NestJS/TypeScript.
- Configuração validada por ambiente.
- Contratos e modelo de domínio.
- Pipeline local de testes e lint.

### Fase 13.1-B — Persistência e identidade
- PostgreSQL e Prisma em ambiente local descartável.
- Modelo de identidade, associações e sessões.
- Autenticação inicial isolada por interface.

### Fase 13.1-C — Autorização
- RBAC/ABAC.
- Contexto empresarial e de produto.
- Testes de isolamento multiempresa.

### Fase 13.1-D — Auditoria e protecção de API
- Eventos de auditoria.
- Rate limiting, validação e tratamento seguro de erros.
- Testes negativos e revisão de segurança.

### Fase 13.1-E — Revisão e integração
- Revisão da implementação.
- Evidências de testes.
- Pull request para revisão humana.
- Sem merge, deploy ou ligação a produção sem autorização específica.

## 14. Fora do âmbito desta primeira entrega

- Deploy ou publicação em produção.
- Ligação a bases de dados de produtos existentes.
- Alterações a políticas RLS ou credenciais existentes.
- SIEM completo, SOC, threat intelligence comercial ou resposta autónoma a incidentes.
- Gestão de endpoints, rede ou dispositivos.
- Cofre de chaves de produção.
- Recuperação de desastre e restauro automático operacional.
- Certificação ou declaração de conformidade legal.
- Activação de SSO global ou federação externa sem decisão específica.

## 15. Riscos e decisões ainda abertas

1. **Fornecedor de identidade:** autenticação local inicial versus federação com fornecedor externo. A interface deve permitir ambas; decisão necessária antes de autenticação real.
2. **Ambientes e alojamento:** não há infraestrutura backend identificada no repositório; ambiente local será o primeiro alvo.
3. **Retenção de auditoria:** períodos e requisitos legais carecem de validação por jurisdição.
4. **MFA:** seleccionar métodos e processo de recuperação antes da activação de contas privilegiadas.
5. **RLS:** desenho e validação próprios antes de qualquer ligação a dados reais.
6. **Integrações:** cada produto terá de fornecer contratos e requisitos próprios; não presumir endpoints ou bases de dados.

## 16. Salvaguardas de execução

- Trabalhar apenas na branch de funcionalidade indicada.
- Preservar `main` e o portal institucional.
- Não incluir dados reais, chaves ou credenciais.
- Não executar alterações em serviços externos ou produção.
- Não aplicar migrações fora de bases de dados locais descartáveis.
- Não abrir nem integrar pull request automaticamente sem revisão.
- Cada entrega deve indicar o que foi alterado, o que foi testado e o que permanece pendente.

---

**Conclusão:** esta especificação define uma fundação modular de segurança para o UNIVERSO NOVA, alojada no repositório NOVA COMERCIAL. A sua aprovação não equivale à implementação, à operação em produção ou à certificação do sistema.
