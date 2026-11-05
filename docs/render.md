# Publicação do site no Render

O Blueprint cria um site estático com Node 22, compila com `npm ci && npm run build` e encaminha rotas da aplicação para `index.html`. O deploy automático está desligado.

Informe `VITE_FIREBASE_API_KEY` do aplicativo web do mesmo projeto Firebase usado pela API Operacional. Uma chave Android pode ter restrições que impedem chamadas de navegadores. A chave web é incorporada ao código entregue ao navegador; não use credenciais privadas como variáveis `VITE_*`.

Após publicar, copie a origem HTTPS exata atribuída ao site e configure-a em `CORS_ALLOWED_ORIGINS` da API Operacional no Render. Preserve outras origens necessárias, separadas por vírgulas. Reinicie ou reaplique as configurações e teste login e catálogo com uma conta operacional. Não utilize curinga para contornar erros.

A API Operacional precisa estar respondendo. O Blueprint do site não testa a conexão com o banco nem garante que o login esteja funcional. Confira o plano e limites atuais antes da publicação.
