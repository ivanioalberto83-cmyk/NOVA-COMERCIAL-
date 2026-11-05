# NOVA SECURITY API

Serviço modular inicial do NOVA SECURITY CORE, construído com NestJS, TypeScript, Prisma e PostgreSQL.

## Requisitos

- Node.js 20 ou superior
- npm
- Docker Compose (para PostgreSQL local descartável)

## Ambiente local

Na pasta `apps/security-api`:

```bash
cp .env.example .env
docker compose up -d postgres
npm ci
npm run db:generate
npm run db:validate
npm run db:migrate:deploy
npm run start:dev
```

A API usa a porta `3001` por defeito. O endpoint `GET /health` indica apenas disponibilidade; não é um mecanismo de autenticação.

Para eliminar o ambiente local e os dados descartáveis:

```bash
docker compose down -v
```

Os valores de `.env.example` e `compose.yaml` são exclusivamente locais e não podem ser reutilizados em ambientes partilhados ou de produção.

## Validar

```bash
npm run lint
npm run test
npm run test:e2e
npm run test:integration
npm run test:auth
npm run test:auth:integration
npm run build
```

Os testes de integração exigem uma base PostgreSQL descartável configurada em `DATABASE_URL` e a opção explícita `NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE=true`. O guard só aceita os alvos locais aprovados `nova_security_local:54329` (Docker Compose local) e `nova_security_test:5432` (PostgreSQL efémero do CI); rejeita hosts remotos, nomes de base diferentes e ausência da opção. O pipeline define a opção apenas no job que provisiona o PostgreSQL efémero. Nunca apontar estes testes a uma base partilhada ou de produção.

## Persistência e identidade já incluídas

- Identidade global por UUID, sem depender de email ou telefone como chave primária.
- Credencial separada da identidade; o campo aceita apenas hash de palavra-passe, não palavra-passe em claro.
- Empresas e produtos com estados independentes.
- Associação explícita de utilizador a empresa e produto.
- Papéis por empresa e produto, com permissões explícitas.
- Sessões ligadas à associação empresarial e ao produto por chaves estrangeiras compostas.
- Refresh token armazenado como hash; o valor em claro não é aceite nem persistido por este repositório.
- Revogação de sessão limitada à associação proprietária.
- Testes PostgreSQL para rejeitar consultas cruzadas e relações de sessão com tenant incompatível.

## Autenticação e controlo de sessões

- `POST /auth/login`, `POST /auth/refresh` e `POST /auth/logout` são rotas públicas de autenticação.
- O guard global exige Bearer token em todas as rotas não marcadas explicitamente com `@Public()`.
- O guard valida a assinatura e validade do access token e confirma a sessão na base de dados.
- A autorização confirma sessão não revogada e não expirada, utilizador activo, associação activa, empresa activa e produto activo.
- Os claims verificados são anexados ao pedido como `request.auth`; os módulos devem usar estes claims e nunca valores de tenant enviados pelo cliente.
- `GET /health` é explicitamente público e não expõe dados de identidade.
- Para cada novo endpoint público é obrigatório usar `@Public()` de forma deliberada; por defeito, o acesso é protegido.

## Limites actuais — não assumir prontidão operacional

- Não existem ainda MFA, recuperação de conta, verificação de email ou rate limiting distribuído.
- Não existe ainda RLS nem ligação às bases de dados dos produtos NOVA.
- Não existe persistência de eventos de auditoria.
- A identidade/contexto usado na autorização tem de vir de uma autenticação confiável; nunca confiar em tenant ou permissões enviados livremente pelo cliente.
- O PostgreSQL local é descartável. Não ligar este serviço a dados reais ou produção.

A presença de schema, migrações e repositório não prova, por si só, que a segurança está validada. A validação depende dos resultados do pipeline e de revisão independente.
