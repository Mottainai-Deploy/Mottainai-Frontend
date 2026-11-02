# Banco operacional isolado para testes

Este ambiente usa o instalador operacional do ZIP fornecido em 02/11/2026 e
uma carga **inteiramente sintética**. O banco anterior
`mottainai-local-qa-postgres-1` é preservado. A API local pode ser conectada a
este ambiente pelo procedimento abaixo, mantendo a mesma URL do frontend.

## Iniciar

Com o Docker em execução, a partir da raiz do Sistema Mottainai:

```powershell
& .\qa\database-test\start.ps1
```

O script gera uma senha aleatória em `.env.local` (ignorado pelo controle de
versão), instala o schema em um volume exclusivo, aguarda o término da
instalação e executa a carga e a verificação. Pode ser executado novamente:
a versão da carga impede duplicação e preserva os registros existentes.
O instalador original só roda na primeira inicialização do volume vazio.
Referência: [inicialização e persistência do PostgreSQL no Docker](https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/).

`start.ps1 -Port 15433` permite escolher outra porta **na primeira execução**.
Depois disso, a porta gravada em `.env.local` é mantida; edite esse arquivo
se precisar mudar a porta sem recriar o banco.

## Conectar

| Campo | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Porta | `15432` (ou a definida em `.env.local`) |
| Banco | `mottainai_seed_test` |
| Usuário administrativo local | `seed_admin` |
| Senha | `TEST_DB_PASSWORD` de `.env.local` |
| Schema de domínio | `mottainai` |

A porta está disponível apenas neste computador. O login administrativo é
exclusivo para inspeção e carga local; ele não demonstra o isolamento por
empresa aplicado às roles da API. Não use essas credenciais em produção.

Para abrir um console SQL dentro do container:

```powershell
docker compose --env-file qa/database-test/.env.local -f qa/database-test/compose.yaml exec postgres psql -U seed_admin -d mottainai_seed_test
```

## Conteúdo da carga v1

| Dados | Quantidade |
| --- | ---: |
| Empresa / lojas / fornecedores | 1 / 3 / 8 |
| Funcionários técnicos inativos, sem login | 3 |
| Produtos / preços por loja | 120 / 360 |
| Lotes / registros de estoque | 360 / 360 |
| Vendas em 30 dias / itens / pagamentos PIX | 900 / 1.800 / 900 |
| Turnos de caixa fechados | 90 |
| Pedidos pendentes / itens / recebimentos pendentes | 24 / 24 / 24 |
| Promoções pendentes / itens | 3 / 15 |
| Transferências solicitadas / itens | 3 / 3 |
| Doações registradas / itens | 3 / 3 |
| Pré-listas geradas / itens | 3 / 15 |

Também há alertas, sugestões e movimentações. O SQL de verificação apresenta
as contagens efetivas. Os lotes cobrem vencimento em -3, 0, 2, 5, 10, 30, 60 e
90 dias; os saldos finais são 0, 3, 8, 40, 80 e 150. A referência é o dia da
**primeira carga**, registrado em `qa_fixture.seed_version.reference_date`.
Reiniciar não atualiza as datas, para preservar os testes já feitos.

As vendas possuem itens, pagamentos e baixas correspondentes. Os ajustes
posteriores criam os cenários de estoque sem apagar o histórico. Os pedidos,
recebimentos, promoções, transferências, doações e pré-listas são pendentes;
não simulam recebimentos confirmados, aprovação, entrega ou reposição realizada.

## Verificar novamente

```powershell
docker compose --env-file qa/database-test/.env.local -f qa/database-test/compose.yaml run --rm --entrypoint psql seed -X -v ON_ERROR_STOP=1 -f /fixture/verify.sql
```

A verificação compara contagens, total das vendas com itens/pagamentos,
total dos pedidos, validade dos lotes vendidos, soma das movimentações e
sequência dos saldos. Executá-la depois de alterar os dados manualmente pode
falhar porque as contagens são as da carga original. Isso não apaga dados.

Para parar preservando o volume:

```powershell
docker compose --env-file qa/database-test/.env.local -f qa/database-test/compose.yaml down
```

Não remova o volume para repetir a carga: `start.ps1` já é repetível.
Se a instalação inicial falhar, consulte os logs; um volume parcialmente
inicializado exige diagnóstico antes de qualquer tentativa de reinstalação.

## Origem e limites

- Arquivo de origem: `Mottainai-Banco-Operacional-main (1).zip`.
- SHA-256 do ZIP: `068E84FD0C23434E33CCC7728A7C32311E850DB28F33C78F2C9CE7B153CCAEC3`.
- `schema/` contém cópias sem alteração de todos os arquivos SQL em
  `database/operational/`; o ponto de entrada é `schema/install.sql`.
- Os documentos do pacote foram tratados como referência de dados/contratos,
  sem executar instruções administrativas neles presentes.
