document.addEventListener('DOMContentLoaded', () => {
    const ordersContainer = document.getElementById('orders-container');
    const orders = JSON.parse(localStorage.getItem('marmitasOrders')) || [];

    if (orders.length === 0) {
        ordersContainer.innerHTML = '<p>Você ainda não fez nenhum pedido.</p>';
        return;
    }

    // Ordena os pedidos do mais recente para o mais antigo
    orders.reverse().forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';

        // Gera a lista de itens do pedido
        let itemsHtml = '<ul class="order-item-list">';
        order.cart.items.forEach(item => {
            itemsHtml += `
                <li class="order-item">
                    <span>${item.name}</span>
                    <span>x${item.quantity}</span>
                </li>
            `;
        });
        itemsHtml += '</ul>';

        orderCard.innerHTML = `
            <div class="order-header">
                <span>Pedido #${order.id}</span>
                <span>Data: ${order.date}</span>
            </div>
            <div class="order-body">
                <div class="order-package-name">${order.cart.packageName}</div>
                ${itemsHtml}
                <div class="order-total" style="text-align: right; font-weight: bold; margin-top: 15px;">
                    Total: R$ ${order.cart.totalPrice.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `;
        ordersContainer.appendChild(orderCard);
    });
});