# NOVA CORE — contrato de alinhamento Prisma/Supabase

**Estado:** decisão técnica de implementação; não é declaração de prontidão operacional.  
**Projecto Supabase:** `rojyxfjaidyvtmsmefcf`  
**Schema de identidade:** `nova_core`

## 1. Fonte de verdade verificada

O schema `nova_core` existente contém nove tabelas:

- `organizations`
- `products`
- `organization_products`
- `memberships`
- `roles`
- `permissions`
- `role_permissions`
- `membership_roles`
- `audit_events`

A identidade de autenticação é referenciada por `memberships.user_id -> auth.users.id`. As tabelas de negócio legadas permanecem em `public`; `nova_comercial` ainda não contém tabelas.

## 2. Incompatibilidades que impedem ligar o backend actual

O Prisma actual declara modelos/tabelas `security_users`, `security_credentials`, `security_organizations`, `security_products`, `security_memberships`, `security_roles`, `security_permissions`, `security_role_permissions`, `security_membership_roles` e `security_sessions`. Esses nomes não correspondem ao schema real.

Há também diferenças semânticas que não se resolvem apenas com `@@map`:

- O utilizador real é `auth.users`, não `nova_core.security_users`.
- `memberships` não tem `product_id`; o vínculo do produto à organização está em `organization_products`.
- `roles` usa `scope` e `is_system`; não tem `organization_id` nem `product_id`.
- `permissions` usa `resource` e `action`; não tem a coluna `description` como única descrição funcional.
- `membership_roles` contém `granted_by`, não as chaves de tenant/produto declaradas no modelo actual.
- `audit_events` usa `event_type`, `action`, `outcome`, `severity` e `metadata`; não é o formato do evento TypeScript actual.
- Não foram encontradas tabelas próprias de credenciais ou sessões na fundação existente.

## 3. Arquitectura alvo

1. **Autenticação:** Supabase Auth é a autoridade de identidade e credenciais. O backend valida tokens emitidos pelo Auth; não mantém uma segunda palavra-passe nem duplica a tabela de utilizadores.
2. **Membership:** a relação utilizador-organização é `nova_core.memberships`. O backend exige membership activa para cada pedido protegido.
3. **Produto/licença:** a elegibilidade é validada em `organization_products` para o produto solicitado, com estado e janela temporal válidos.
4. **RBAC:** os papéis atribuídos ao membership são obtidos em `membership_roles`; permissões derivam de `role_permissions` e do catálogo `permissions`. A delegação exige validação no servidor e não pode ultrapassar o âmbito do actor.
5. **Sessões:** usar inicialmente a validade/revogação do token Supabase Auth. Se for necessário controlo de sessão por dispositivo ou refresh rotation própria, desenhar uma tabela complementar isolada e aprová-la antes de qualquer migração.
6. **Auditoria:** gravar eventos em `audit_events` com os campos reais, sem palavras-passe, tokens, cookies ou segredos. A tabela é append-only.
7. **Isolamento:** todas as operações de negócio recebem organização e produto do contexto autenticado; nunca confiar em tenant/product fornecidos livremente pelo cliente. Consultas e mutações devem filtrar e validar a associação no servidor.

## 4. Ordem obrigatória de implementação

- [ ] Substituir os modelos Prisma incompatíveis por modelos que representem exactamente as tabelas reais e os schemas necessários, incluindo a referência a `auth.users` apenas se a versão Prisma suportar a relação cross-schema com segurança.
- [ ] Confirmar estratégia de validação JWT Supabase (issuer, audience, assinatura/JWKS, expiração) e segredos apenas no backend.
- [ ] Implementar resolução do contexto membership + organização + produto activo.
- [ ] Implementar RBAC real por endpoint/serviço; o helper `authorize()` isolado não constitui enforcement.
- [ ] Implementar auditoria persistente usando o contrato real da tabela.
- [ ] Escrever testes negativos para tenant cruzado, produto não contratado, membership suspenso/revogado, role sem permissão e token inválido/expirado.
- [ ] Executar validação Prisma, lint, testes, build e CI numa base de dados descartável.
- [ ] Só depois propor políticas RLS client-side ou tabelas complementares. Não abrir acesso `anon`/`authenticated` por conveniência.

## 5. Guardas de segurança

- Não executar `prisma migrate deploy` contra o projecto Supabase de produção nesta fase.
- Não usar `db push` para reconciliar automaticamente os modelos.
- Não alterar as tabelas de `public` do NOVA ESCOLAR.
- Não expor `service_role` no browser, Android ou qualquer cliente.
- Manter `nova_core` sem acesso directo de `anon` e `authenticated` enquanto o backend não estiver pronto.
- Não declarar autenticação, multiempresa ou isolamento concluídos antes dos testes negativos e da verificação de CI.

## 6. Critério de aceitação

O alinhamento só fica aceite quando o Prisma reflectir o catálogo real sem drift, o backend autenticar através do Supabase Auth, cada operação protegida validar membership/produto/permissão, os eventos forem persistidos e os testes demonstrarem que uma organização não consegue aceder aos dados de outra.
