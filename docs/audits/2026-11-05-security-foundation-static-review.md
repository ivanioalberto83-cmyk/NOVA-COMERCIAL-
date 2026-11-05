# Revisão estática — NOVA SECURITY FOUNDATION

**Data:** 2026-11-05  
**Repositório:** `ivanioalberto83-cmyk/NOVA-COMERCIAL-`  
**Branch revista:** `feature/nova-security-foundation-design`  
**Base documental:** `docs/specs/2026-11-05-nova-security-foundation-design.md`  
**Tipo de revisão:** leitura estática dos ficheiros do repositório; sem execução de código, testes ou migrações.

## 1. Resultado executivo

A branch contém uma fundação técnica real em NestJS, TypeScript, Prisma e PostgreSQL: identidade, credenciais, organizações, produtos, memberships, papéis, permissões, sessões e testes. Esta implementação é a referência que deve orientar a evolução do NOVA COMERCIAL.

**Não está demonstrada prontidão para produção.** A revisão identificou pontos que devem ser corrigidos ou comprovados antes de ligar esta API a dados reais ou integrar o schema `nova_comercial` no Supabase.

Não foi executado SQL no Supabase. Não foram alterados dados, tabelas, políticas, funções, credenciais ou configurações de qualquer projecto Supabase.

## 2. Evidência observada no repositório

- A especificação define NestJS modular, Prisma, PostgreSQL, RBAC + ABAC e isolamento multiempresa/multiproduto.
- As migrações existentes criam tabelas `security_*` sem declarar schema PostgreSQL dedicado; o modelo Prisma também não declara, no datasource consultado, um schema `nova_comercial`.
- A camada de persistência usa relações compostas para associar memberships, papéis e sessões à mesma organização e produto.
- O repositório de identidade verifica o estado do utilizador, organização, produto e membership.
- A sessão guarda o hash do refresh token e a renovação usa actualização condicional do hash anterior.
- O guard global exige Bearer token nas rotas não públicas.
- A função de política de autorização faz correspondência exacta de tenant, produto e permissão, com negação por defeito.
- O README declara expressamente que ainda não existe RLS, ligação às bases de dados dos produtos, MFA, recuperação de conta, rate limiting distribuído ou persistência de auditoria.

## 3. Constatações e prioridades

### P0 — Resolver antes de qualquer ligação a dados reais

1. **Definir o limite de confiança entre API e base de dados.** A API usa Prisma e o schema actual não está mapeado para `nova_comercial`. É necessário decidir e documentar a ligação pretendida, os papéis PostgreSQL, as credenciais por ambiente e a forma como a aplicação impede acesso a outros schemas. Não alterar o schema escolar `public`.
2. **Proteger a configuração de autenticação.** O serviço JWT lê `JWT_SECRET` directamente do ambiente e valida o comprimento no momento de assinar/verificar. Falta demonstrar validação de configuração no arranque, rotação e gestão segura do segredo. O segredo nunca pode ser incluído no frontend, repositório ou logs.
3. **Adicionar validação de pedidos em runtime.** O controlador recebe objectos tipados apenas em TypeScript; os tipos desaparecem em runtime. O `main.ts` consultado não configura `ValidationPipe`. Introduzir DTOs com validação explícita, rejeição de propriedades inesperadas, limites de tamanho e normalização consistente.
4. **Conter abuso de autenticação.** O bloqueio local após tentativas falhadas não substitui rate limiting por IP/conta, protecção distribuída, alertas e política de desbloqueio. A especificação já identifica rate limiting como pendente.
5. **Aplicar autorização de permissões nas rotas protegidas.** O guard global consultado autentica a sessão e anexa claims; não foi encontrada evidência, nos ficheiros revistos, de um guard/decorator que aplique a política RBAC/ABAC a cada endpoint de negócio. A função `authorize` isolada não prova que os endpoints a utilizam.
6. **Fechar o ciclo de auditoria.** Existe construção de eventos de autorização, mas o README confirma que não há persistência de auditoria. Operações privilegiadas e alterações de permissões não devem ser activadas sem registo protegido e testes correspondentes.

