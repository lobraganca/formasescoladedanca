# Site Formas Escola de Dança

## Arquivos (suba TODOS no GitHub, do jeito que estão)
- `index.html`: o site.
- `reino.js`: o palco 3D (maquete flutuante) com a bailarina. Usa a biblioteca three.js, carregada da internet.
- `adm.html`: a Área da Irene (abre em **/adm**).
- `api/`: as funções da Vercel que guardam os dados no banco (escola, fila de espera, pedidos, contatos, fotos e acessos).
- `package.json`, `vercel.json`, `robots.txt`: configuração (precisam ir junto).
- `logo-ink.png`, `logo-white.png`, `ig.jpeg`, `og.jpg`, `favicon-64.png`, `apple-touch-icon.png`, `fotos/irene.webp`: imagens.
- `adm.webmanifest`, `adm-sw.js`, `adm-icon-*.png`, `adm-apple-icon.png`: o app da Área da Irene no celular.

## O site
- **Faixa da aula:** a Irene (de collant preto) mostra os passos e a fileira de bailarinas acompanha logo depois, com as instruções num balão. Tocar numa bailarina faz ela dar um salto com brilhos.
- **A bailarina em 3D (abertura):** a bailarina sozinha sobre uma poça de luz, num céu de conto de fadas. A primeira brincadeira é **montar a bailarina**: a pessoa escolhe entre 3 cores de pele, 3 vestidos e 3 sapatilhas, e a bailarina gira e brilha a cada escolha. Com as 3 escolhas feitas, ela faz a reverência e aparecem os 4 passos (Plié, Relevé, Arabesque, Pirouette) e a Coreografia. Dá para girar arrastando e tocar na bailarina.
- **Consulte a disponibilidade:** a família informa responsável, nome e idade da bailarina e WhatsApp. Aparecem os horários das turmas daquela idade; ela escolhe e a mensagem vai para a Irene. O pedido também fica em **Contatos** no /adm (com o horário escolhido). Se a turma estiver completa, entra na fila de espera.
  Para ter mais de um horário para a mesma idade, crie uma turma para cada horário (ex.: "Pré-Ballet · manhã" e "Pré-Ballet · tarde").
- **Espetáculos:** vídeos (YouTube, Instagram, Google Drive ou .mp4 na pasta `videos/`), cadastrados no /adm, aba Site.
- **Fotos:** álbum com visualização em tela cheia, enviado pelo /adm, aba Site.

## Música da caixinha
Arquivo `musica/caixinha.mp3`: "The Seasons, June (Barcarolle)" de Tchaikovsky em versão de caixinha de música, por Gregor Quendel (Pixabay). Recortada em 2 minutos e tocando em repetição. Só toca quando a pessoa toca em Abrir a caixinha, Dar corda, num passo ou em Tocar música; pausa sozinha ao sair da seção.

## Loja do Camarim
Endereço próprio: **www.formasescoladedanca.com.br/camarim**. Mostra todas as peças, com filtro por tipo e a sacolinha (várias peças num pedido só). No site aparecem 4 peças e o botão para a loja; o botão **Pedidos dos alunos** fica sempre no topo.

## Área da Irene
Endereço: **www.formasescoladedanca.com.br/adm** (não aparece no site e não vai para o Google).
Login: **irene** · Senha: **123456789**
Para trocar: na Vercel, **Settings → Environment Variables**, crie `ADMIN_USER` e `ADMIN_PASS` e faça Redeploy.

