// Somente textos conhecidos são exibidos; respostas desconhecidas usam mensagens locais.
const messages: Record<string, string> = {
  'operational account is unavailable': 'Seu acesso ao sistema não está disponível. Solicite a revisão do vínculo e da ativação do cadastro.',
  'invalid cpf or password': 'Não foi possível entrar. Confira a senha operacional e se o acesso está ativo.',
  'invalid firebase identity or password': 'Não foi possível entrar. Confira a senha operacional e se o acesso está ativo.',
  'bad credentials': 'Não foi possível entrar. Confira suas credenciais.',
  'employee role is not supported for api authentication': 'O cargo desta conta não está configurado para acessar o sistema. Solicite a revisão do cadastro.',
  'staff data could not be authenticated or decrypted': 'Não foi possível ler os dados protegidos do cadastro. Solicite a revisão da configuração do sistema.',
  'invalid firebase id token': 'A autenticação Firebase não foi aceita. Entre novamente.',
  'a verified firebase id token is required': 'Entre com sua conta Firebase para continuar.',
  'invalid or expired invitation token': 'O convite é inválido, expirou ou já foi utilizado.',
  'invitation is already linked to another firebase account': 'Este convite está vinculado a outra conta Firebase.',
  'firebase account is already linked to another user': 'Esta conta Firebase já está vinculada a outro usuário.',
  'unable to process the request due to a database error': 'Não foi possível concluir a operação devido a uma falha no banco de dados. Tente novamente mais tarde.',
  'administrator or manager access is required': 'Esta operação exige acesso de administrador ou gerente.',
  'company reached the user limit of its subscription plan': 'A empresa atingiu o limite de usuários do plano.',
  'wait five minutes before sending another invitation': 'Aguarde cinco minutos antes de solicitar outro convite.',
  'only an inactive employee without a password can be invited again': 'Um novo convite só pode ser enviado a um funcionário inativo que ainda não definiu a senha.',
  'you cannot delete your own access': 'Você não pode excluir seu próprio acesso.',
  'you cannot disable your own access': 'Você não pode desativar seu próprio acesso.',
  'an email is required when creating login access': 'Informe um e-mail para criar o acesso ao sistema.',
  'an email is required while login access exists': 'O e-mail é obrigatório enquanto houver acesso ao sistema.',
  'add an email before granting login access': 'Cadastre um e-mail antes de conceder acesso ao sistema.',
  'the employee must define a password before activation': 'O funcionário precisa definir a senha antes de ativar o acesso.',
  'the employee must link a firebase account before activation': 'Vincule a conta Firebase antes de ativar o acesso.',
  "the employee's role and store must be active before activation": 'O cargo e a loja do funcionário precisam estar ativos.',
  "the employee's role, store and company must be active before inviting again": 'Ative o cargo, a loja e a empresa antes de solicitar outro convite.',
  'only pending purchase orders can be updated': 'Somente pedidos de compra pendentes podem ser editados.',
  'only pending purchase orders can be deleted': 'Somente pedidos de compra pendentes podem ser excluídos.',
  'invalid purchase order status transition': 'Não é possível alterar o pedido para esse status. Atualize a consulta.',
  'inventory must belong to the count store': 'O estoque deve pertencer à mesma loja da contagem.',
  'inventory item is already part of this count': 'Este item de estoque já está incluído na contagem.',
  'an inventory count requires at least one item before completion': 'Inclua pelo menos um item antes de finalizar a contagem.',
  'only an inventory count in progress can be changed': 'Somente contagens em andamento podem ser alteradas.',
  'product has active supplier links': 'O produto possui vínculos ativos com fornecedores.',
  'password must be at least 8 characters long': 'A senha deve ter pelo menos oito caracteres.',
  'access denied': 'Sua conta não tem permissão para esta operação.',
};
const resources: Record<string, string> = {
  employee: 'Funcionário', store: 'Loja', company: 'Empresa', product: 'Produto',
  supplier: 'Fornecedor', batch: 'Lote', inventory: 'Registro de estoque',
  promotion: 'Promoção', 'purchase order': 'Pedido de compra', receiving: 'Recebimento',
  donation: 'Doação', 'inventory count': 'Contagem', 'suggested action': 'Sugestão', alert: 'Alerta',
};

export function apiErrorMessage(payload: unknown, status: number): string {
  const raw = typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
    ? payload.message.trim().toLowerCase().replace(/[.!]$/, '') : '';
  // Falhas internas podem conter detalhes técnicos: não os devolva ao usuário.
  if (status === 408 || status === 504) return 'O serviço demorou para responder. Consulte o estado da operação antes de tentar novamente.';
  if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente mais tarde.';
  if (Object.prototype.hasOwnProperty.call(messages, raw)) return messages[raw];
  if (status === 404 && raw.endsWith(' not found')) {
    const resource = raw.slice(0, -10);
    if (Object.prototype.hasOwnProperty.call(resources, resource)) return `${resources[resource]} não encontrado(a). Atualize a consulta.`;
  }
  switch (status) {
    case 400: case 422: return 'Não foi possível concluir a operação. Revise os dados informados.';
    case 401: return 'Sua autenticação não foi aceita. Confira as credenciais e entre novamente.';
    case 403: return 'Sua conta não tem permissão para esta operação.';
    case 404: return 'O registro solicitado não foi encontrado. Atualize a consulta.';
    case 409: return 'Os dados foram alterados ou entram em conflito com outro registro. Atualize a consulta antes de tentar novamente.';
    case 413: return 'Os dados enviados ultrapassam o tamanho permitido.';
    case 415: return 'O formato dos dados enviados não é aceito.';
    case 429: return 'Foram feitas muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    default: return 'Não foi possível concluir a operação. Tente novamente mais tarde.';
  }
}

export function firebaseErrorMessage(payload: unknown): string {
  const error = typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
  const code = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message.split(' : ')[0] : '';
  switch (code) {
    case 'TOO_MANY_ATTEMPTS_TRY_LATER': return 'Muitas tentativas de acesso. Aguarde um pouco antes de tentar novamente.';
    case 'USER_DISABLED': return 'Esta conta Firebase está desativada. Solicite ajuda ao responsável pelo acesso.';
    case 'OPERATION_NOT_ALLOWED': return 'O acesso por e-mail e senha não está habilitado neste projeto Firebase.';
    case 'API_KEY_INVALID': case 'INVALID_API_KEY': return 'A configuração de acesso ao Firebase é inválida. Solicite a revisão do ambiente.';
    default: return 'Não foi possível autenticar no Firebase. Confira o e-mail e a senha Firebase.';
  }
}
