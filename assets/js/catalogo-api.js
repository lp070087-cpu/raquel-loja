import { PRODUTOS, CATEGORIAS } from './dados.js';
import { api } from './api.js';

let carregamento;
const categoriasOriginais=CATEGORIAS.map(c=>({...c}));
/** Mantém a estrutura visual existente; preços e estoque vêm do servidor. */
export function carregarCatalogo() {
  if (carregamento) return carregamento;
  carregamento = (async () => {
    document.documentElement.dataset.catalogo = 'carregando';
    const progresso = document.createElement('div');
    progresso.className = 'container mensagem';
    progresso.setAttribute('role', 'status');
    progresso.setAttribute('aria-live', 'polite');
    progresso.textContent = 'Carregando produtos e disponibilidade…';
    document.querySelector('main')?.prepend(progresso);
    try {
      const resposta = await api('/products');
      if (!Array.isArray(resposta.products)) throw new Error('Catálogo indisponível.');
      const produtos = resposta.products.filter((p) => p.active !== false).map((p) => {
        const original = PRODUTOS.find((item) => item.id === p.id) || {};
        return { ...original, ...p, nome: p.nome || p.name,
          preco: p.priceCents / 100, estoque: p.stock,
          descricao: p.descricao || p.description,
        };
      });
      PRODUTOS.splice(0, PRODUTOS.length, ...produtos);
      try {
        const {categories}=await api('/categories');
        if(Array.isArray(categories))CATEGORIAS.splice(0,CATEGORIAS.length,...categories.filter(c=>c.active!==false).map(c=>{
          const original=categoriasOriginais.find(item=>item.slug===c.slug);
          const produto=produtos.find(p=>p.categoryId===c.id||p.categoria===c.slug);
          return {...original,id:c.id,slug:c.slug,nome:c.name,chamada:original?.chamada||c.name,grupo:original?.grupo||'outros',foto:original?.foto||produto?.foto||null};
        }));
      } catch { /* Keep the existing visual catalog if category metadata is temporarily unavailable. */ }
      document.documentElement.dataset.catalogo = 'servidor';
      return true;
    } catch {
      // A vitrine de apresentação continua disponível; o checkout não usa
      // estes preços como fonte oficial e nunca cria pedidos sem servidor.
      document.documentElement.dataset.catalogo = 'demonstrativo';
      const aviso = document.createElement('div');
      aviso.className = 'container mensagem mensagem--alerta';
      aviso.setAttribute('role', 'status');
      aviso.textContent = 'Catálogo de apresentação: não foi possível consultar preços e estoque no servidor. Tente novamente antes de comprar.';
      document.querySelector('main')?.prepend(aviso);
      return false;
    } finally {
      progresso.remove();
    }
  })();
  return carregamento;
}
