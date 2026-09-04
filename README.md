# Vaelis Indoor — Mídia Indoor para Smart TVs

Plataforma SaaS multi-tenant de **mídia indoor (digital signage)**: cada estabelecimento monta
playlists de vídeos e imagens hospedadas no **Cloudflare R2**, e a TV toca essa programação com
uma **trilha sonora do Spotify** por cima, controlada remotamente pelo painel.

---

## Como funciona

```
Painel do cliente ──> Firestore ──> Player na TV ──> Cloudflare R2 (vídeos/imagens)
       │                                  │
       └──── comandos de música ──────────┴──> Spotify Web Playback SDK (áudio)
```

1. O super admin cadastra o estabelecimento. O sistema cria o acesso ao painel, uma playlist
   padrão e a primeira tela, com um **código de pareamento** de 6 caracteres.
2. No dispositivo ligado à TV, abre-se `/tv` e digita-se o código **uma única vez**. A tela guarda
   um segredo de dispositivo no navegador e passa a se autenticar sozinha.
3. O cliente envia vídeos pelo painel. O arquivo vai **direto do navegador para o R2** por URL
   presignada, sem passar pelo servidor.
4. A tela busca a programação a cada minuto, reporta presença e se registra como um **dispositivo
   Spotify**. O painel manda tocar, pausar, pular faixa e ajustar volume naquela TV específica.

### Áudio: vídeo x música

Cada item da playlist decide quem manda no som:

- **Vídeo mudo** (padrão): a música do Spotify segue tocando por cima.
- **Vídeo com áudio**: a música pausa enquanto o vídeo toca e volta ao terminar.

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript 5.7**
- **Tailwind CSS 3.4** e **lucide-react**
- **Firebase Firestore** — único banco de dados da plataforma
- **Cloudflare R2** (SDK S3) — armazenamento das mídias
- **Spotify Web Playback SDK** + Web API — trilha sonora
- **Upstash Redis** — rate limit de login e pareamento (opcional)

---

## Estrutura

```text
apps/web/src/
├── app/
│   ├── (admin)/admin/            # Painel da plataforma: clientes e telas
│   ├── (auth)/                   # Login, esqueci-senha e redefinir-senha
│   ├── (tenant)/tenant/[id]/     # Painel do estabelecimento (5 abas)
│   ├── tv/                       # Pareamento da TV
│   ├── tv/[screenId]/            # Player de exibição
│   └── api/
│       ├── auth/                 # Login, sessão e OAuth do Spotify
│       ├── screen/               # Rotas consumidas pelo player da TV
│       ├── tenant/[id]/          # Telas, playlists, biblioteca, música
│       ├── tenants/              # CRUD de clientes (super admin)
│       └── upload/               # URLs presignadas do R2
├── components/panel/             # Abas do painel do estabelecimento
├── components/tv/                # Overlays da tela
├── hooks/useSpotifyPlayer.ts     # Web Playback SDK
└── lib/                          # Domínio, Firestore, R2, Spotify, sessão
```

### Coleções no Firestore

| Coleção           | Conteúdo                                                      |
| ----------------- | ------------------------------------------------------------- |
| `users`           | Acessos ao painel (`SUPER_ADMIN` e `TENANT_ADMIN`)            |
| `tenants`         | Estabelecimentos: nome, cor, logo, fuso horário                |
| `screens`         | Telas: código de pareamento, segredo, overlays, volume         |
| `playlists`       | Programação, com os itens de mídia embutidos                   |
| `mediaAssets`     | Biblioteca de arquivos enviados ao R2                          |
| `spotifyAccounts` | Tokens e playlist escolhida, um documento por estabelecimento  |
| `passwordResets`  | Tokens de redefinição de senha, guardados como hash SHA-256    |

---

## Configuração

```bash
npm install
cp apps/web/.env.example apps/web/.env   # preencha as variáveis
```

### Variáveis obrigatórias

- `AUTH_SECRET` — assina o cookie de sessão. Gere uma chave nova:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- `FIREBASE_*` — credenciais da service account do Firestore.
- `CLOUDFLARE_R2_*` — conta, chaves, bucket e URL pública do bucket.
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REDIRECT_URI`.
- `NEXT_PUBLIC_APP_URL` — URL pública da aplicação.
- `EMAIL_FROM` mais `RESEND_API_KEY` **ou** `SMTP_*` — sem isso a redefinição de senha não sai
  do servidor.

### Primeiro acesso

```bash
cd apps/web && npm run seed
```

Cria (ou atualiza a senha do) super admin definido em `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`.

### CORS do bucket R2

O upload direto do navegador exige CORS liberando `PUT` a partir da origem da aplicação:

```bash
cd apps/web && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/configure-r2-cors.ts
```

O script usa `NEXT_PUBLIC_APP_URL`; **rode de novo ao publicar em produção**, senão o navegador
bloqueia o envio a partir do domínio novo.

### E-mail (redefinição de senha)

A tela de login tem "Esqueceu a senha?", que envia um link de uso único válido por 1 hora.
Configure **um** dos dois caminhos em `.env`:

- `RESEND_API_KEY` — API da [Resend](https://resend.com), sem servidor próprio.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` — SMTP comum.

Em ambos os casos `EMAIL_FROM` precisa ser um remetente de domínio verificado, senão o e-mail
cai em spam ou é recusado. Sem nenhum provedor configurado, o link é escrito no console do
servidor — e, apenas em desenvolvimento, devolvido na própria tela para permitir testar o fluxo.

### Spotify

1. Crie um app em [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Cadastre o Redirect URI exatamente igual a `SPOTIFY_REDIRECT_URI`.
3. No painel do cliente, aba **Música**, conecte a conta do estabelecimento.

> **A conta precisa ser Spotify Premium.** O Web Playback SDK não reproduz faixas completas em
> contas gratuitas — é limitação do Spotify, não da plataforma. O painel avisa quando a conta
> conectada não é Premium.

---

## Rodando

```bash
npm run dev
```

- Painel do super admin: `/admin`
- Painel do estabelecimento: `/tenant/<tenantId>`
- Player da TV: `/tv`

---

## Instalação na TV

O player roda em navegador **Chrome/Chromium**. O Web Playback SDK exige suporte a Widevine, que
navegadores nativos de Smart TV costumam não ter. O caminho confiável é um dispositivo Android TV,
mini PC ou Chromebox rodando Chrome em modo quiosque apontado para `/tv`.

Depois do pareamento, a exibição precisa de **um toque em "Iniciar exibição"** (pressionar OK no
controle). Isso é exigência de autoplay dos navegadores: sem um gesto do usuário, nenhum som toca.
O toque é necessário apenas quando a página é recarregada.

Para um endereço fixo por cliente, aponte um subdomínio (ex: `tv.barbearia.com.br`) para a
aplicação — o middleware entrega a tela de pareamento na raiz desse host.
