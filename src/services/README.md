# Serviços operacionais

As chamadas usam `apiClient.ts` e a URL `VITE_API_BASE_URL`. Cada recurso tem
um serviço e contratos em `src/types/`. O servidor valida autorização, loja,
saldo, concorrência e transições conforme o estado atual do registro.

## Etapas posteriores à execução de sugestões

| Serviço | Operações disponíveis |
| --- | --- |
| `purchaseOrderService.ts` | Listar por loja/período, consultar, criar, editar com `version`, aprovar/cancelar e excluir pedido |
| `receivingService.ts` | Listar por loja/período, consultar, registrar recebimento e confirmar ou indicar divergência |
| `promotionService.ts` | Listar por loja, consultar, criar, editar, excluir, aprovar, rejeitar e cancelar promoção |
| `promotionItemService.ts` | Consultar, incluir, editar e excluir itens de uma promoção |
| `donationService.ts` | Listar por loja/período, consultar, registrar, concluir ou cancelar doação |
| `replenishmentService.ts` | Gerar/consultar pré-listas e executar/consultar reposições |

São 32 métodos. Os caminhos, verbos e contratos foram conferidos nos controllers,
DTOs e serviços Java dos pacotes operacionais fornecidos pelo usuário.
Os tipos de promoção foram conferidos também no schema SQL operacional.

## Uso pelas telas

- Consultas aceitam `AbortSignal`; a loja é informada explicitamente, inclusive
  para administradores. Os históricos recebem datas ISO locais sem fuso, com
  início e fim e um intervalo de até seis meses.
- Criação de pedido, recebimento, doação, geração de pré-lista e execução de
  reposição exigem uma chave `Idempotency-Key`, fornecida pelo chamador. Uma
  tentativa repetida deve manter os mesmos dados e a mesma chave.
- Promoções e seus itens não oferecem esse cabeçalho no contrato consultado.
  Após resposta inconclusiva, consulte o servidor antes de repetir uma escrita.
- Os serviços não aplicam tentativas automáticas de escrita após falha de rede.
  O cliente HTTP compartilhado mantém a renovação de sessão após HTTP 401.
- Os payloads passam por `src/utils/operationalValidation.ts` antes de enviar.
  Apenas os campos previstos são enviados; erros são propagados para a tela
  apresentar carregamento, sucesso e erro acessíveis.
- Pedido de compra não dá entrada em estoque. No backend, o recebimento
  confirmado registra a entrada; concluir a doação registra a saída; executar
  reposição movimenta o estoque. As telas devem revisar esses efeitos antes
  de solicitar a operação.
- A edição de pedido exige a versão consultada no servidor. Um HTTP 409 deve
  levar a nova consulta e revisão, sem sobrescrever silenciosamente o registro.

## Limites

Estes serviços cobrem as etapas operacionais acima. Não fornecem endpoints de
vendas, SPED, conciliação de caixa, indicadores financeiros, importação XML/CSV
ou recuperação de senha. Também não criam dados locais para substituir esses
contratos. APIs de clientes e administração de empresas/planos/regras não foram
adicionadas a este fluxo operacional.

Os testes de contrato em `tests/operational-services.test.tsx` usam respostas
sintéticas. Gravações reais precisam de Firebase e de conta operacional
vinculada a loja, funcionário e permissões. Nenhuma escrita real foi executada
para validar esta camada.

## Cobertura da pasta: ainda parcial

Ter um arquivo de serviço não significa cobrir todos os métodos do controller.
A revisão dos controllers fornecidos identificou estas lacunas:

| Recurso | Exemplos de operações ainda sem serviço |
| --- | --- |
| Produtos | Edição cadastral, código de barras, preços em lote, fornecedores e histórico |
| Fornecedores | Histórico e vínculos com produtos |
| Estoque e lotes | Cadastro/edição/exclusão de estoque, busca por código de barras, vencimentos e consulta individual do lote |
| Cadastros auxiliares | Escritas de endereços, categorias e perfis fiscais; detalhe de cargo e administração de lojas |
| Funcionários | Detalhe/exclusão, turnos, solicitações de cancelamento e auditoria por funcionário |
| Motor | Criação de alertas e sugestões (a consulta, decisão e execução estão disponíveis) |
| Autenticação | Validação/aceite de convite |
| Administração | Empresas, planos, regras, monitoramento e consulta de CEP |
| Aplicação de clientes | Catálogo, perfil, fidelidade e administração de clientes |

