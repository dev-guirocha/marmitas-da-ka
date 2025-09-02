document.addEventListener('DOMContentLoaded', function() {
    // Esconder tela de carregamento
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1000);

    // Menu hamburger para mobile
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });
        
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    let cart = {
        packageName: null,
        packagePrice: 0.00,
        mealCredits: 0,
        items: [], // Formato dos itens: { name: 'Nome do Prato', quantity: 2 }
        totalPrice: 0.00
    };

    const userInfoDiv = document.querySelector('.user-info');
    const cartInfoDiv = document.querySelector('.cart-info');
    const cartCountSpan = document.getElementById('cart-count');
    const cartTotalSpan = document.getElementById('cart-total');
    const floatingCartCount = document.getElementById('floatingCartCount');
    const creditsInfo = document.getElementById('creditsInfo');
    const creditsCount = document.getElementById('credits-count');
    const cartStatus = document.getElementById('cartStatus');
    const floatingCart = document.querySelector('.floating-cart');
    const cartPreview = document.querySelector('.cart-preview');
    const orderItemsContainer = document.getElementById('order-items');
    const menuItems = document.querySelectorAll('.menu-item');

    function updateCartDisplay() {
        if (cart.packagePrice > 0) {
            userInfoDiv.classList.add('hidden');
            cartInfoDiv.classList.remove('hidden');
            cartCountSpan.innerHTML = `<i class="fas fa-utensils"></i> ${cart.mealCredits}`;
            cartTotalSpan.innerText = `R$ ${cart.totalPrice.toFixed(2).replace('.', ',')}`;
            floatingCartCount.textContent = cart.items.reduce((total, item) => total + item.quantity, 0);
            creditsCount.textContent = cart.mealCredits;
            creditsInfo.classList.remove('hidden');
            cartStatus.classList.add('hidden');
            
            const orderSummary = document.getElementById('order-summary');
            if (cart.items.length > 0) {
                orderSummary.classList.remove('hidden');
                updateOrderSummary();
            } else {
                orderSummary.classList.add('hidden');
            }
        } else {
            creditsInfo.classList.add('hidden');
            cartStatus.classList.remove('hidden');
        }
        
        updateMenuItemQuantities();
        updateCartPreview();
        localStorage.setItem('marmitasCart', JSON.stringify(cart));
    }

    function updateMenuItemQuantities() {
        menuItems.forEach(menuItem => {
            const name = menuItem.dataset.name;
            const quantitySpan = menuItem.querySelector('.quantity');
            
            const itemInCart = cart.items.find(item => item.name === name);
            
            if (itemInCart) {
                quantitySpan.textContent = itemInCart.quantity;
            } else {
                quantitySpan.textContent = '0';
            }
        });
    }

    function updateCartPreview() {
        const previewItems = document.getElementById('cart-preview-items');
        const previewTotal = document.getElementById('cart-preview-total');
        
        previewItems.innerHTML = '';
        
        if (cart.items.length === 0) {
            previewItems.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
        } else {
            cart.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'preview-item';
                itemElement.innerHTML = `
                    <span>${item.name} (x${item.quantity})</span>
                    <span>Incluso</span>
                `;
                previewItems.appendChild(itemElement);
            });
        }
        
        previewTotal.textContent = `R$ ${cart.totalPrice.toFixed(2).replace('.', ',')}`;
    }

    function updateOrderSummary() {
        const orderTotal = document.getElementById('order-total-price');
        orderItemsContainer.innerHTML = '';
        
        const packageItem = document.createElement('div');
        packageItem.className = 'order-item';
        packageItem.innerHTML = `
            <span>${cart.packageName}</span>
            <span>R$ ${cart.packagePrice.toFixed(2).replace('.', ',')}</span>
        `;
        orderItemsContainer.appendChild(packageItem);
        
        cart.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = `
                <span>${item.name} (x${item.quantity})</span>
                <div class="order-item-actions">
                    <span>Incluso</span>
                    <button class="remove-order-item" data-index="${index}" title="Remover Item">&times;</button>
                </div>
            `;
            orderItemsContainer.appendChild(itemElement);
        });
        
        orderTotal.textContent = `R$ ${cart.totalPrice.toFixed(2).replace('.', ',')}`;
    }

    const packageButtons = document.querySelectorAll('.add-package-to-cart');
    packageButtons.forEach(button => {
        button.addEventListener('click', () => {
            cart = { packageName: null, packagePrice: 0.00, mealCredits: 0, items: [], totalPrice: 0.00 };
            const price = parseFloat(button.dataset.price);
            const name = button.dataset.name;
            const credits = parseInt(button.dataset.credits);

            cart.packageName = name;
            cart.packagePrice = price;
            cart.totalPrice = price;
            cart.mealCredits = credits;
            
            updateCartDisplay();
            showNotification(`"${name}" selecionado! Você tem ${credits} créditos.`, 'success');
            document.querySelector('#cardapio').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Lógica para adicionar e remover itens
    menuItems.forEach(item => {
        const name = item.dataset.name;
        const plusBtn = item.querySelector('.plus');
        const minusBtn = item.querySelector('.minus');

        plusBtn.addEventListener('click', () => {
            if (!cart.packageName) {
                showNotification("Por favor, selecione um pacote para começar.", 'error');
                document.querySelector('#pacotes').scrollIntoView({ behavior: 'smooth' });
                return;
            }

            if (cart.mealCredits <= 0) {
                showNotification("Você não tem créditos suficientes!", 'error');
                return;
            }

            cart.mealCredits--;
            const existingItem = cart.items.find(cartItem => cartItem.name === name);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.items.push({ name: name, quantity: 1 });
            }

            updateCartDisplay();
        });

        minusBtn.addEventListener('click', () => {
            const existingItem = cart.items.find(cartItem => cartItem.name === name);

            if (existingItem && existingItem.quantity > 0) {
                cart.mealCredits++;
                existingItem.quantity--;

                if (existingItem.quantity === 0) {
                    cart.items = cart.items.filter(cartItem => cartItem.name !== name);
                }

                updateCartDisplay();
            }
        });
    });

    const slider = document.querySelector('.menu-slider');
    const prevBtn = document.querySelector('.slider-arrow.prev');
    const nextBtn = document.querySelector('.slider-arrow.next');
    const dots = document.querySelectorAll('.dot');

    if (slider) {
        nextBtn.addEventListener('click', () => slider.scrollBy({ left: slider.querySelector('.menu-item').offsetWidth + 20, behavior: 'smooth' }));
        prevBtn.addEventListener('click', () => slider.scrollBy({ left: -(slider.querySelector('.menu-item').offsetWidth + 20), behavior: 'smooth' }));
        dots.forEach(dot => dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            const itemWidth = slider.querySelector('.menu-item').offsetWidth;
            slider.scrollTo({ left: index * (itemWidth + 20), behavior: 'smooth' });
        }));
        slider.addEventListener('scroll', updateDots);
    }
    
    function updateDots() {
        if (!slider) return;
        const itemWidth = slider.querySelector('.menu-item').offsetWidth;
        const activeIndex = Math.round(slider.scrollLeft / (itemWidth + 20));
        dots.forEach((dot, index) => dot.classList.toggle('active', index === activeIndex));
    }

    function handleRemoveItem(itemIndex) {
        const itemToRemove = cart.items[itemIndex];
        cart.mealCredits += itemToRemove.quantity;
        cart.items.splice(itemIndex, 1);
        updateCartDisplay();
        showNotification(`"${itemToRemove.name}" removido do pedido.`, 'success');
    }

    if (orderItemsContainer) {
        orderItemsContainer.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('remove-order-item')) {
                handleRemoveItem(parseInt(e.target.dataset.index));
            }
        });
    }

    if (floatingCart) {
        floatingCart.addEventListener('click', (e) => {
            if (e.target.closest('.cart-icon')) cartPreview.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!floatingCart.contains(e.target) && !cartPreview.classList.contains('hidden')) {
                cartPreview.classList.add('hidden');
            }
        });
    }

    document.querySelectorAll('.wip').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification("Página em construção!", 'info');
        });
    });

    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.pacote-card, .menu-item');
        elements.forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight / 1.3) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    };

    document.querySelectorAll('.pacote-card, .menu-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);

    function showNotification(message, type) {
        document.querySelector('.notification')?.remove();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px',
            padding: '15px 20px', borderRadius: '5px', color: 'white',
            zIndex: '10000', opacity: '0', transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });
        
        const colors = { success: 'var(--primary-green)', error: '#e74c3c', info: '#3498db' };
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

    const savedCart = localStorage.getItem('marmitasCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
});