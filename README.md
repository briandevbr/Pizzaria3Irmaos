# Pizzaria Três Irmãos — site

Site da Pizzaria Três Irmãos (Olinda-PE). O cliente monta o pedido no site (inteira ou meio a meio, borda recheada, bebidas, entrega ou retirada) e envia tudo pronto pro WhatsApp da pizzaria.

HTML, CSS e JavaScript puro: é só abrir o `index.html` no navegador.

## Onde mudar as coisas

| O quê | Onde |
|---|---|
| Preços, sabores, bordas e bebidas | `js/cardapio.js` |
| Taxa de entrega de cada bairro | `js/cardapio.js` → `bairros` |
| Meio a meio misturando salgada com doce | `js/cardapio.js` → `meioAMeioSalgadaComDoce` |
| Horário (usado no "Aberto agora") | `js/cardapio.js` → `horario` |
| Logo | trocar o arquivo `img/logo.png` (quadrado, fundo transparente) |

Sabores sem foto ganham um desenho automático. Para usar uma foto, coloque o arquivo em `img/` e adicione `foto: 'img/arquivo.webp'` no sabor, como na Portuguesa.

## Publicar (GitHub Pages)

1. No plano grátis do GitHub, o repositório precisa ser **público** (Settings → General → Danger Zone → Change visibility).
2. Settings → Pages → *Deploy from a branch* → branch `main`, pasta `/ (root)` → Save.
3. Em 1–2 minutos o site fica em `https://briandevbr.github.io/Pizzaria3Irmaos/`

Cada commit na `main` atualiza o site sozinho.

## A confirmar com a pizzaria

- Taxa de cada bairro (os valores atuais são provisórios)
- Se o meio a meio pode juntar salgada com doce (hoje: não pode)
- Ingredientes de cada sabor, pedido mínimo e tempo de entrega
