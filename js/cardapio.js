/*
 * Cardápio da Pizzaria Três Irmãos
 * ---------------------------------
 * Para mudar preço, sabor, bebida ou taxa de entrega, edite SÓ este arquivo.
 * Preços em reais, com ponto no lugar da vírgula (ex.: 28.90 = R$ 28,90).
 */
window.CARDAPIO = {
  // Número que recebe os pedidos (55 + DDD + número, só dígitos)
  whatsapp: '5581981777313',

  categorias: [
    { id: 'salgadas', nome: 'Pizzas Salgadas', resumo: 'Os clássicos que não podem faltar' },
    { id: 'especiais', nome: 'Pizzas Especiais', resumo: 'Pra quando a fome pede algo a mais' },
    { id: 'doces', nome: 'Pizzas Doces', resumo: 'A sobremesa que vem em fatias' }
  ],

  // "foto" é opcional: sem foto, o site desenha a pizza sozinho.
  pizzas: [
    { id: 'mussarela', nome: 'Mussarela', categoria: 'salgadas', preco: 28.90 },
    { id: 'calabresa', nome: 'Calabresa', categoria: 'salgadas', preco: 28.90 },
    { id: 'marguerita', nome: 'Marguerita', categoria: 'salgadas', preco: 28.90 },
    { id: 'frango', nome: 'Frango', categoria: 'salgadas', preco: 28.90 },

    { id: 'portuguesa', nome: 'Portuguesa', categoria: 'salgadas', preco: 33.90, foto: 'img/foto-portuguesa.webp' },
    { id: 'galinha-caipira', nome: 'Galinha Caipira', categoria: 'salgadas', preco: 33.90 },
    { id: 'frango-catupiry', nome: 'Frango com Catupiry', categoria: 'salgadas', preco: 33.90 },
    { id: 'frango-cheddar', nome: 'Frango com Cheddar', categoria: 'salgadas', preco: 33.90 },
    { id: 'calabresa-catupiry', nome: 'Calabresa com Catupiry', categoria: 'salgadas', preco: 33.90 },

    { id: 'bacon', nome: 'Bacon', categoria: 'especiais', preco: 34.90 },
    { id: 'atum', nome: 'Atum', categoria: 'especiais', preco: 34.90 },
    { id: 'quatro-queijos', nome: 'Quatro Queijos', categoria: 'especiais', preco: 40.00 },
    { id: 'frango-bacon', nome: 'Frango com Bacon', categoria: 'especiais', preco: 40.00 },

    { id: 'cartola', nome: 'Cartola', categoria: 'doces', preco: 27.90 },
    { id: 'brigadeiro', nome: 'Brigadeiro', categoria: 'doces', preco: 27.90 },
    { id: 'sonho-de-valsa', nome: 'Sonho de Valsa', categoria: 'doces', preco: 27.90 },
    { id: 'doce-de-leite', nome: 'Doce de Leite', categoria: 'doces', preco: 27.90 },
    { id: 'pacoca', nome: 'Paçoca', categoria: 'doces', preco: 27.90 },
    { id: 'mms', nome: "M&M's", categoria: 'doces', preco: 27.90 }
  ],

  fatias: 8,

  precoBorda: 8.00,
  bordas: [
    { id: 'catupiry', nome: 'Catupiry' },
    { id: 'cheddar', nome: 'Cheddar' },
    { id: 'mussarela', nome: 'Mussarela' },
    { id: 'cream-cheese', nome: 'Cream Cheese' }
  ],

  bebidas: [
    { id: 'antarctica', nome: 'Antarctica', tamanhos: [{ id: '1l', nome: '1L', preco: 9.00 }, { id: '2l', nome: '2L', preco: 13.00 }] },
    { id: 'coca-cola', nome: 'Coca-Cola', tamanhos: [{ id: '1l', nome: '1L', preco: 10.00 }, { id: '2l', nome: '2L', preco: 14.00 }] }
  ],

  // ATENÇÃO: taxa por bairro AINDA NÃO CONFIRMADA com a dona.
  // Os valores abaixo são provisórios. É só trocar o número de cada bairro.
  bairros: [
    { nome: 'Ouro Preto', taxa: 5.00 },
    { nome: 'Jardim Fragoso', taxa: 5.00 },
    { nome: 'Jardim Atlântico', taxa: 7.00 },
    { nome: 'Rio Doce', taxa: 7.00 },
    { nome: 'Casa Caiada', taxa: 8.00 },
    { nome: 'Bairro Novo', taxa: 8.00 }
  ],

  // Meio a meio pode juntar um sabor salgado com um doce? (A CONFIRMAR com a dona)
  meioAMeioSalgadaComDoce: false,

  pagamentos: ['Pix', 'Cartão de débito', 'Cartão de crédito', 'Dinheiro'],

  // Dias: 0 = domingo, 1 = segunda ... 6 = sábado. Fecha segunda.
  horario: { dias: [2, 3, 4, 5, 6, 0], abre: 17, fecha: 23 }
};
