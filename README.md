<div align="center">

# Mottainai Frontend

**Painel web administrativo do Mottainai: gestão preditiva de estoque para pequenos e médios varejos**

*SPA em React + TypeScript + Vite. Catálogo, estoque e operações disponíveis consultam a API configurada; telas sem endpoint não exibem dados de demonstração.*

Acesse o projeto em vercel: [Vercel](mottainai-frontend-ten.vercel.app) 
Ou no Render: [Render](https://mottainai-frontend.onrender.com)

<br/>

[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React Router](https://img.shields.io/badge/React%20Router-7.18.2-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com/)

[![Node.js](https://img.shields.io/badge/Node.js-22%20(CI%2FDocker)-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](.github/workflows/ci.yml)
[![Vitest](https://img.shields.io/badge/Vitest-5.0.5-6E9F18?style=flat-square&logo=vitest&logoColor=white)](vitest.config.ts)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.5.1-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
[![ESLint](https://img.shields.io/badge/ESLint-9.39.5-4B32C3?style=flat-square&logo=eslint&logoColor=white)](eslint.config.js)
[![Nginx](https://img.shields.io/badge/Nginx-1.27--alpine-009639?style=flat-square&logo=nginx&logoColor=white)](Dockerfile)
[![GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)

<br/>

[Visão geral](#1-visão-geral) •
[Arquitetura](#3-arquitetura) •
[Tecnologias](#4-tecnologias) •
[Telas](#6-funcionalidades-e-rotas) •
[Dados e integrações](#7-dados-integrações-e-autenticação) •
[Como rodar](#8-como-executar-localmente) •
[Testes e CI](#9-qualidade-testes-e-ci) •
[Riscos](#11-segurança-riscos-e-limitações)

</div>

---

## 1. Visão geral

O **Mottainai** (もったいない, expressão japonesa para *"que desperdício"*) é um sistema de gestão preditiva de estoque para varejo de pequeno e médio porte, organizado em vários repositórios na org [Mottainai-One](https://github.com/Mottainai-One) (APIs, frontend, mobiles, POS, BI, RPA e IA).

Este repositório guarda o **frontend web administrativo** (`sistema-mottainai` no `package.json`), voltado a gestores da loja. A interface cobre:

| Domínio | O que a interface oferece |
|---|---|
| **Inteligência / Motor** | Validades registradas em lotes da API; indicadores e decisões do motor ficam indisponíveis sem endpoint correspondente |
| **Produtos** | Listagem, detalhe cadastral e cadastro manual pela API; importação XML/CSV não está integrada |
| **Estoque** | Inventário, contagens, baixas, consumo interno, transferências e fornecedores consultados pela API; conciliação de caixa indisponível |
| **Relatórios e contabilidade** | Indisponíveis até a API fornecer dados de vendas, financeiros e fiscais |
| **Usuários** | Funcionários, cargos, lojas e auditoria consultados pela API |
| **Acessibilidade** | Botão flutuante com tema, contraste, fonte, espaçamento, filtros de visão de cores, leitura em voz alta e outros ajustes |

> [!IMPORTANT]
> A aplicação consulta os recursos configurados em `VITE_API_BASE_URL` e não usa dados de demonstração como alternativa. Quando um recurso ainda não tem endpoint, a tela informa essa limitação. Configure as variáveis de ambiente antes de autenticar ou carregar dados.

---

## 3. Arquitetura

### Visão de componentes

```mermaid
flowchart TB
    subgraph BROWSER["Navegador"]
        MAIN["main.tsx<br/>StrictMode"] --> AP["AuthProvider<br/>(useReducer + Context)"]
        AP --> R["routes/index.tsx<br/>BrowserRouter + lazy()"]
        R --> FB["FloatingButton<br/>widget de acessibilidade"]
        R --> PUB["Rotas públicas<br/>login · ativação por convite"]
        R --> PR["PrivateRoute"] --> ML["MainLayout<br/>Header + Sidebar"] --> PAGES["Páginas privadas"]

        PAGES --> SVC["src/services/*.ts<br/>requisições à API"]
        SVC --> API["apiClient.ts<br/>VITE_API_BASE_URL"]
        API --> BACKEND["API operacional"]
        PAGES --> UTIL["src/utils/*<br/>validação, CSV"]

        SVC --> SESSION["Sessão em memória"]
        FB --> SPEECH["Web Speech API"]
        FB --> LS["localStorage<br/>preferências de acessibilidade"]
    end
```

### Decisões observadas no código

| Decisão | Onde | Observação |
|---|---|---|
| Code splitting por rota | `src/routes/index.tsx` | Todas as páginas usam `lazy()` com `Suspense` e `Spinner` de fallback |
| Estado de auth com `useReducer` + Context | `src/context/AuthProvider.tsx` | Sem biblioteca de estado global. O resto é estado local de página (`useState`, `use-immer`) |
| Alias `@/` → `src/` | `vite.config.ts`, `tsconfig.app.json` | |
| CSS Modules por componente | `*/style.module.css` | Estilos globais em `src/styles/global.css` e `src/styles/accessibility.css` |
| Consultas e alterações à API | `src/services/*Service.ts` | Chamadas passam por `apiClient.ts`; listas cancelam consultas ao sair da tela |
| Sessão | `src/services/apiClient.ts`, `src/context/AuthProvider.tsx` | Tokens ficam em memória e a API renova a sessão quando necessário |

---

## 4. Tecnologias

<table>
<tr>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/react/61DAFB" width="48" height="48" alt="React"/><br/><b>React 19.2.8</b><br/><sub>UI + react-dom</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/typescript/3178C6" width="48" height="48" alt="TypeScript"/><br/><b>TypeScript 6.0.3</b><br/><sub><code>strict</code>, sem JS em <code>src/</code></sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/vite/646CFF" width="48" height="48" alt="Vite"/><br/><b>Vite 8.2.0</b><br/><sub>Dev server e build<br/>(plugin-react 6.0.5)</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/reactrouter/CA4245" width="48" height="48" alt="React Router"/><br/><b>React Router 7.18.2</b><br/><sub><code>react-router-dom</code></sub></td>
</tr>
<tr>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/chartdotjs/FF6384" width="48" height="48" alt="Chart.js"/><br/><b>Chart.js 4.5.1</b><br/><sub>Donut e histórico</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/fontawesome/538DD7" width="48" height="48" alt="Font Awesome"/><br/><b>Font Awesome</b><br/><sub>Ícones solid</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/immer/00E7C3" width="48" height="48" alt="Immer"/><br/><b>Immer 11.1.18</b><br/><sub>+ <code>use-immer</code></sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/jsonwebtokens/000000" width="48" height="48" alt="JWT"/><br/><b>jwt-decode 4.0.0</b><br/><sub>Leitura do token<br/>(sem verificação)</sub></td>
</tr>
<tr>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/vitest/6E9F18" width="48" height="48" alt="Vitest"/><br/><b>Vitest 5.0.5</b><br/><sub>+ Testing Library<br/>+ jsdom</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/eslint/4B32C3" width="48" height="48" alt="ESLint"/><br/><b>ESLint 9.39.5</b><br/><sub>typescript-eslint,<br/>react, jsx-a11y</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/docker/2496ED" width="48" height="48" alt="Docker"/><br/><b>Docker</b><br/><sub>node:22-alpine<br/>→ nginx:1.27-alpine</sub></td>
<td align="center" width="140"><img src="https://cdn.simpleicons.org/githubactions/2088FF" width="48" height="48" alt="GitHub Actions"/><br/><b>GitHub Actions</b><br/><sub>CI e imagem QA</sub></td>
</tr>
</table>

> [!NOTE]
> As versões acima são as **resolvidas no `package-lock.json`** (lockfileVersion 3). No `package.json` as dependências usam faixas `^`/`~`. Por exemplo, TypeScript aparece como `~6.0.2` e o lock resolve para `6.0.3`. Também estão nas devDependencies `@lhci/cli` 0.15.x e `puppeteer` 24.x, usados pela auditoria Lighthouse.

---

## 5. Estrutura do repositório

```text
Mottainai-Frontend/
├── .github/workflows/
│   ├── ci.yml                 # Build + testes, indentação + ESLint, convenção de commits
│   └── qa-container.yml       # docker build da imagem de QA (sem push)
├── .codex/reorder-css.mjs     # Script utilitário para reordenar propriedades CSS
├── qa/
│   ├── README.md              # Instruções da imagem de preview (em inglês)
│   └── nginx.conf             # Porta 8080, /healthz e fallback de SPA
├── public/robots.txt
├── src/
│   ├── assets/                # Fontes de acessibilidade (Andika, Arimo, Comic Neue, DejaVu, Lexend), logos, mascote lontra
│   ├── components/            # ~25 componentes (MainLayout, Sidebar, Header, ReusableTable, charts, modais, filtros...)
│   ├── config/                # folder-navigation.ts: abas de navegação por domínio
│   ├── context/               # AuthContext + AuthProvider
│   ├── hooks/                 # useAuth, useApiQuery e hooks de operações da API
│   ├── pages/                 # Uma pasta por tela (index.tsx + style.module.css)
│   ├── routes/index.tsx       # Definição das rotas
│   ├── services/              # Autenticação, catálogo, estoque, operações, usuários e auditoria
│   ├── styles/                # global.css, accessibility.css
│   ├── types/                 # Tipos por domínio (*.types.ts)
│   ├── utils/                 # Validação de formulários, geração de CSV, contraste WCAG
│   └── main.tsx
├── tests/
│   ├── form-validation.test.mjs        # node:test
│   ├── project-accessibility.test.mjs  # node:test (checagens estáticas)
│   └── react-behavior.test.tsx         # Vitest + Testing Library
├── agents2.md                 # Prompt de "orquestrador de relatórios executivos" (sem relação com o app)
├── Dockerfile
├── eslint.config.js
├── index.html
├── package.json / package-lock.json
├── tsconfig*.json
├── vite.config.ts
└── vitest.config.ts
```

> [!NOTE]
> `.env.example` documenta as variáveis públicas necessárias. Crie `.env.local` para o ambiente local e não inclua chaves privadas ou segredos do servidor.

---

## 6. Funcionalidades e rotas

Definidas em `src/routes/index.tsx`. Rotas desconhecidas caem em `ErrorPage`.

### Mapa de navegação

```mermaid
flowchart LR
    L["/ e /login"] -->|login| O["/overview"]
    ACT["/activate-access"] --> L

    subgraph INT["Inteligência"]
        O --- EX["/expiringProducts"]
    end
    subgraph EST["Estoque"]
        S["/stock"] --- SD["/stock/damages"] --- ST["/stock/transfers"] --- SS["/stock/suppliers"]
        S --> SC["/stock/counts/new"]
        ST --> STN["/stock/transfers/new"]
        SS --> SSN["/stock/suppliers/new"]
    end
    subgraph PROD["Produtos"]
        P["/products"] --> PD["/products/:productId"]
        PRG["/productsRegistration"]
    end
    subgraph USR["Usuários"]
        U["/users"] --- UN["/users/new"] --- UA["/users/audit"]
    end
    O --> HOME["/home"]
    O --> ACC["/account"]
```

### Telas e origem dos dados

| Rota | Tela | Origem dos dados | Persistência das ações |
|---|---|---|---|
| `/`, `/login` | Login | Firebase e API via `authService` | Sessão em memória |
| `/activate-access` | Ativação de acesso por convite | Firebase e `/auth/password-reset` | Define a senha operacional e ativa o acesso |
| `/overview` | Alertas e ações sugeridas da loja | `/alerts?storeId`, `/alerts/{id}`, `/alerts/{id}/suggested-actions` | Status e decisões registrados pela API; aprovar não executa a ação sugerida |
| `/home` | Visão geral do estoque | `/products`, `/inventory`, `/batches` | Consulta à API |
| `/expiringProducts` | Validades registradas | `/inventory`, `/batches`, `/products` | Consulta à API; sem classificação de risco inventada |
| `/products`, `/products/:productId` | Catálogo e detalhe cadastral | `/products` | Consulta à API |
| `/productsRegistration` | Cadastro manual de produto | `/products`, `/product-categories`, `/tax-profiles` | Criação pela API; importação não integrada |
| `/stock` e subrotas | Estoque, contagens, baixas, transferências e fornecedores | Recursos `/inventory`, `/inventory-counts`, `/disposals`, `/inventory-movements`, `/transfers`, `/suppliers` e `/addresses` | Alterações persistidas pela API |
| `/users/*` | Funcionários e auditoria | `/employees-store`, `/employees-company`, `/employee-roles`, `/stores`, `/audit-logs` | Alterações persistidas pela API |
| `/account` | Conta do usuário logado | `useAuth` | Nenhuma |

> [!NOTE]
> As telas de histórico comercial, relatórios gerenciais, SPED e conciliação de caixa foram removidas junto com suas rotas e acessos, pois não há contratos correspondentes na API operacional conectada.

### Widget de acessibilidade

O `FloatingButton` aparece em todas as rotas e guarda as preferências em `localStorage` (chave `acessibility_v1`, com a grafia do código). Opções tipadas em `src/types/accessibility.types.ts`:

<details>
<summary><b>Preferências disponíveis</b></summary>

<br/>

| Grupo | Opções |
|---|---|
| Texto | escala, fonte (padrão, Verdana, Arial, Lexend, Andika, Comic, serif), espaçamento, sublinhar links, alinhamento |
| Cor | tema claro/escuro, contraste normal/alto/baixo, saturação, simulação de protanopia/deuteranopia/tritanopia |
| Navegação | movimento reduzido, bordas, alvos maiores, cor e tamanho do cursor, lanterna/régua de leitura |
| Conteúdo | suporte a jargões (`JargonTooltip`), leitura em voz alta com velocidade 0.75x a 1.5x (Web Speech API) |

</details>

> [!NOTE]
> Segundo o README do repositório, o modo "Contraste baixo" é uma preferência deliberada e **não** é conforme WCAG AA. Para avaliar contraste, use o tema padrão.

---

## 7. Dados, integrações e autenticação

### Backends consumidos

O frontend usa `VITE_API_BASE_URL`, definido em `.env.example`, como base das chamadas feitas por `src/services/apiClient.ts`. Os serviços integrados incluem autenticação/perfil, produtos e categorias, lotes, estoque, contagens, descartes, movimentações, transferências, fornecedores, endereços, lojas, funcionários, cargos, auditoria, alertas e ações sugeridas.

O login obtém um token Firebase com `VITE_FIREBASE_AUTH_URL` e `VITE_FIREBASE_API_KEY`, depois autentica na API operacional. A URL e a chave web devem corresponder ao ambiente configurado. Não há fallback de credenciais ou de dados de demonstração.

Novas previsões do motor, vendas/histórico comercial, importação XML/CSV, conciliação de caixa e relatórios financeiros/fiscais continuam sem contrato integrado. A tela de visão geral lista apenas alertas e sugestões já registrados no servidor; não gera previsões locais. As telas sem contratos foram removidas da navegação e das rotas; o cadastro de produtos oferece somente o formulário manual.

O fluxo público de recuperação de senha foi removido, incluindo suas páginas e rotas. A ativação por convite e a troca autenticada da senha operacional em Minha conta continuam disponíveis.

### Fluxo de autenticação atual

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant L as Login
    participant AP as AuthProvider
    participant AS as authService
    participant FB as Firebase Auth
    participant API as API operacional

    U->>L: e-mail + senha
    L->>AP: login(credentials)
    AP->>AP: validateLoginCredentials + sanitize
    AP->>AS: login()
    AS->>FB: e-mail e senha
    FB-->>AS: token Firebase
    AS->>API: POST /auth/firebase (token Firebase)
    API-->>AS: access/refresh tokens
    AS->>API: GET /auth/profile
    API-->>AS: perfil
    AS-->>AP: sessão e perfil
    AP-->>L: autenticado, PrivateRoute libera
```

| Comportamento | Detalhe |
|---|---|
| Credenciais | E-mail e senha validados no Firebase; API operacional recebe somente o token em /auth/firebase e confirma o vínculo ativo |
| Ambiente sem configuração | Login apresenta erro de configuração/integração e não cria uma sessão fictícia |
| Sessão | Access/refresh tokens mantidos em memória; recarregar a página exige novo login |
| Autorização | `PrivateRoute` só confere `isAuthenticated`; a API deve validar permissões. Os cargos e lojas exibidos na administração de funcionários vêm da API |

> [!CAUTION]
> O build de produção e a imagem de QA precisam das variáveis Firebase/API e de uma conta operacional válida. Sem essa configuração, o login falha e as rotas privadas continuam protegidas.

### Armazenamento no navegador

| Mecanismo | Chave / banco | Conteúdo |
|---|---|---|
| `localStorage` | `acessibility_v1` | Preferências de acessibilidade |

Na primeira inicialização após esta atualização, o frontend remove os bancos
IndexedDB antigos que guardavam relatórios gerados a partir das amostras locais.
Essa limpeza não afeta dados retornados pela API.

---

## 8. Como executar localmente

### Pré-requisitos

- [ ] **Node.js** e **npm**. A versão exigida não está fixada (não há `engines` nem `.nvmrc`). CI e Dockerfile usam **Node 22**.
- [ ] Docker (opcional, só para a imagem de QA)

### Comandos (scripts do `package.json`)

```bash
npm ci              # instala exatamente o que está no package-lock.json
npm run dev         # Vite dev server (requer API/Firebase configurados para autenticar)
npm run build       # tsc -b && vite build
npm run preview     # serve o build com vite preview
npm run lint        # ESLint
npm run lint:html   # ESLint com relatório em relatorio-qualidade.html
npm test            # node --test tests/*.test.mjs && vitest run
npm run test:node   # só os testes node:test
npm run test:react  # só os testes Vitest
```

<details>
<summary><b>Scripts de auditoria Lighthouse (veja o aviso)</b></summary>

<br/>

```bash
npm run build:lighthouse   # build em --mode lighthouse, sem autenticação simulada
npm run serve:lhci         # vite preview em 127.0.0.1:4174
npm run lighthouse:ci      # build:lighthouse + node scripts/lighthouse-ci.cjs
```

> [!WARNING]
> `lighthouse:ci` depende dos scripts de auditoria descritos nesta seção. O modo `lighthouse` não habilita login simulado; para navegar por rotas privadas, configure as mesmas credenciais e serviços usados no ambiente normal.

</details>

### Variáveis de ambiente

| Variável | Uso | Fonte |
|---|---|---|
| `VITE_API_BASE_URL` | Endereço base da API operacional | `.env.example` |
| `VITE_FIREBASE_AUTH_URL` | Endpoint de autenticação Firebase | `.env.example` |
| `VITE_FIREBASE_API_KEY` | Chave pública do projeto Firebase | `.env.example` |

Variáveis `VITE_*` são incorporadas ao bundle e ficam visíveis no navegador; não use nelas segredos do servidor.

---

## 9. Qualidade, testes e CI

### Testes

| Arquivo | Runner | Cobertura |
|---|---|---|
| `tests/form-validation.test.mjs` | `node:test` | Validação e sanitização de funcionário, login, ajuste e contagem de estoque, fornecedor, transferência e formulários de senha |
| `tests/project-accessibility.test.mjs` | `node:test` | Checagens estáticas: sem `.js` em `src/`, sem `any`, sem HTML inseguro, sem `fetch` direto, sem mutação de `useState`, inputs com `label`, imagens com `alt`, sem `div` clicável, contraste WCAG AA, `lang`, skip links e landmarks |
| `tests/react-behavior.test.tsx` | Vitest + jsdom + Testing Library | Sessão em memória, validação de login, `PrivateRoute` e tempo mínimo de carregamento |

> [!NOTE]
> Não há relatório nem limite de cobertura configurado, e não há testes E2E.

### Lint

`eslint.config.js` (flat config) aplica `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `react-hooks`, `react-refresh` e **`jsx-a11y` recommended**. Também força `no-explicit-any`, `react/no-danger` e `react-hooks/exhaustive-deps` como **erro**.

### Integração contínua

```mermaid
flowchart LR
    T(["PR ou push<br/>main/master"]) --> A & B & C
    subgraph CI["ci.yml"]
        A["build-and-test<br/>Node 22 · npm ci · build · npm test"]
        B["code-style<br/>sem TAB em src/ · npm run lint"]
        C["commit-convention<br/>feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert:"]
    end
    T2(["PR · push main · manual"]) --> D
    subgraph QA["qa-container.yml"]
        D["docker build<br/>mottainai-frontend:qa<br/>(sem push)"]
    end
```

> [!WARNING]
> O job `commit-convention` valida cada commit do range do PR, e em `push` valida os **últimos 10 commits**, incluindo merge commits. Mensagens como `Merge pull request #N ...` (há uma no histórico) não seguem o padrão e fariam o job falhar se estivessem nessa janela. Prefira *squash* ou *rebase merge*.

---

## 10. Build e imagem de QA

O `Dockerfile` tem dois estágios: `node:22-alpine` roda `npm ci` e `npm run build`, e `nginx:1.27-alpine` serve o `dist/` na porta **8080**, com `GET /healthz` → `200 ok` e fallback de SPA para `index.html` (`qa/nginx.conf`).

```bash
docker build --tag mottainai-frontend:qa .
docker run --rm -p 127.0.0.1:18081:8080 mottainai-frontend:qa
# http://localhost:18081/healthz  e  http://localhost:18081
```

<sub>Comandos tirados de `qa/README.md`. O workflow `qa-container.yml` só faz o build da imagem e não publica em registry.</sub>

> [!WARNING]
> A imagem de QA não injeta credenciais Firebase nem endereço da API por padrão. Sem essa configuração, as rotas privadas não abrem; o frontend não usa uma conta de demonstração.

Não há deploy automatizado (Firebase, Vercel, S3 ou similar) configurado no repositório.

---

## 11. Segurança, riscos e limitações

| # | Risco / limitação | Impacto | Recomendação |
|:---:|---|---|---|
| 1 | **Cobertura parcial de API.** Recursos operacionais de catálogo/estoque/usuários estão integrados, mas motor, vendas, caixa e relatórios financeiros/fiscais não têm endpoints ligados | Essas telas informam a indisponibilidade e não exibem amostras | Definir e integrar os contratos correspondentes antes de reativar esses recursos |
| 2 | **Token de sessão em memória no navegador** | A autorização precisa continuar sendo validada pela API em cada operação; `PrivateRoute` só controla navegação visual | Manter validação de sessão e permissões no servidor; avaliar cookie `HttpOnly` quando o backend oferecer esse fluxo |
| 3 | **Sem controle de acesso por papel** no frontend | Qualquer usuário autenticado vê todas as telas (usuários, contabilidade) | Modelar papéis no token/sessão e proteger rotas por papel, além do backend |
| 4 | **`lighthouse:ci` quebrado em clone limpo** (scripts ignorados no Git) | Auditoria documentada não é reproduzível | Versionar os scripts ou remover os comandos do `package.json`/README |
| 6 | **Dependências com faixas `^`/`~`** no `package.json` | Builds fora do `npm ci` podem resolver versões diferentes | Fixar versões exatas. O lockfile mitiga só quando se usa `npm ci` |

<details>
<summary><b>Outras observações</b></summary>

<br/>

- `agents2.md` (1.249 linhas, um prompt de "orquestrador de relatórios executivos") está **versionado**, apesar de constar no `.gitignore`. Não tem relação com o frontend.
- A CI escuta `main` **e** `master`, mas só existe `main`.
- Não há `LICENSE` no repositório.
- Não há exportação de relatórios enquanto as integrações de vendas e finanças não estiverem disponíveis.

</details>

---

## 12. Contribuição

### Convenções para contribuir

- Commits no padrão `tipo: mensagem` com `feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert`, validado pela CI.
- Indentação com espaços (a CI rejeita TAB em `.ts/.tsx/.css/.json` dentro de `src/`).
- Só TypeScript em `src/`, sem `any`, sem `dangerouslySetInnerHTML` e sem `fetch` direto (regras dos testes estáticos).
- Todo input com `label` explícito e toda imagem com `alt` (jsx-a11y + testes).

---

<details>
<summary><b>Nota de rastreabilidade</b></summary>

<br/>

- **Repositório:** [Mottainai-One/Mottainai-Frontend](https://github.com/Mottainai-One/Mottainai-Frontend)
- **Branch:** `main` (branch analisada)
- **Commit analisado:** `5ca32b7`
- **Data da análise:** 2026-10-27
- **Método:** leitura estática de um clone local (shallow, depth 50). Nenhum comando de install, build, teste ou deploy foi executado.
- **Arquivos consultados:** `README.md`, `package.json`, `package-lock.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `Dockerfile`, `.dockerignore`, `.gitignore`, `index.html`, `public/robots.txt`, `qa/README.md`, `qa/nginx.conf`, `.github/workflows/ci.yml`, `.github/workflows/qa-container.yml`, `agents2.md` (início), `.codex/reorder-css.mjs` (início), `src/main.tsx`, `src/routes/index.tsx`, `src/context/*`, `src/hooks/*`, `src/services/*`, `src/config/folder-navigation.ts`, `src/types/accessibility.types.ts`, `src/utils/managementReports.ts`, `src/utils/monthlyFinancialReports.ts`, `src/utils/accessibilityPreferences.ts`, `src/components/EngineActionModal/index.tsx`, imports e trechos de `src/pages/*/index.tsx` e `tests/*`.
- **Fato x inferência:** as versões vêm do lockfile. Os módulos sem contrato integrado não exibem dados fixos como se fossem registros reais.

</details>

<div align="center">

**Mottainai** · *menos desperdício, mais inteligência no estoque*

<sub>Parte do ecossistema <a href="https://github.com/Mottainai-One">Mottainai-One</a></sub>

</div>
## Integração com a API operacional

Copie `.env.example` para `.env.local` e configure `VITE_API_BASE_URL`,
`VITE_FIREBASE_AUTH_URL` e `VITE_FIREBASE_API_KEY`. Reinicie o Vite após mudar
as variáveis. Todas as variáveis `VITE_` ficam públicas no navegador: não coloque
senhas do banco, segredos JWT ou chaves AES nelas.

O ambiente local da API usa `http://localhost:18080/api/v1`. O projeto Firebase
da chave web precisa corresponder ao `FIREBASE_PROJECT_ID` configurado no
container. O identificador provisório do ambiente de QA precisa ser substituído
antes de autenticar. A conta Firebase deve estar vinculada a um funcionário
ativo no banco operacional, com loja e cargo válidos.

O login usa a mesma senha digitada para Firebase e para a API, conforme a
suposição adotada nesta integração. A API retorna access/refresh tokens;
ambos ficam apenas em memória. Recarregar a página exige novo login.
Requisições autenticadas renovam a sessão uma vez quando recebem HTTP 401;
falha na renovação encerra a sessão local. O logout solicita revogação no servidor.
O modo Lighthouse também usa a autenticação real e não habilita credenciais
simuladas.

Primeiro incremento conectado: autenticação, consulta paginada de fornecedores,
cadastro com endereço consultado da API e edição de apelido/status. As listas
tratam carregamento, sucesso, vazio e erro, com cancelamento ao sair da tela.
Os endereços devem existir na API antes do cadastro de fornecedor. O contrato
cria um endereço a partir dos campos enviados; selecionar um endereço existente
no formulário fornece esses campos, sem presumir vínculo pelo ID.

Produtos vinculados não fazem parte da resposta da listagem de fornecedores:
a coluna de SKUs simulados foi removida até existir consulta dos vínculos.
Funcionários, estoque, transferências e baixas têm integrações próprias; telas
de indicadores, vendas e relatórios sem endpoint permanecem indisponíveis.

Segundo incremento: listagem e detalhes cadastrais de produtos consultam
`/products`; o cadastro manual envia o contrato real com categoria, perfil
fiscal, código de barras, NCM, CEST opcional, nome, marca, unidade, descrição
e peso opcional. Categorias e perfis fiscais ativos são consultados da API.
O SKU é gerado pelo servidor. A consulta de produtos percorre as páginas
retornadas pela API antes de aplicar os filtros locais existentes.

A antiga importação XML/CSV e sua massa de produtos recentes não são mais
expostas na página de cadastro: o backend fornecido não define esse contrato.
Estoque, preço por loja, fornecedores e previsões não pertencem ao DTO de
produto; as telas de catálogo mostram apenas dados cadastrais até a integração
dos recursos correspondentes. O fluxo completo de cadastro depende da mesma
conta Firebase/operacional requerida para fornecedores.

Terceiro incremento: `/stock` consulta o estoque da loja vinculada ao usuário,
combinando `/inventory`, `/batches` e `/products`. Exibe saldo por lote, tipo e
local, validade e limites mínimo/máximo; pesquisa e filtros são locais sobre os
dados carregados. A mesma página consulta `/inventory-counts` e permite abrir
uma contagem existente pelo endereço `/stock/counts/new?id=ID`.

Contagens são criadas explicitamente pelo usuário. O backend determina a loja
e o funcionário a partir da sessão. Cada quantidade física é salva pelo ID do
item de estoque: um item novo usa POST e um já contado usa PUT. Valores zero
e quantidades com até três casas decimais são aceitos. O saldo do sistema
mostrado na contagem é o snapshot retornado pelo servidor na inclusão do item.

A finalização exige revisar os itens e confirmar a aplicação dos ajustes.
A mesma chave `Idempotency-Key` é preservada nas tentativas de finalização da
contagem enquanto o editor permanece aberto. Se a confirmação falhar, a tela
bloqueia novas edições e exige consultar o estado no servidor antes de continuar.
O backend continua sendo responsável pelas permissões, transação e prevenção
de ajustes duplicados. Recarregar a página consulta o estado pelo ID da URL.

Os dados simulados de divergência de caixa e seus gráficos foram retirados.
Conciliação de caixa, vendas e relatórios ainda precisam de contratos próprios.
A instalação de QA fornece o schema; o fluxo autenticado completo depende da
configuração Firebase e de uma conta operacional vinculada.

As telas de estoque e contagem foram verificadas em 375, 768 e 1440 pixels
com respostas sintéticas interceptadas somente no navegador de teste. Foram
verificados o foco na revisão, os formulários e a ausência de rolagem horizontal
da página; tabelas mantêm rolagem própria acessível por teclado. Isso não
substitui a validação das gravações com uma conta Firebase/operacional real.

Quarto incremento: a página de avarias/consumo registra avarias e vencimentos
em `/disposals`, usando lote e quantidade positiva. Conforme a decisão do
usuário, consumo interno é uma movimentação `OUT` em
`/inventory/{id}/movements`, com quantidade negativa e observação iniciada
por `Consumo interno`. A tela exige um item do estoque normal com saldo,
valida a quantidade e apresenta revisão antes da confirmação. Loja e funcionário
são determinados pelo backend. Cada baixa enviada contém `Idempotency-Key`.

Uma falha de conexão ou resposta inconclusiva preserva chave e payload enquanto
a página estiver aberta, bloqueando alteração dos dados até reenviar a mesma
solicitação. O reenvio permite ao servidor recuperar a operação já registrada.
Se sair/recarregar durante uma falha, consulte o histórico antes de iniciar outra
baixa: a tentativa pendente não é persistida entre visitas. Rejeições HTTP 4xx
liberam a correção do formulário. Após sucesso, registros e estoque são
consultados novamente; nenhum saldo é declarado atualizado apenas por cálculo
local. As consultas usam período explícito de até seis meses. O histórico de
consumo filtra movimentações `OUT` cuja observação começa com `Consumo interno`.

Os valores financeiros, percentuais de faturamento e pico de vendas simulados
foram retirados desta página, pois não pertencem às respostas desses recursos.
Foram verificados o formulário, revisão e confirmação em 375, 768 e 1440 pixels
com respostas sintéticas isoladas. As transações reais continuam dependentes
da configuração Firebase e da conta operacional vinculada.

Quinto incremento: transferências usam `/transfers` para solicitação com
múltiplos lotes e histórico por período. Origem, solicitante e datas são
determinados pelo servidor; a solicitação não movimenta estoque. O envio usa
`PATCH /transfers/{id}/status` com `IN_TRANSIT` e retira o saldo da origem.
Somente transferências em trânsito podem ser canceladas com `CANCELED`,
devolvendo o saldo à origem. O recebimento usa
`POST /transfers/{id}/receive`, credita o destino e conclui a transferência.
Os antigos estados simulados `APPROVED` e `CANCELLED` não são enviados.

As ações da interface são apresentadas de acordo com o estado e a loja atual
do perfil: envio/cancelamento na origem e recebimento no destino. A API
continua validando autorização e concorrência. Toda ação de saldo exige revisão
e confirmação. Após falha, novas ações ficam bloqueadas até consultar o estado
no servidor; PATCH de envio/cancelamento não é repetido automaticamente.
Criação e recebimento preservam suas chaves de idempotência enquanto o editor
permanece aberto. Após sair/recarregar durante uma falha de criação, consulte
o histórico antes de solicitar novamente. Detalhes são reabertos por
`/stock/transfers?id=ID`.

A lista de destinos vem de `/stores`. Quando esse recurso retorna HTTP 403,
a tela permite informar o identificador da loja de destino; não cria nomes ou
lojas fictícias, e o servidor valida o destino. Outros erros de listagem são
exibidos como falha. Recomendações de transferência simuladas foram removidas.

As consultas de estoque, descartes, movimentações e transferências agora obtêm
a loja de `/auth/profile` e enviam `storeId` explicitamente. Isso atende ao
contrato que exige esse parâmetro para administradores, mantendo o contexto
na loja do perfil em todos esses históricos. Não há cache de perfil entre
sessões. Login e consultas usam o mesmo serviço de perfil.

Solicitação, revisão, histórico e envio foram verificados em 375, 768 e
1440 pixels com respostas sintéticas isoladas. Testes de comportamento cobrem
recebimento, cancelamento, perda de resposta, reconciliação e limites de lote.
Essas verificações não substituem o fluxo autenticado com Firebase e uma conta
operacional real.

Sexto incremento: funcionários e auditoria deixam de usar estado local como fonte
de dados. `/users` consulta `/employees-store`; a seleção Empresa consulta
`/employees-company`, restrita a administradores. Cargos vêm de
`/employee-roles` e lojas de `/stores`. Os nomes dos cargos são rótulos do banco,
não uma lista fixa de permissões. A API continua responsável pela autorização;
uma recusa é mostrada como erro, sem apresentar uma lista vazia de sucesso.

`/users/new` envia nome, CPF, contato, cargo, loja, data de admissão e a escolha
explícita de criar acesso. Por padrão, cadastra sem acesso. Criar acesso solicita
convite por e-mail e depende de ativação; uma resposta de sucesso confirma a
operação, mas não garante a entrega do e-mail. A edição envia somente os campos
aceitos por `PUT /employees/{id}`. CPF mascarado e loja são somente leitura;
`roleId: null` preserva o cargo atual, pois a resposta não fornece seu identificador.
Status e convite usam suas rotas próprias, sempre com revisão antes de confirmar.
Como esses contratos não oferecem idempotência, uma resposta perdida bloqueia
novo envio no formulário e orienta conferir o registro na lista antes de outra
operação. O bloqueio dura enquanto o formulário permanece aberto.

`/users/audit` consulta `/audit-logs` por período de até seis meses. Mostra data,
identificador do usuário, tabela, operação e registro. Não inventa IP, nome do
ator nem eventos no navegador e não expõe os objetos brutos de antes/depois.
As consultas são canceladas ao sair da tela. A criação/edição substitui o antigo
formulário local nessa rota; o componente legado não é utilizado por `/users`.

Verificação deste incremento: 11 testes novos de contrato/validação e interação,
checagem de tipos e análise estática dos arquivos alterados. Layout e foco foram
verificados em 375, 768 e 1440 pixels, com respostas sintéticas da API e sem
gravações no banco. As gravações reais e o envio de convites ainda dependem da
configuração Firebase e de uma conta operacional com permissão administrativa.

Sétimo incremento: o painel consulta catálogo, estoque e lotes pela API; a tela
de validade lista somente lotes com data retornada pelo servidor, sem classificar
urgência ou criar recomendações. A visão do motor, histórico comercial,
relatórios e fechamento de caixa deixam de exibir amostras
locais. Como os contratos correspondentes não estão integrados, essas telas
informam a indisponibilidade e não geram resultados locais.

Oitavo incremento: `/overview` consulta os alertas da loja de `/auth/profile`
em `/alerts?storeId=ID`. Busca e filtro por status atuam somente nos registros
retornados. O detalhe, reaberto por `/overview?alert=ID`, combina `/alerts/{id}`
e `/alerts/{id}/suggested-actions`; as consultas são canceladas ao sair da tela.
Não há geração local de previsão, alerta, sugestão ou valor financeiro.

Alterar status envia `PATCH /alerts/{id}/status` após revisão. Aprovar/rejeitar
uma sugestão pendente usa `POST /suggested-actions/{id}/decision`, com
`APPROVED` ou `REJECTED`. A resposta do servidor atualiza a tela; não há alteração
otimista nem chamada a `/execute`. Aprovar é uma decisão, não a execução da
operação sugerida. A execução operacional continua pendente de integração dos
formulários e contratos próprios de cada tipo de sugestão.

Qualquer falha de mutação exige consultar novamente o alerta e suas sugestões
antes de liberar outra operação. Uma falha nessa consulta mantém o bloqueio.
Essa precaução evita repetir uma decisão aplicada cuja resposta se perdeu;
não pressupõe idempotência nos contratos de status/decisão. O servidor permanece
responsável por autorização, contexto da loja e concorrência. Os testes e a
verificação visual usam dados sintéticos; o fluxo autenticado real permanece
condicionado à configuração Firebase e à conta operacional vinculada.

Verificação do oitavo incremento: 12 testes novos e 30 regressões de integração
aprovados, análise estática dos arquivos envolvidos e compilação de produção.
Layout, revisão, retorno de foco e texto ampliado a 200% foram verificados em
375, 768 e 1440 pixels, sem transbordamento horizontal da página. As tabelas
mantêm rolagem própria. As bordas dos campos usam a cor do texto para preservar
contraste também quando o tema altera a cor da superfície.

Nono incremento: sugestões pendentes ou aprovadas podem ser executadas em
`POST /suggested-actions/{id}/execute`, com `Idempotency-Key`. A tela coleta os
itens explicitamente, pois o DTO da sugestão não inclui produtos, lotes ou
quantidades. Há formulários para pedido de compra, promoção, transferência,
doação, descarte e pré-lista de reposição. Cada formulário envia somente os
campos aceitos pelo respectivo tipo, após validação e revisão dos efeitos.

Produtos, fornecedores, lojas e saldos são consultados pelos serviços já
integrados, conforme a necessidade da operação. A loja do alerta precisa ser
a mesma do perfil para evitar criar operações na loja errada. Para operações
por lote, a interface considera somente estoque normal com saldo e limita a
quantidade ao saldo consultado; essa é uma escolha conservadora da interface,
e o servidor continua responsável pela validação final. Caso listar lojas
retorne 403, a transferência admite informar o identificador conhecido do destino.
O tipo da promoção usa os valores definidos no schema operacional fornecido.
Quantidades e valores respeitam as casas decimais e os limites das colunas.

O efeito é informado antes de confirmar: descarte baixa estoque imediatamente;
transferência cria solicitação; doação cria registro para entrega posterior;
promoção é criada inativa e pendente de aprovação; pedido de compra não registra
recebimento; reposição cria apenas a pré-lista. Executar a sugestão não equivale
a concluir as etapas posteriores desses registros. O comprovante exibe o tipo
e o identificador retornados pela API, com link para transferências.

Depois de uma resposta perdida, dados e chave permanecem congelados enquanto
o formulário estiver aberto. Reenviar a mesma execução permite recuperar o
resultado idempotente. Recusas HTTP 4xx permitem correção. Ao sair, a chave não
é persistida; a tela orienta consultar o estado da sugestão antes de tentar de
novo. O backend também bloqueia outra execução da mesma sugestão já executada.
A interface não cria registros nem declara sucesso por cálculo local.

Os testes usam respostas sintéticas. As gravações reais continuam dependendo
do Firebase e da conta operacional vinculada. As etapas posteriores de aprovação,
entrega, recebimento e movimentação têm contratos próprios; este incremento
conecta a criação pela sugestão, sem executar essas etapas automaticamente.

Verificação do nono incremento: 23 testes novos de contrato, validação e
interação, além de 42 regressões de integração aprovadas. Os seis tipos foram
verificados com dois itens em 375, 768 e 1440 pixels, incluindo revisão sem
envio, retorno de foco, confirmação, atualização do alerta e texto ampliado a
200%, com respostas sintéticas isoladas. Não houve transbordamento horizontal
da página. Análise estática, tipos e compilação de produção aprovados.
