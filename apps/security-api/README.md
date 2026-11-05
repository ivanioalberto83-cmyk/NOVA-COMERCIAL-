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
npm run build
```

Os testes de integração exigem uma base PostgreSQL descartável configurada em `DATABASE_URL`. O pipeline cria um PostgreSQL efémero, valida o schema, aplica as migrações e executa os testes de isolamento.

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

## Limites actuais — não assumir prontidão operacional

- Não existe ainda fluxo HTTP de registo, login, recuperação de conta ou MFA.
- Não existe ainda hashing Argon2id implementado nem gestão de credenciais.
- Não existe emissão, rotação ou validação de JWT/refresh tokens.
- Não existe RLS nem ligação às bases de dados dos produtos NOVA.
- Não existe persistência de eventos de auditoria.
- A identidade/contexto usado na autorização tem de vir de uma autenticação confiável; nunca confiar em tenant ou permissões enviados livremente pelo cliente.
- O PostgreSQL local é descartável. Não ligar este serviço a dados reais ou produção.

A presença de schema, migrações e repositório não prova, por si só, que a segurança está validada. A validação depende dos resultados do pipeline e de revisão independente.