O backend possui `/auth/password-reset/validate`, `/auth/password-reset` e
`/auth/password`. Os dois primeiros fazem parte do aceite de convite operacional;
isso não fornece o fluxo público de recuperação por e-mail mostrado no site.
O aceite de convite ainda não tem método próprio. A troca autenticada de senha
está disponível em `passwordChangeService.ts` e na página Minha conta.

## Operações compactas conectadas às telas

| Tela existente | Integração |
| --- | --- |
| Detalhes do produto | Ativar/desativar, preço da loja da conta e exclusão, sempre com revisão |
| Fornecedores | E-mail e telefone no painel de edição e exclusão com confirmação |
| Estoque | Ativar/desativar lote por identificador, com confirmação; exige administrador no servidor |
| Contagem | Remover item antes da finalização, com confirmação e nova consulta ao servidor |
| Minha conta | Trocar senha operacional, com confirmação e encerramento da sessão |
| Login | E-mail e senha Firebase; sessão operacional obtida com o token validado |

O preço é alterado somente na loja do perfil, decisão adotada para evitar uma
seleção administrativa de outras lojas. A ativação do produto é cadastral.
Status de lote e remoção de item da contagem não ajustam saldo de estoque.
Permissões e restrições de vínculo continuam verificadas no servidor.

A senha de acesso é validada somente no Firebase. A API recebe apenas o token
Firebase em `POST /auth/firebase`, valida a identidade e o vínculo operacional
ativo e emite a sessão do sistema. Não há comparação adicional de senha no login.
A troca da senha operacional não altera a senha Firebase. As senhas não são
persistidas pelo frontend.

### Adaptação do login móvel para o sistema operacional

O aplicativo Android fornecido autentica no Firebase e consulta o perfil do
cliente antes de liberar a sessão. Aqui, o contrato existente é operacional:
Firebase → `POST /auth/firebase` somente com token Firebase →
`GET /auth/profile`. O endpoint de clientes não substitui estes endpoints.

`authResponseValidation.ts` confere os tokens, o tipo Bearer e os prazos
positivos da sessão antes de utilizá-la. O acesso só é publicado no Context
depois de confirmar um perfil com identificador válido, nome e `active=true`.
Perfil ausente, incompleto ou inativo encerra a tentativa; não cria cadastros.

O Provider impede envios simultâneos e ignora resultados de operações anteriores
após saída, expiração ou desmontagem. Uma falha atrasada de saída também não
substitui o estado de um novo login. Mantêm-se o formulário responsivo, uma única
senha de acesso e os tokens em memória. Não foram adicionados acesso
Google, cadastro público ou recuperação de senha do aplicativo de clientes.

`tests/auth-login-contract.test.tsx` verifica estes cenários com respostas
simuladas. A API precisa disponibilizar `/auth/firebase`; versões antigas com
apenas `/auth/login` exigem atualização. A integração real ainda depende da configuração Firebase/API e de
uma conta operacional válida.

Após resposta inconclusiva, produto, fornecedor, lote e contagem oferecem
consulta ao servidor antes de outro envio. Após erro de troca de senha, os
campos são limpos e há uma ação para encerrar a sessão e verificar novo acesso.
O aviso de troca concluída fica no Context em memória até uma nova tentativa
de login, para não depender da ordem dos redirecionamentos da rota protegida.

## Revisão de qualidade

