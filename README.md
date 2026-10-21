# Sistema de Candidatura a Pontos de Coleta | Rede Logística Parceira

Plataforma profissional, moderna, responsiva e completa para captação, validação e gestão de estabelecimentos comerciais interessados em atuar como pontos de coleta e entrega de encomendas.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:**
  - React 19 com TypeScript
  - Tailwind CSS v4 para design responsivo e tokens visuais
  - Leaflet para mapa interativo com geolocalização e pin arrastável (zero dependências obrigatórias de chave externa)
  - Lucide React para iconografia moderna de logística
  - Canvas Confetti para celebração visual na conclusão
  - React Router DOM v7 para navegação de rotas públicas e administrativas protegidas

- **Backend:**
  - Node.js com Express
  - Relational Database com SQLite WAL persistente (`better-sqlite3`) para inicialização imediata e autônoma
  - Esquema Supabase PostgreSQL com políticas Row Level Security (RLS) completo em `supabase/schema.sql`
  - Multer para upload seguro de fotos (fachada e interior) com validação de tipo MIME e tamanho
  - Autenticação JWT com hash bcrypt e controle de sessões

- **Integrações:**
  - Busca automática de CEP com fallback duplo (BrasilAPI + ViaCEP)
  - Validação matemática oficial de dígitos verificadores de CNPJ (Módulo 11)
  - Gerador dinâmico de links para WhatsApp (`https://wa.me/NUMERO?text=MENSAGEM_CODIFICADA`) configurável pelo painel administrativo sem tocar no código

---

## 📦 Estrutura de Pastas

```text
ponto-coleta-shopee/
├── client/                     # Aplicação Frontend React + Vite
│   ├── src/
│   │   ├── components/         # Navbar, Footer, MapPicker, WhatsAppFloatingButton
│   │   ├── context/            # ConfigContext (cores dinâmicas), AuthContext (JWT)
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Página inicial pública com Hero, Como Funciona, FAQ
│   │   │   ├── CadastroConcluido.tsx # Conclusão com protocolo e WhatsApp
│   │   │   ├── Cadastro/       # Formulário dividido em 7 etapas otimizadas
│   │   │   │   ├── Step1DadosLoja.tsx
│   │   │   │   ├── Step2Imagens.tsx
│   │   │   │   ├── Step3Endereco.tsx
│   │   │   │   ├── Step4Mapa.tsx
│   │   │   │   ├── Step5Horarios.tsx
│   │   │   │   ├── Step6InfoAdicional.tsx
│   │   │   │   ├── Step7ContatoFinanceiro.tsx
│   │   │   │   └── Step8OrigemRevisao.tsx
│   │   │   └── Admin/          # Painel Administrativo Privado
│   │   │       ├── AdminLogin.tsx
│   │   │       ├── AdminLayout.tsx
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── AdminSolicitacoes.tsx
│   │   │       ├── AdminSolicitacaoDetalhes.tsx
│   │   │       └── AdminConfiguracoes.tsx
│   │   ├── services/api.ts     # Camada de comunicação com a API REST
│   │   └── utils/validators.ts # Validação de CNPJ, máscaras e helpers
│   └── vite.config.ts
├── server/                     # API REST Node.js Express
│   ├── src/
│   │   ├── database.js         # Inicialização do banco relacional e tabelas
│   │   ├── routes/             # Rotas de solicitações, admin e configurações
│   │   ├── middleware/         # Middleware de autenticação JWT
│   │   └── index.js
│   ├── data/                   # Banco de dados SQLite persistente
│   └── uploads/                # Armazenamento privado das fotos enviadas
├── supabase/
│   └── schema.sql              # Esquema SQL com RLS para implantação no Supabase
├── package.json
└── README.md
```

---

## ⚡ Como Executar o Projeto Localmente

### 1. Pré-requisitos
- Node.js versão 18 ou superior instalado.

### 2. Iniciar o Servidor e o Frontend
Abra o terminal no diretório do projeto e execute:

```bash
# Rodar o servidor backend (porta 3001)
npm run dev:server

# Em outro terminal (ou simultaneamente):
npm run dev:client
```

Ou execute ambos de uma só vez:
```bash
npm run dev
```

- **Site Público:** `http://localhost:5173`
- **Painel Administrativo:** `http://localhost:5173/admin/login`
- **API Backend:** `http://localhost:3001/api/health`

---

## Publicação

Há duas opções de hospedagem:

- **Frontend estático separado:** publique `client` e configure `VITE_API_URL` para apontar a um backend Express em execução. O SQLite local só é persistente se o host mantiver o arquivo do banco entre reinicializações.
- **Projeto completo na Vercel:** mantenha a raiz do repositório como diretório do projeto. O `vercel.json` publica `api/index.js` como API serverless e encaminha as rotas do frontend. Como o disco e a memória de uma função serverless não são persistentes, o painel administrativo exige Supabase com armazenamento de estado persistente.

