# ERP Master v2.0 — Guia de Setup Completo

## Pré-requisitos
- Node.js 20+
- Git
- Conta Supabase (supabase.com)
- Conta Vercel (vercel.com)
- Conta Doppler (doppler.com)
- Domínio masteretiquetas.com no GoDaddy ✅ (já configurado)

---

## PASSO 1 — Repositório GitHub

```bash
# Crie o repositório em github.com (privado)
# Depois:
cd erp-master
git init
git add .
git commit -m "feat: initial ERP Master v2.0 structure"
git remote add origin https://github.com/SEU_USER/erp-master.git
git push -u origin main
```

---

## PASSO 2 — Supabase

1. Acesse [supabase.com](https://supabase.com) → New Project
2. Nome: `erp-master` | Região: **South America (São Paulo)**
3. Anote: `Project URL`, `anon key`, `service_role key`
4. Dashboard → **Settings → Database → Extensions**:
   - Habilite: `pg_cron`, `pg_net`, `vector`, `pg_trgm`, `unaccent`
5. Execute as migrations:

```bash
# Instale Supabase CLI
npm install -g supabase

# Link ao projeto
supabase login
supabase link --project-ref SEU_PROJECT_REF

# Executa todas as migrations
supabase db push

# Gera tipos TypeScript
npm run db:types
```

6. **Auth → Settings**:
   - Disable "Enable email confirmations" em desenvolvimento
   - Site URL: `https://erp.masteretiquetas.com`
   - Redirect URLs: adicione todos os subdomínios

---

## PASSO 3 — Doppler (Secrets)

```bash
# Instale Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# Login
doppler login

# Crie o projeto
doppler projects create erp-master

# Configure os secrets (baseado em infra/doppler/secrets.template.env)
doppler secrets set NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
doppler secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
# ... (configure todos os secrets do template)
```

No Vercel:
1. Acesse marketplace.vercel.com → Doppler
2. Instale a integração e vincule o projeto `erp-master`

---

## PASSO 4 — Cloudflare DNS

1. Acesse [cloudflare.com](https://cloudflare.com) → Add a Site → `masteretiquetas.com`
2. Copie os 2 nameservers fornecidos
3. No GoDaddy: **Meus Produtos → masteretiquetas.com → DNS → Nameservers → Personalizado**
4. Cole os nameservers do Cloudflare
5. **Aguarde propagação** (até 48h — geralmente < 2h)
6. No Cloudflare, crie os registros DNS conforme `infra/cloudflare/dns-config.yaml`
7. Configure SSL/TLS: **Full (strict)**, HSTS habilitado, Always HTTPS

> ⚠️ NÃO alterar o registro `whatsapp.masteretiquetas.com` — ZapConnect está em produção!

---

## PASSO 5 — Vercel

```bash
# Instale Vercel CLI
npm install -g vercel

# Para CADA app:
cd apps/erp && vercel --name erp-master-erp
# Defina domínio: erp.masteretiquetas.com

cd apps/ecommerce && vercel --name erp-master-ecommerce
# Defina domínio: masteretiquetas.com

cd apps/portal-cliente && vercel --name erp-master-portal-cliente
# Defina domínio: cliente.masteretiquetas.com

cd apps/portal-representante && vercel --name erp-master-portal-representante
# Defina domínio: representante.masteretiquetas.com

cd apps/portal-fornecedor && vercel --name erp-master-portal-fornecedor
# Defina domínio: fornecedor.masteretiquetas.com
```

---

## PASSO 6 — Telegram Bot (CEO)

1. No Telegram, fale com @BotFather → `/newbot`
2. Nome: `ERP Master Bot` | Username: `erp_master_bot`
3. Copie o token para o Doppler: `TELEGRAM_BOT_TOKEN`
4. Envie uma mensagem ao bot e fale com @userinfobot para obter o `chat_id`
5. Configure `TELEGRAM_CEO_CHAT_ID` no Doppler
6. Registre o webhook:

```bash
curl -X POST "https://api.telegram.org/botSEU_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://erp.masteretiquetas.com/api/webhooks/telegram",
    "secret_token": "SEU_WEBHOOK_SECRET"
  }'
```

---

## PASSO 7 — Integração ZapConnect

No ZapConnect (`whatsapp.masteretiquetas.com`):
1. Gere uma API key interna para o ERP
2. Configure o webhook de saída para: `https://erp.masteretiquetas.com/api/webhooks/zapconnect`
3. Configure a assinatura HMAC com o secret definido em `ZAPCONNECT_WEBHOOK_SECRET`
4. Teste com evento de NPS pós-entrega

---

## PASSO 8 — Primeiro usuário (CEO)

```sql
-- Execute no Supabase SQL Editor após criar o usuário no Auth
INSERT INTO public.usuarios (id, nome, email, perfil, status, mfa_ativo)
VALUES (
  'UUID_DO_AUTH_USER',    -- copiar do Supabase Auth
  'Judson',
  'judson@masteretiquetas.com',
  'ceo',
  'ativo',
  false                   -- ativar MFA depois do primeiro login
);
```

---

## PASSO 9 — Desenvolvimento local

```bash
# Instala dependências
npm install

# Copia secrets do Doppler
doppler run -- npm run dev

# OU cria .env.local manualmente com os valores de desenvolvimento
cp infra/doppler/secrets.template.env .env.local
# Preencha os valores

# Sobe apenas o ERP
npm run dev:erp
```

Acesse: http://localhost:3000

---

## Checklist de Go-Live

- [ ] Supabase: migrations aplicadas, RLS testado
- [ ] Cloudflare: todos os subdomínios resolvendo com SSL
- [ ] Doppler: todos os secrets configurados em `production`
- [ ] Vercel: 5 apps deployadas e com domínio personalizado
- [ ] Telegram: bot respondendo, CEO testou aprovação
- [ ] ZapConnect: webhook integrado e testado
- [ ] Primeiro usuário CEO criado e logado com sucesso
- [ ] MFA ativado para o CEO