- `getCurrentStoreId` reaproveita por até cinco segundos somente o identificador
  da loja obtido em uma consulta de perfil bem-sucedida. Isso evita consultas
  repetidas ao perfil no início da sessão. O reaproveitamento é invalidado ao
  trocar/encerrar a sessão e no início e fim de qualquer escrita, inclusive
  renovação de token e escritas que falham. Respostas anteriores à invalidação
  não repovoam esse valor. `getCurrentProfile` continua consultando o servidor
  sempre; senhas, tokens Firebase e permissões não são colocados nesse cache.
  O cancelamento por `AbortSignal` continua sendo respeitado. As três etapas
  do login (Firebase, API e perfil) e os seis segundos da animação são mantidos.

- `apiClient.ts` rejeita respostas de sessões substituídas, inclusive respostas
  bem-sucedidas, e impede que logout/renovação atrasados apaguem outro login.
- Chamadas concorrentes reutilizam a renovação; um HTTP 401 atrasado usa o token
  já renovado. O corpo de uma escrita é serializado uma vez para manter os mesmos
  dados durante essa repetição.
- `apiPages` centraliza os seis carregamentos paginados, preserva cancelamento e
  verifica estrutura e número da página quando informado pelo servidor. Isso
  reduz duplicação; não representa uma redução medida de requisições ou latência.
- Funcionários e autenticação Firebase validam os dados na entrada do serviço,
  mesmo quando chamados sem passar pelos formulários.
- O tipo interno da leitura em voz alta está em `src/types/speech.types.ts`.
- Testes adicionais em `tests/service-review.test.tsx` verificam concorrência,
  troca de conta, paginação e validação na entrada dos serviços.

## Fluxos operacionais conectados

| Tela existente | Operações conectadas |
| --- | --- |
| Estoque | Consulta, criação, edição com versão, aprovação/cancelamento e exclusão de pedidos; consulta, registro e conferência de recebimentos; geração/consulta de pré-listas e execução/consulta de reposições |
| Produtos | Consulta, criação, edição, exclusão, aprovação, rejeição e cancelamento de promoções; consulta, inclusão, edição e exclusão de itens promocionais |
| Avarias e consumo interno | Consulta e registro de doações; conclusão ou cancelamento do registro |
| Acompanhamento de sugestões | A execução devolve o tipo e o identificador do registro criado. Os links abrem os detalhes do pedido, promoção, doação ou pré-lista por consulta GET, sem repetir a escrita |

Pedido de compra não registra saldo. O recebimento precisa ser registrado e depois
confirmado para dar entrada no estoque; uma divergência fica em etapa separada.
Doação registrada não retira saldo até sua conclusão. Pré-lista gerada não
executa reposição; a execução é uma confirmação separada. Promoção criada pela
sugestão segue inativa e pendente de aprovação até a ação de aprovação.

## Mensagens de erro em português

As respostas de erro HTTP passam pelo catálogo local em
`src/utils/apiErrorMessages.ts`. Mensagens conhecidas recebem orientação em
português; mensagens desconhecidas usam um texto em português conforme o status
HTTP, sem exibir detalhes técnicos do servidor. O status original é preservado
em `ApiRequestError`, mantendo as regras de conflito, sessão e repetição.
Erros Firebase também são apresentados em português. Não há serviço externo de
tradução nem envio de credenciais para tradução.

## Consultas simultâneas

O cliente HTTP compartilha GETs simples com o mesmo caminho, parâmetros e sessão
enquanto a resposta estiver pendente. A conclusão ou falha remove a entrada:
uma atualização posterior sempre faz nova consulta. Opções especiais, como
cabeçalhos personalizados, seguem em chamadas independentes.

Cada consumidor mantém seu cancelamento. O transporte só é abortado quando
todos os consumidores cancelam. Trocar de sessão ou iniciar/concluir uma escrita
impede novas consultas de aderirem às leituras anteriores. Escritas não são
agrupadas e preservam seus corpos e chaves de idempotência.

Os testes em `tests/api-request-sharing.test.tsx` usam respostas sintéticas para
verificar contagem de chamadas, paginação, cancelamento, erros e isolamento de
contas. Duas cargas concorrentes de estoque compartilham perfil, lotes, produtos
e inventário: quatro chamadas, em vez das oito que fariam separadamente.
