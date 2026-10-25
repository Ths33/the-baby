# Our Little Star ✨

Uma revelação cinematográfica do bebê para a família, projetada para celular e compartilhamento por WhatsApp.

## Recursos
- Céu estrelado animado, estrela ascendente e revelação azul/rosa
- Câmera frontal e microfone com consentimento explícito
- Gravação com MediaRecorder e visualização antes do envio
- Upload privado para Cloudflare R2, metadados em D1
- Painel dos pais em /admin com token privado
- Modo sem gravação para quem não autoriza

## Desenvolvimento
```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev
```
Para testar as APIs localmente configure D1 e R2 e use `wrangler dev` conforme documentação do adapter Cloudflare; `astro dev` pode não oferecer bindings locais. **Não publique .dev.vars nem credenciais.**

## Cloudflare
1. Crie um bucket R2 privado: `npx wrangler r2 bucket create the-baby-reactions`.
2. Crie um D1: `npx wrangler d1 create the-baby`, copie o `database_id` retornado para `wrangler.jsonc`.
3. Rode `npx wrangler d1 migrations apply the-baby --remote`.
4. Configure secrets via painel da aplicação / Wrangler: `REVEAL_GENDER` (boy/girl), `ADMIN_TOKEN` (string aleatória extensa). Nunca coloque REVEAL_GENDER em variáveis PUBLIC ou no Git.
5. Faça build, configure domínio HTTPS e implante como Cloudflare Worker (adapter Astro). Ajuste `wrangler.jsonc` conforme o formato de deploy da versão do adapter utilizada.

## Segurança e UX
A câmera só abre após ação do visitante. A gravação requer consentimento e o usuário pode descartar o vídeo. A opção sem vídeo permanece disponível. O navegador **não grava a própria tela da revelação**, apenas câmera + microfone: o vídeo da reação pode ser sincronizado com a animação na edição final. Os vídeos estão protegidos no R2 sem URL pública. O endpoint de administração usa Bearer token. Para produção recomenda-se migrar para Cloudflare Access, impor rate limits, política de retenção e revisar avisos de privacidade conforme LGPD. Não use dados de teste com o segredo real. Se o navegador não suportar MediaRecorder, o usuário poderá continuar sem gravar.

## Estado
Código base pronto para integração e testes reais; **não foi feito deploy nem foi validado em dispositivos físicos**. A experiência exige que o serviço de armazenamento seja provisionado para o envio funcionar.