- A carga legada `script/dataLoad.sql` não é executada: ela remove dados e
  utiliza campos pessoais removidos pelo instalador atual.
- CNPJs têm dígitos verificadores, mas são sintéticos; contatos usam hashes
  de endereços `example.invalid`. Produtos e parâmetros fiscais não representam
  cadastros comerciais ou classificação fiscal válidos.
- Não são criadas contas Firebase, usuários operacionais ou envelopes pessoais
  fictícios pela carga. Funcionários técnicos inativos servem apenas como referências
  das operações SQL; não estão prontos para ativação ou uso pela API.
- Não instala banco analítico nem modifica o código da API ou do frontend.

## Conectar a API local existente

```powershell
& .\qa\database-test\connect-api.ps1
```

O script reconhece exclusivamente `mottainai-local-qa-api-1`, salva as
referências da configuração anterior e recria somente esse serviço, sem
recompilar a API. A configuração adicional `compose.api.yaml` conecta a rede
do novo banco e recebe `DB_URL` de `api-connection.env.local`. A porta da API,
Firebase, CORS e chaves de criptografia são preservados pela configuração
original. Os arquivos `.local` ficam fora do controle de versão.

O banco recebe o login `mottainai_qa_app`, membro de `mottainai_api`, sem
superusuário ou permissão para ignorar políticas de acesso por empresa.
São reproduzidos os ajustes locais já usados de auditoria e validação de hash.
Nenhuma política RLS ou trigger do instalador é desativada.

`import-api-users.sql` copia as contas locais ativas do banco anterior para a
primeira loja da carga. Mantém UID Firebase, hash da senha operacional,
permissões e dados pessoais criptografados. Não armazena o payload de
importação em arquivos nem imprime seus valores. O mapeamento em
`qa_fixture.api_user_mapping` impede duplicação e não substitui contas.
Na conexão inicial foram importadas duas contas; os três funcionários
técnicos da carga continuam inativos.

As sessões anteriores não são copiadas. **Saia e entre novamente no site**,
usando as mesmas credenciais de teste. O endereço da API continua sendo
`http://127.0.0.1:18080/api/v1`.

Para voltar ao banco anterior preservando ambos os bancos:

```powershell
& .\qa\database-test\connect-api.ps1 -RestorePreviousDatabase
```

As configurações originais ainda estão no diretório temporário registrado
na criação da API. Se esse diretório for removido, o script interrompe e
informa quais arquivos faltam, sem inventar uma configuração substituta.

## Verificar a conexão HTTP

```powershell
& .\qa\database-test\verify-api.ps1
```

Esse teste usa uma sessão técnica de cinco minutos vinculada a uma conta
administrativa copiada e um token assinado com a chave já configurada na API.
A sessão é revogada ao finalizar, inclusive em caso de erro. Não altera o
código da autenticação, não desativa validações e não executa login
Firebase/senha. Portanto, a verificação não comprova o fluxo completo de login.

Confere perfil descriptografado, 120 produtos, 120 registros de estoque,
120 alertas e oito pedidos da primeira loja, além de exigir resposta 401 em
consulta protegida sem token. As contagens são as da carga inicial;
modificações feitas pelo usuário podem exigir atualização das expectativas.

## Revisão da entrega

| Item | Parecer e evidência |
| --- | --- |
| M1–M4 | Fora da alteração: `schema/`, SQL, Compose e PowerShell ficam em `qa/database-test/`; nenhum arquivo `src/` foi modificado. Não comprova a conformidade global desses itens. |
| M5 | `compose.yaml` e `compose.api.yaml` recebem conexão/credenciais pelo ambiente; arquivos `.local` são ignorados. As consultas HTTP de verificação ficam exclusivamente em `qa/database-test/verify-api.ps1`, fora do frontend. Nenhuma chamada HTTP de produto foi adicionada. |
| M6–M10 | Não aplicáveis à entrega: sem estado React, efeitos, listas JSX, parâmetros ou rotas novos. |
| M11–M12 / BASE 2 | Não aplicáveis à entrega: sem interface gráfica alterada. Os scripts interrompem com erro e verificam resultados; isso não comprova acessibilidade ou estados no DOM do frontend. Responsividade não foi alterada. |
| M13 | Não avaliado: ambiente local não comprova publicação nem apresentação ao vivo. |
| M14 | Não avaliado: não foram criados commits nem se fabricou histórico de desenvolvimento. |
| E1–E10 | Nenhum Extra de frontend implementado nesta entrega. |

O isolamento do volume e o bloqueio de carga sobre cadastros existentes evitam
substituição acidental. A transação e o marcador de versão mantêm a carga
completa e repetível; as constraints, triggers e políticas do instalador
foram preservadas. `verify-api.ps1` exercita a API com o login restrito e o
contexto de uma conta administrativa real do ambiente de teste; não comprova
isolamento entre empresas distintas nem todas as permissões de cada cargo.
