# NOVA SECURITY API

Primeiro esqueleto local do NOVA SECURITY CORE, construído com NestJS e TypeScript.

## Requisitos

- Node.js 20 ou superior
- npm

## Executar localmente

```bash
cd apps/security-api
npm install
npm run start:dev
```

A API inicia, por defeito, na porta `3001`. O endpoint `GET /health` devolve apenas o estado de disponibilidade e o identificador do serviço, sem dados de ambiente ou segredos.

## Validar

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Limites desta entrega

- O endpoint de saúde não é um mecanismo de autenticação.
- A função `evaluateAccess` é apenas uma primeira fronteira de autorização por tenant, produto e permissão explícita.
- Ainda não existe autenticação, gestão de sessões, MFA, persistência, Prisma, PostgreSQL, RBAC/ABAC completo, RLS ou API de gestão de utilizadores.
- Não ligar esta aplicação a dados reais nem a ambientes de produção.
