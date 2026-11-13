# PetCare — Sistema Web de Gestão de Pet Shop

Sistema web desenvolvido para a disciplina **Projeto de Desenvolvimento de Software I** (UniFil — Centro Universitário Filadélfia, Londrina, 2026), utilizando o documento `PetCare_Projeto_de_Desenvolvimento_de_Software_I.pdf` como especificação de requisitos (RF01 a RF07, RNF01 a RNF06), casos de uso (UC01 a UC05), DER, diagrama de classes e diagramas de sequência.

## Integrantes

- **Luca Erichsen Cardoso**
- **Nicolas Afonso Pinto de Mello**

## Stack Tecnológica

- **Front-end:** React 18 + Vite (interface responsiva em português)
- **Back-end:** Node.js + Express (organizado em rotas, controladores, serviços e middlewares)
- **Banco de Dados e ORM:** PostgreSQL + Prisma (esquema e migrações versionadas)
- **Autenticação e Segurança:** E-mail e senha com hash `bcrypt`, tokens `JWT` e controle de acesso por perfil (`ATENDENTE` e `ADMINISTRADOR`)

## Estrutura do Projeto

```text
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Migrações SQL versionadas (incluindo restrição anti-sobreposição)
│   │   ├── schema.prisma        # Modelos e enums conforme o DER e Diagrama de Classes
│   │   └── seed.js              # Dados fictícios de demonstração
│   ├── src/
│   │   ├── config/              # Variáveis de ambiente e cliente Prisma
│   │   ├── controllers/         # Camada de entrada/saída HTTP
│   │   ├── middlewares/         # Autenticação JWT, autorização por perfil e erros
│   │   ├── routes/              # Definição das rotas REST
│   │   ├── services/            # Regras de negócio e transações PostgreSQL
│   │   ├── utils/               # Validação de CPF, e-mail, IDs e erros de domínio
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/                   # Testes unitários e de integração com Supertest
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # Layout, Modal e badges de status
│   │   ├── contexts/            # Contexto de autenticação JWT
│   │   ├── pages/               # Login, Agenda, Clientes, Animais e Serviços
│   │   ├── services/            # Cliente HTTP fetch
│   │   └── utils/               # Formatadores pt-BR (CPF, moeda, datas)
│   └── .env.example
├── compose.yaml                 # Container PostgreSQL 16 para ambiente local com Docker
├── .env.example                 # Exemplo de variáveis de ambiente (sem segredos reais)
└── package.json                 # Scripts unificados do monorepo
```

## Funcionalidades Implementadas

- **Autenticação e Permissões (RF05 / UC05):** Login com e-mail e senha (`POST /auth/login`), logout e validação de token JWT em todas as rotas protegidas. O perfil `ATENDENTE` gerencia clientes, animais e agendamentos; o perfil `ADMINISTRADOR` herda essas permissões e também gerencia o catálogo de serviços (`POST`, `PUT`, `DELETE /servicos`).
- **Clientes (RF01 / UC01):** Cadastro, listagem, consulta detalhada, edição e exclusão com validação de dígitos do CPF, bloqueio de CPF duplicado (`409 Conflict`) e bloqueio de exclusão caso existam animais vinculados (`409 Conflict`).
- **Animais e Histórico (RF02 / RF07 / UC02):** Cadastro vinculado a cliente existente, listagem com filtro por tutor, edição, exclusão protegida quando há histórico e consulta completa de atendimentos passados/agendados/cancelados (`GET /animais/:id/historico`), preservando o `preco_cobrado` da época.
- **Serviços (RF03 / UC03):** Catálogo com nome, descrição, preço positivo e duração estimada em minutos. Exclusão impedida se o serviço já tiver sido utilizado em agendamentos (`409 Conflict`).
- **Agenda Única e Disponibilidade (RF04 / RF06 / UC04):** Criação de agendamentos com um ou mais serviços, cálculo automático de `data_fim` pela soma das durações, registro do `preco_cobrado`, reagendamento preservando a duração reservada e desconsiderando o próprio registro, e cancelamento que libera o horário mantendo o histórico. Conflitos de horário são bloqueados inclusive sob requisições simultâneas por meio de transação com `pg_advisory_xact_lock` e constraint `EXCLUDE USING gist` no PostgreSQL.

## Contas Fictícias de Demonstração

Criadas pelo script `db:seed`:

| Perfil | E-mail | Senha |
| :--- | :--- | :--- |
| **Administrador** | `admin@petcare.com` | `Admin@123` |
| **Atendente** | `atendente@petcare.com` | `Atendente@123` |

## Como Executar Localmente

### Pré-requisitos

- **Node.js** 20+ e **npm**
- **PostgreSQL** 15+ (localmente ou via **Docker** usando o `compose.yaml` incluído)

> **Nota para Windows PowerShell:** caso a política de execução bloqueie `npm.ps1`, utilize `npm.cmd` e `npx.cmd` ou execute em Command Prompt (`cmd`).

### 1. Instalar dependências

```bash
npm run install:all
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo para `backend/.env` (e opcionalmente `.env` na raiz):

```bash
cp .env.example backend/.env
```

No PowerShell:

```powershell
Copy-Item .env.example backend/.env
```

### 3. Iniciar o banco de dados PostgreSQL

**Opção A — Com Docker (`compose.yaml`):**

```bash
docker compose up -d
```

**Opção B — PostgreSQL instalado localmente:**

Garanta que exista o banco `petcare` e o usuário configurados na `DATABASE_URL` do arquivo `backend/.env` (padrão: usuário `petcare`, senha `petcare_dev_password`, porta `5432`, banco `petcare`).

### 4. Aplicar migrações e criar dados de demonstração

```bash
npm run db:migrate
npm run db:seed
```

### 5. Rodar a aplicação

```bash
npm run dev
```

- **Front-end (Vite):** http://localhost:5173
- **API REST (Express):** http://localhost:3001

## Testes e Compilação

Para executar os testes unitários e de integração (requer PostgreSQL ativo com migrações e seed aplicados):

```bash
npm test
```

Para gerar o build de produção do front-end:

```bash
npm run build
```

