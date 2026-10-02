// Ponto de entrada do servidor.
// Importa o app Express já configurado e chama listen.
// Este arquivo NÃO é importado nos testes (que usam app.js diretamente).

import app from './app.js';
import { PORT } from './config.js';

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Documentação da API em http://localhost:${PORT}/api-docs`);
});
