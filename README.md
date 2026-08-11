# 🌐 Vaelis-HUB — Plataforma Omnichannel de Engajamento, Mídia Indoor & Captive Portal

**Vaelis-HUB** é uma solução enterprise em nuvem (SaaS Multi-Tenant) para gestão de **Mídia Indoor para Smart TVs (Digital Signage)**, **Rádio Commercial sem Anúncios**, **Automação de Avaliações 5★ no Google**, **Hotspot Wi-Fi com Captive Portal**, **Bot WhatsApp** e **Web Guard (Filtro de Conteúdo)** integrada a roteadores **MikroTik RouterOS / CHR**.

---

## 📸 Funcionalidades Principais

### 📶 Captive Portal & Hotspot Wi-Fi
- **Acesso Gratuito com Anúncios:** Liberação de tempo configurável (ex: 30 min) mediante visualização de anúncios (vídeo/imagem).
- **Venda de Planos Wi-Fi via PIX:** Integração com Gateway de Pagamento (**Asaas**) para compra automatizada de passes de acesso de alta velocidade.
- **Cardápio Digital Integrado:** Exibição dinâmica de menu de produtos ou direcionamento automatizado após o login.
- **Personalização de Marca:** Logo, cores primárias, banners promocionais e regras de acesso por estabelecimento.

### 📺 Smart TV Mídia Indoor (Digital Signage)
- **Playlist de Mídia:** Exibição sequencial de imagens e vídeos promocionais.
- **Overlays Inteligentes:** Exibição em tempo real de QR Code para Wi-Fi/Cardápio, Relógio, Badge da Rádio Indoor e chamadas promocionais (CTAs para Instagram/Redes Sociais).
- **Pareamento Simples por Código:** Conexão de Smart TVs ao painel do tenant via código de 4 dígitos (ex: `TV-1234`).
- **Suporte a Domínio Customizado:** Exibição via subdomínio do cliente (ex: `tv.restaurante.com.br`).

### 🎵 Rádio Indoor & Spots Comerciais
- Synchronized streaming para ambiente comercial com inserção programada de vinhetas e chamadas promocionais em áudio em intervalos configuráveis.

### 🧩 Módulos Add-ons & Gamificação
- **⭐ Google Reviews Automation:** Captura avaliações do cliente. Avaliações 4-5 estrelas são direcionadas ao Google Maps; críticas são enviadas diretamente ao WhatsApp do gerente.
- **🎰 Roleta da Sorte:** Roleta interativa de prêmios e cupons de desconto para retenção de clientes.
- **💬 Bot de WhatsApp:** Validação de cadastro e envio de OTP para captura de leads qualificados.
- **🛡️ WebGuard:** Filtro de navegação contra conteúdo adulto, torrents, sites de apostas e limitação de banda.

### 🐳 MikroTik CHR Auto-Provisioning (Docker)
- Provisionamento automatizado de contêineres **MikroTik RouterOS CHR v7** dedicados por tenant.
- Mapeamento dinâmico de portas para acesso via Winbox, Web, ROS API e SSH.

---

## 🛠️ Tecnologias Utilizadas

- **Front-end / Back-end:** [Next.js 15.1](https://nextjs.org/) (App Router, [React 19.0](https://react.dev/), [TypeScript 5.7](https://www.typescriptlang.org/))
- **Estilização & Ícones:** [Tailwind CSS 3.4](https://tailwindcss.com/) & [Lucide React 0.474](https://lucide.dev/)
- **Banco de Dados & ORM:** [PostgreSQL 16](https://www.postgresql.org/) & [Prisma ORM 6.4](https://www.prisma.io/)
- **Containers & Redes:** [Docker](https://www.docker.com/) & Docker Compose
- **Roteadores Virtuais:** MikroTik RouterOS CHR (`vantuil/mikrotik-chr:v7`)
- **Integração Financeira:** API Asaas (Pix, Assinaturas e Webhooks)

---

## 📂 Estrutura do Projeto

```text
.
├── apps/
│   └── web/
│       ├── prisma/
│       │   ├── schema.prisma   # Modelos do Banco de Dados (Tenants, Portais, TVs, Addons)
│       │   └── seed.ts         # Dados de inicialização (Seeders)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (admin)/    # Painel Super Admin (Gestão Global & CHR Provisioning)
│       │   │   ├── (tenant)/   # Painel Administrativo do Estabelecimento
│       │   │   ├── (auth)/     # Autenticação e Login
│       │   │   ├── portal/     # Interface do Captive Portal (Client View)
│       │   │   ├── tv/         # Interface Mídia Indoor para Smart TV
│       │   │   ├── checkin/    # Fluxo de Login / Check-in Wi-Fi
│       │   │   └── api/        # API Routes (Auth, Webhooks, CHR, Asaas)
│       │   ├── lib/
│       │   │   ├── asaas.ts           # Cliente API de Pagamentos Asaas
│       │   │   ├── db.ts              # Instância Singleton do Prisma Client
│       │   │   └── docker-mikrotik.ts # Provisionamento de Containers MikroTik CHR
│       │   └── middleware.ts   # Roteamento de Subdomínios e Domínios Customizados
│       ├── .env.example
│       └── package.json
├── docker-compose.yml          # Serviço do PostgreSQL 16 para Desenvolvimento
└── README.md
```

---

## ⚡ Pré-requisitos e Instalação

### 1. Pré-requisitos
- **Node.js**: v20.x ou v22.x (LTS recomendado)
- **Docker & Docker Compose**: Instalados e em execução
- **npm**, **pnpm** ou **yarn**

### 2. Clonar o Repositório e Instalar Dependências

```bash
# Clonar o repositório
git clone https://github.com/eduardovmaker/hub-vaelis.git
cd hub-vaelis

# Entrar na pasta do aplicativo web
cd apps/web

# Instalar dependências
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `apps/web` baseado no `.env.example`:

```env
DATABASE_URL="postgresql://admin:secretpassword@localhost:5432/captivehub?schema=public"
JWT_SECRET="captivehub_secret_key_qa_2026"
```

---

## 🚀 Executando o Projeto

### Step 1: Subir o Banco de Dados PostgreSQL via Docker

Na raiz do projeto (`hub-vaelis`), execute:

```bash
docker-compose up -d
```

### Step 2: Gerar o Prisma Client e Aplicar as Migrações

No diretório `apps/web`:

```bash
# Gerar o cliente Prisma
npx prisma generate

# Sincronizar o esquema com o banco PostgreSQL
npx prisma db push

# (Opcional) Popular o banco com dados de teste
npm run db:seed
```

### Step 3: Iniciar o Servidor de Desenvolvimento

No diretório `apps/web`:

```bash
npm run dev
```

A aplicação estará acessível em `http://localhost:3000`.

---

## 🖥️ Acesso aos Painéis

- **Super Admin:** `http://localhost:3000/admin`
- **Painel do Tenant:** `http://localhost:3000/tenant/[tenantId]`
- **Mídia Indoor Smart TV:** `http://localhost:3000/tv`
- **Captive Portal:** `http://localhost:3000/portal`

---

## 📄 Licença

Este projeto é de uso privado e proprietário. Todos os direitos reservados.