Abas:
- **Início**: alunos ativos, recebido no mês, atrasados, fila, aulas de hoje (com atalho para a chamada) e novidades do site.
- **Alunos**: cadastro (nascimento, turma, responsável, WhatsApp, mensalidade, vencimento, observações), busca, ativo/inativo, histórico de troca de turma, mensalidades e frequência.
- **Turmas**: idade, dias, horários, capacidade, mensalidade padrão, cor, ordem. Barra de ocupação. Em **Alunos (n)** dá para **mover aluno de turma** (com “Desfazer”). Define o que o site mostra: vagas automáticas, “Consulte as vagas” ou “Turma completa” (abre a fila de espera no site).
- **Chamada**: escolhe a turma e o dia, toca P / F / J (presente, falta, justificada) ou “Todos presentes”. Salva sozinha, de qualquer celular. Em **Frequência**: presença por aluno e por turma (este mês, mês passado, 3 meses, ano), alunos que pedem atenção (abaixo de 75% ou 3 faltas seguidas) com mensagem pronta para a família, e planilha.
- **Mensalidades**: o quadro **Quem está devendo** mostra cada aluno com os meses vencidos e o total (toque no mês para dar baixa, ou em Cobrar para mandar a mensagem com tudo). Mês a mês: **Recebi** (valor, data, forma), **Cobrar** e **Recibo** pelo WhatsApp com mensagem pronta, filtros e **planilha do mês** (CSV, abre no Excel).
- **Caixa** (igual ao da Ingá): entradas, saídas, saldo e a receber do mês; de onde veio o dinheiro, como pagaram, para onde foi, os últimos 6 meses e a lista de movimentos. **Lançar entrada** e **Lançar despesa** para o que não é mensalidade (aluguel, figurino, ingressos…). Planilha do mês.
- **Fila de espera**: por turma, na ordem de chegada (do site ou adicionada à mão). **Avisar** (WhatsApp) e **Matricular** (vira aluno da turma).
- **Camarim**: pedidos das mães (Novo → Separado → Entregue, pago/não pago, WhatsApp) e as peças do site (foto, preço, tamanhos, cores, ordem).
- **Contatos**: quem pediu disponibilidade no site, com 📩 Enviou / 🕓 Não enviou. Chamar, Já falei, Matricular, Pôr na fila.
- **Acessos**: visitas por dia, de onde vieram, celular ou computador, cidades, estados, turmas mais procuradas e peças mais vistas.
- **Site**: WhatsApp, Instagram, endereço, horário de atendimento, texto da Irene, fotos da galeria e as dúvidas.

Tudo salva sozinho (o topo mostra “Salvo”).

## App no celular
Abra **www.formasescoladedanca.com.br/adm** no celular:
- **Android (Chrome):** toque em **Instalar o app** no Início (ou ⋮ → **Instalar app**).
- **iPhone (Safari):** **Compartilhar** → **Adicionar à Tela de Início** → **Adicionar**.

## Publicar (igual aos sites da Ingá e dos Leopardos)
1. Crie o repositório no GitHub (ex.: `lobraganca/formasescoladedanca`) e suba todos os arquivos e a pasta `api`: https://github.com/new
2. Na Vercel, importe o repositório: https://vercel.com/new
3. **Ligue o banco** (sem ele, tudo fica em “modo de teste”, só no aparelho):
   - https://vercel.com/marketplace/upstash → **Install** → plano **Free** → nome `formas` → região São Paulo (gru1), se aparecer.
   - Conecte ao projeto `formasescoladedanca` (Production, Preview e Development).
   - https://vercel.com/dashboard → projeto → **Deployments** → no último, **⋯ → Redeploy**.
4. Entre no /adm, confira as turmas e preencha dias, horários, capacidade e mensalidades.

## Domínio (GoDaddy + Vercel)
1. Vercel: **Project → Settings → Domains** → adicione `formasescoladedanca.com.br` e `www.formasescoladedanca.com.br`.
2. GoDaddy (https://dcc.godaddy.com/control/portfolio → domínio → **DNS**):
   - Tipo **A**, nome **@**, valor **76.76.21.21**
   - Tipo **CNAME**, nome **www**, valor **cname.vercel-dns.com**
   Apague o registro A/CNAME “www” de estacionamento da GoDaddy.
3. Espere a Vercel mostrar “Valid Configuration”.

## Para revisar com a Irene
- Nomes, idades e descrições das turmas são sugestões: ela ajusta na aba Turmas.
- Texto “Sobre a Irene”, dúvidas e peças do Camarim (preços, tamanhos, fotos) estão na aba Site / Camarim.
- Endereço e horário de atendimento ainda estão vazios (aba Site).