Para a API serverless, configure no provedor:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente no servidor; nunca use prefixo `VITE_`)
- `JWT_SECRET` aleatório, privado e estável
- `TOTP_ENCRYPTION_KEY` aleatória e estável antes de habilitar o autenticador; se omitida, a chave é derivada de `JWT_SECRET`

A API grava as configurações editáveis do site (incluindo os dados do WhatsApp) e o estado administrativo, com o segredo TOTP cifrado, na coluna JSONB `configuracoes_site.configuracao`. As configurações de site são mescladas sem substituir `admin_security_state` ou outras propriedades; aliases legados como `whatsapp_number` e `whatsapp_mensagem` são mantidos sincronizados para compatibilidade. A mesclagem é atômica por meio da função `merge_configuracoes_site`, evitando que atualizações simultâneas de configurações e segurança se sobrescrevam.

Em uma instalação Supabase existente, aplique a definição de `merge_configuracoes_site` da seção da tabela `configuracoes_site` em `supabase/schema.sql` antes de publicar a API atualizada. A função deve permanecer acessível somente à chave `service_role`. A API consulta o Supabase ao servir as configurações e só confirma uma alteração depois que a gravação persistente termina; se as credenciais, a função ou a leitura/gravação falharem, a API retorna erro em vez de aparentar sucesso usando o armazenamento efêmero da função. Para projetos Supabase já existentes, o script de migração do administrador consulta e atualiza a linha singleton identificada por `id = true`.

O banco SQLite de desenvolvimento e o estado serverless do Supabase são armazenamentos distintos. Para transferir com segurança a conta local existente, configure as mesmas chaves usadas pela API e execute primeiro a simulação; o script valida a identidade da conta e nunca sobrescreve um estado Supabase existente sem confirmação explícita:

```bash
node server/src/scripts/migrateAdminSecurityToSupabase.js
node server/src/scripts/migrateAdminSecurityToSupabase.js --execute
```

Se já existir o estado `configuracao.admin_security_state`, revise-o antes de substituí-lo; a opção destrutiva exige também `--replace`. Preserve as mesmas chaves de cifragem entre as migrações; trocar `JWT_SECRET` ou `TOTP_ENCRYPTION_KEY` sem recriptografar os segredos existentes torna o autenticador irrecuperável.

---

## 🔐 Credenciais do Primeiro Administrador

Em desenvolvimento local, se não houver um administrador existente, o banco de dados cria o superadministrador padrão:

- **E-mail:** `admin@pontodecoleta.com.br`
- **Senha:** `Admin@2026`

*Não mantenha essas credenciais em produção. Defina credenciais fortes por ambiente e altere a senha inicial.*

---

## 🗄️ Implantação no Supabase (PostgreSQL)

Caso deseje utilizar o Supabase em produção:

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Acesse a aba **SQL Editor**.
3. Copie todo o conteúdo do arquivo [supabase/schema.sql](./supabase/schema.sql) e clique em **Run**.
4. Configure as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no seu provedor de hospedagem (Vercel, Render, Railway, etc.).
5. As políticas RLS garantem que novos cadastros possam ser criados publicamente, mas a leitura de dados, arquivos e dados financeiros seja restrita a administradores autenticados.

---

## 📱 Configuração do WhatsApp pelo Painel

Não é necessário editar o código-fonte para trocar o número ou a mensagem do WhatsApp:

1. Acesse `/admin` e faça login.
2. Navegue até a aba **Configurações > WhatsApp**.
3. Insira o número no formato internacional: `55` (Brasil) + DDD + Telefone (ex: `5511999998888`).
4. Personalize a mensagem utilizando os marcadores `[PROTOCOLO]` e `[NOME FANTASIA]`.
5. Veja a pré-visualização em tempo real e clique em **Salvar Alterações**.
6. Todos os botões do site e da página de conclusão passarão a abrir imediatamente a conversa com o novo número e texto.

---

## 🛡️ Segurança e LGPD

- **Dados Bancários Protegidos:** Não solicitamos senhas, CVVs ou tokens de autenticação bancária. Os dados de recebimento são mascarados por padrão no painel e só revelados mediante clique explícito do administrador.
- **Prevenção de Duplicidade:** O servidor bloqueia envios consecutivos com o mesmo CNPJ para evitar duplicidade acidental.
- **Exclusão de Dados:** O painel conta com botão de exclusão imediata e permanente para atender a solicitações de remoção previstas na LGPD.
- **Auditoria de Status:** Cada mudança de status registra data, hora, administrador responsável e observações internas em uma trilha de auditoria indelével.
