# NOVA SECURITY API

Serviço NestJS/TypeScript do UNIVERSO NOVA. Esta API está em construção e não deve ser considerada pronta para produção.

## Requisitos

- Node.js 20+
- npm
- PostgreSQL 17 descartável para testes
- Docker Compose e cliente PostgreSQL `psql`

## Schemas e fontes de verdade

- `auth`: Supabase Auth é a autoridade de identidade, palavra-passe e refresh tokens.
- `nova_core`: organizações, produtos, memberships, subscrições de produto, papéis, permissões e auditoria.
- `nova_comercial`: dados operacionais do ERP; a migração inicial está preparada separadamente.
- `public`: estruturas legadas do NOVA ESCOLAR; não alterar neste trabalho.

A API usa consultas parametrizadas para resolver memberships e permissões no `nova_core` real. O schema Prisma existente ainda contém modelos legados incompatíveis e está em reconciliação; por isso, não executar migrações Prisma no Supabase partilhado nem usar `db push`.

## Configuração local

Copiar `.env.example` para `.env` e definir:
- `DATABASE_URL`: ligação ao PostgreSQL descartável, com `schema=nova_core`.
- `SUPABASE_URL`: URL do projecto Supabase.
- `SUPABASE_ANON_KEY`: chave publishable/anon do projecto.

Não colocar a chave `service_role`, JWT signing secret, palavras-passe ou tokens em ficheiros versionados. A chave publishable/anon não substitui a autorização do backend.

## Autenticação actual em desenvolvimento

- `POST /auth/login`: autentica credenciais através do Supabase Auth e confirma membership activa e acesso ao produto em `organization_products`.
- `POST /auth/refresh`: renova a sessão através do Supabase Auth e volta a confirmar membership e entitlement.
- `POST /auth/logout`: termina a sessão Supabase usando o Bearer token.
- Rotas protegidas exigem Bearer token, `x-organization-id` e `x-product-code`.
- O backend valida o token no endpoint `/auth/v1/user` do Supabase Auth e resolve novamente membership, organização, produto, papéis e permissões no servidor. Os cabeçalhos são apenas uma selecção de contexto; não concedem acesso por si.
- O `AuthorizationGuard` exige as permissões declaradas por endpoint com `@RequirePermissions(...)`.

A validação remota do utilizador em cada pedido é uma primeira implementação segura, mas acrescenta latência e deverá ser substituída por validação local de JWT/JWKS quando o algoritmo, issuer, audience e chaves do projecto estiverem confirmados. Não assumir HS256 nem distribuir segredos de assinatura.

## Dados mestres NOVA COMERCIAL

A migração SQL independente encontra-se em:
`database/nova_comercial/migrations/20261110000100_master_data_foundation.sql`

Cria onze tabelas: filiais, períodos fiscais, moedas, unidades, códigos fiscais, meios de pagamento, clientes, fornecedores, categorias, artigos/serviços e armazéns. Todas são isoladas por `organization_id`, com FKs compostas, RLS activo e sem acesso directo de `anon`/ `authenticated`.

A migração ainda não foi aplicada ao Supabase. A taxa de imposto e a configuração fiscal angolana devem ser validadas com a legislação AGT e o regime fiscal da entidade antes de utilização operacional.

## Testes

A pipeline usa PostgreSQL descartável. Comandos disponíveis:
```bash
npm ci
npm run db:generate
npm run db:validate
npm run lint
npm run test
npm run test:auth
npm run test:erp:contract
npm run test:e2e
npm run build
```

Os testes de integração antigos que usam os modelos Prisma legados ainda precisam de ser substituídos por testes contra o contrato real Supabase. Não executar testes destrutivos contra bases partilhadas ou de produção.

## Limitações ainda abertas

- Reconciliação completa do `schema.prisma` com as nove tabelas reais de `nova_core`.
- Remoção dos fluxos legados de autenticação e testes que dependem de tabelas `security_*`.
- Testes de integração reais para membership, produto, RBAC e isolamento multiempresa.
- Auditoria persistente em `audit_events`.
- CRUD de dados mestres com autorização por permissão.
- UI do NOVA COMERCIAL e módulos transaccionais.
- Revisão e execução controlada da migração em PostgreSQL descartável; aprovação separada antes de qualquer alteração no Supabase partilhado.

## Regra de produção

Não executar migrações, alterações de schema, políticas RLS ou operações de dados no projecto Supabase partilhado sem autorização explícita para a alteração concreta. O desenvolvimento desta branch não implica deploy de produção.