### P1 — Corrigir antes de declarar a fundação validada

7. **Endurecer os testes de integração destrutivos.** O teste `identity.persistence.spec.ts` executa vários `deleteMany()` sem filtro no início e no fim. O workflow usa PostgreSQL efémero, mas uma execução manual com `DATABASE_URL` apontado por engano a uma base partilhada poderia apagar dados. Exigir uma salvaguarda verificável de base descartável (por exemplo, nome de base de teste e marcador de ambiente), usar transacção/esquema isolado ou outro mecanismo que torne impossível correr limpeza global numa base não descartável.
8. **Validar a política de autorização de ponta a ponta.** Os testes unitários exercitam a função de política, mas é necessário provar que os controladores/serviços reais não aceitam tenant, produto, papel ou permissões enviados livremente pelo cliente.
9. **Rever sessões e recuperação de conta.** Confirmar comportamento concorrente na rotação de refresh tokens, revogação de todas as sessões, expiração, reutilização de token e eventos de risco. MFA e recuperação de conta continuam pendentes conforme o README e a especificação.
10. **Verificar pipeline e evidências actuais.** O ficheiro workflow define validação, migrações em PostgreSQL efémero, testes e build. Esta revisão não consultou nem executou uma corrida recente; não se declara que o pipeline esteja verde.

### P2 — Preparação de integração e operação

11. Definir mapeamento explícito entre organização/tenant do Security Core e empresa/cliente do NOVA COMERCIAL, incluindo estabelecimentos e separação entre produtos.
12. Definir contratos versionados entre NOVA INDEX, NOVA SECURITY CORE e NOVA COMERCIAL; o portal não deve ser tratado como fronteira de segurança.
13. Preparar testes de migração, backup/restauro e reversão em ambiente descartável antes de qualquer integração.
14. Definir MFA para contas privilegiadas, retenção de auditoria, monitorização e gestão de segredos por ambiente.

## 4. Decisão arquitectural recomendada

Manter o modelo existente do GitHub como fonte de verdade:
- `security_users`, `security_organizations`, `security_products`, `security_memberships`;
- `security_roles`, `security_permissions`, `security_role_permissions`, `security_membership_roles`;
- `security_sessions` e a camada NestJS/Prisma.

Não criar em paralelo uma segunda fundação com tabelas chamadas `empresas`, `membros_empresa`, `papeis` ou `subscricoes` sem primeiro reconciliar o domínio com o modelo já implementado.

Para a primeira integração com Supabase, recomenda-se manter o schema `nova_comercial` privado e acedido exclusivamente pelo backend NOVA, com credenciais restritas e validação de autorização no servidor. Esta é uma recomendação de desenho, não uma configuração já aplicada. Se for escolhida uma ligação directa PostgREST/Supabase client, terá de existir um desenho RLS completo e testado antes de conceder acesso ao schema.

## 5. Sequência de trabalho proposta

1. Fechar a decisão de acesso ao schema privado pelo backend.
2. Corrigir validação runtime, configuração, autorização efectiva e salvaguardas dos testes.
3. Acrescentar testes negativos de isolamento e de abuso de autenticação.
4. Validar migrações e testes exclusivamente numa base PostgreSQL descartável.
5. Fazer revisão de segurança e produzir evidências do workflow.
6. Só depois desenhar a migração de integração com `nova_comercial`, sem tocar em `public` escolar.

## 6. Limitações desta revisão

- Revisão estática dos ficheiros consultados; não foi executado `npm ci`, lint, build, testes ou migrações.
- Não foi consultada uma corrida recente do GitHub Actions nesta revisão.
- Não foi feita análise dinâmica, teste de penetração ou auditoria independente.
- Não foram alterados ficheiros de aplicação nem bases de dados.

**Estado:** relatório documental de revisão; sem alterações de código ou de infraestrutura.
