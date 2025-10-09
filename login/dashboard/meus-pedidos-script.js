document.addEventListener('DOMContentLoaded', () => {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
  
    // Como a página está em login/dashboard/, use relativo simples:
    const PATH_DASHBOARD = './dashboard.html'; // ou '/login/dashboard/dashboard.html' absoluto
  
    // localStorage + JSON parse com proteção
    let orders = [];
    try {
      const raw = localStorage.getItem('marmitasOrders');
      orders = raw ? JSON.parse(raw) : [];
    } catch (_) {
      orders = [];
    }
  
    // --- Renderização dos cards ---
    ordersContainer.innerHTML = '';
    if (!Array.isArray(orders) || orders.length === 0) {
      ordersContainer.innerHTML = '<p>Você ainda não tem pedidos.</p>';
      return;
    }
  
    // Últimos primeiro (cópia para não mutar o array original)
    [...orders].reverse().forEach((order) => {
      const card = document.createElement('div');
      card.className = 'order-card';
      card.dataset.orderId = order.id; // necessário para "Repetir Pedido"
  
      const cart = order.cart || {};
      const items = Array.isArray(cart.items) ? cart.items : [];
  
      const createdDisplay =
        order.createdAtDisplay ||
        (order.createdAtISO ? new Date(order.createdAtISO).toLocaleString('pt-BR') : new Date(order.id).toLocaleString('pt-BR'));
  
      card.innerHTML = `
        <div class="order-header">
          <h3>Pedido #${order.id}</h3>
          <span>${createdDisplay}</span>
          <span class="order-status">${order.status || 'pendente'}</span>
        </div>
  
        <div class="order-body">
          <p><strong>Pacote:</strong> ${cart.packageName || '-'}</p>
          <p><strong>Total:</strong> R$ ${(Number(cart.totalPrice || 0)).toFixed(2).replace('.', ',')}</p>
          <div class="order-items">
            ${
              items.length
                ? items.map(it => `<div class="order-item"><span>${it.name}</span><span>x${it.quantity}</span></div>`).join('')
                : '<em>Nenhum item listado</em>'
            }
          </div>
        </div>
  
        <div class="order-actions" style="text-align: right; margin-top: 20px;">
          <button class="btn btn-secondary btn-repeat-order" aria-label="Repetir este pedido">Repetir Pedido</button>
        </div>
      `;
  
      ordersContainer.appendChild(card);
    });
  
    // --- Delegação de clique para "Repetir Pedido" ---
    ordersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-repeat-order');
      if (!btn) return;
  
      const card = btn.closest('.order-card');
      if (!card) return;
  
      const orderId = card.dataset.orderId;
      const orderToRepeat = orders.find((o) => String(o.id) === String(orderId));
      if (!orderToRepeat) {
        alert('Não foi possível localizar os dados deste pedido.');
        return;
      }
  
      const ok = confirm('Isto irá substituir o seu carrinho atual. Deseja continuar?');
      if (!ok) return;
  
      try {
        localStorage.setItem('marmitasCart', JSON.stringify(orderToRepeat.cart || {}));
        window.location.href = PATH_DASHBOARD; // ou para o checkout, se preferir
      } catch (err) {
        console.error(err);
        alert('Ocorreu um erro ao tentar repetir o pedido.');
      }
    });
  });