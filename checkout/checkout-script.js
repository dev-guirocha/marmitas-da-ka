document.addEventListener('DOMContentLoaded', () => {
    // Esconder tela de carregamento
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
        }
    }, 1000);

    const container = document.getElementById('container');
    const goToDeliveryBtn = document.getElementById('goToDelivery');
    const goToCartBtn = document.getElementById('goToCart');
    const summaryContainer = document.getElementById('cart-summary');
    const totalPriceEl = document.getElementById('total-price');
    const deliveryForm = document.getElementById('delivery-form');
    const cepInput = document.getElementById('cep');

    let cart = {};

    function loadAndRenderCart() {
        const cartData = localStorage.getItem('marmitasCart');
        cart = cartData ? JSON.parse(cartData) : {};

        summaryContainer.innerHTML = '';

        if (!cart || !cart.packageName) {
            summaryContainer.innerHTML = '<p>Seu carrinho está vazio. Volte para a loja para escolher um pacote!</p>';
            totalPriceEl.innerText = 'R$ 0,00';
            goToDeliveryBtn.disabled = true;
            goToDeliveryBtn.style.opacity = '0.5';
            return;
        }

        goToDeliveryBtn.disabled = false;
        goToDeliveryBtn.style.opacity = '1';

        // --- Novo Bloco de Renderização ---
        const packageDiv = document.createElement('div');
        packageDiv.className = 'summary-package';

        packageDiv.innerHTML = `
            <div class="package-header">
                <span class="package-name">${cart.packageName}</span>
                <span class="package-price">R$ ${cart.packagePrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="meal-list"></div>
        `;

        const mealListContainer = packageDiv.querySelector('.meal-list');

        cart.items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'summary-item';
            itemDiv.innerHTML = `
                <span class="summary-item-name">${item.name}</span>
                <div class="quantity-selector">
                    <button class="btn-qty minus" data-index="${index}" aria-label="Remover um">-</button>
                    <span class="item-quantity">${item.quantity}</span>
                    <button class="btn-qty plus" data-index="${index}" aria-label="Adicionar um">+</button>
                </div>
            `;
            mealListContainer.appendChild(itemDiv);
        });

        summaryContainer.appendChild(packageDiv);
        // --- Fim do Novo Bloco ---

        totalPriceEl.innerText = `R$ ${cart.totalPrice.toFixed(2).replace('.', ',')}`;
        addQuantityEventListeners();
    }
    
    function addQuantityEventListeners() {
        document.querySelectorAll('.btn-qty').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const isPlus = e.target.classList.contains('plus');
                
                if (isPlus) {
                    // Lógica para Adicionar
                    if (cart.mealCredits > 0) {
                        cart.items[index].quantity++;
                        cart.mealCredits--;
                    } else {
                        showNotification('Você não tem mais créditos disponíveis!', 'error');
                        return;
                    }
                } else {
                    // Lógica para Remover
                    if (cart.items[index].quantity > 0) {
                        cart.items[index].quantity--;
                        cart.mealCredits++;

                        // Se a quantidade chegar a zero, remove o item da lista
                        if (cart.items[index].quantity === 0) {
                            cart.items.splice(index, 1);
                        }
                    }
                }
                
                localStorage.setItem('marmitasCart', JSON.stringify(cart));
                loadAndRenderCart();
            });
        });
    }

    goToDeliveryBtn.addEventListener('click', () => container.classList.add('right-panel-active'));
    goToCartBtn.addEventListener('click', () => container.classList.remove('right-panel-active'));

    // Formatação e busca de CEP
    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '').slice(0, 8);
        if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    });
    
    cepInput.addEventListener('blur', (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            document.getElementById('endereco').value = "Buscando...";
            document.getElementById('bairro').value = "Buscando...";
            setTimeout(() => { // Simulação de API
                document.getElementById('endereco').value = "Avenida Beira Mar";
                document.getElementById('bairro').value = "13 de Julho";
                showNotification('Endereço preenchido!', 'success');
            }, 1000);
        }
    });

    // Validação do formulário de entrega
    deliveryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const requiredFields = ['cep', 'endereco', 'numero', 'bairro', 'delivery-time-select'];
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'red';
                setTimeout(() => { input.style.borderColor = '#ccc'; }, 3000);
            }
        });
        
        if (!isValid) {
            showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        showNotification('Processando seu pedido...', 'success');
        
        setTimeout(() => {
            alert('Pedido finalizado com sucesso! Entraremos em contato para confirmar a entrega e o pagamento.');
            localStorage.removeItem('marmitasCart');
            window.location.href = '../login/dashboard/dashboard.html';
        }, 2000);
    });

    function showNotification(message, type) {
        document.querySelector('.notification')?.remove();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '15px 20px',
            borderRadius: '5px', color: 'white', zIndex: '10000', opacity: '0',
            transform: 'translateX(100%)', transition: 'all 0.3s ease'
        });
        
        const colors = { success: 'var(--primary-green)', error: '#e74c3c' };
        notification.style.backgroundColor = colors[type] || '#f39c12';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    loadAndRenderCart();
});