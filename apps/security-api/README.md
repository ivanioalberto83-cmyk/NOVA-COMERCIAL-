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

## Fundação de autorização

- `src/security/authorization.ts`: verificação mínima de compatibilidade de tenant, produto e permissão.
- `src/security/policy.ts`: decisão de autorização fail-closed, isolamento por tenant e produto, delegação limitada a permissões explicitamente delegáveis e estrutura de evento de auditoria.
- Os nomes de funções/cargos não concedem permissões implicitamente; cada acção exige uma permissão exacta.
- A delegação não pode exceder as listas explícitas `grantableRoles` e `grantablePermissions` do actor.
- Eventos de auditoria são apenas estruturas em memória. Não existe ainda persistência, cadeia de integridade, retenção ou exportação.

## Limites e segurança operacional

- O endpoint de saúde não é um mecanismo de autenticação.
- Ainda não existe autenticação, gestão de sessões, MFA, persistência, Prisma, PostgreSQL, RBAC/ABAC completo, RLS ou API de gestão de utilizadores.
- A identidade e as permissões recebidas por estas funções têm de ser validadas por uma camada de autenticação confiável antes de serem usadas numa API real.
- Não ligar esta aplicação a dados reais nem a ambientes de produção.
- Esta fundação não substitui políticas de segurança na base de dados; o isolamento multiempresa tem de ser aplicado também no armazenamento e validado por testes de integração.
