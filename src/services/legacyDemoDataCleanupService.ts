const LEGACY_REPORT_DATABASES = [
  'mottainai-management-reports',
  'mottainai-monthly-financial-reports',
] as const;
const CLEANUP_KEY = 'mottainai:legacy-demo-reports-cleared:v1';

export function removeLegacyDemoReports(): void {
  if (typeof indexedDB === 'undefined') return;

  try {
    if (localStorage.getItem(CLEANUP_KEY) === 'true') return;
  } catch {
    // A limpeza continua mesmo se o navegador bloquear o acesso ao marcador.
  }

  try {
    const requests = LEGACY_REPORT_DATABASES.map((databaseName) => indexedDB.deleteDatabase(databaseName));
    void Promise.all(requests.map((request) => new Promise<void>((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Não foi possível remover o armazenamento legado.'));
      request.onblocked = () => reject(new Error('O armazenamento legado está aberto em outra aba.'));
    }))).then(() => {
      try {
        localStorage.setItem(CLEANUP_KEY, 'true');
      } catch {
        // A limpeza foi concluída; sem marcador, uma próxima visita poderá repeti-la.
      }
    }).catch(() => {
      // Uma próxima visita tenta novamente se a limpeza foi bloqueada.
    });
  } catch {
    // Uma falha na limpeza não impede o carregamento da aplicação.
  }
}
