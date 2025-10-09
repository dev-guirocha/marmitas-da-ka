document.addEventListener('DOMContentLoaded', function () {
    // --- VERIFICAÇÃO DE LOGIN (sem alterações de comportamento) ---
    let loggedInUser = null;
    try {
      loggedInUser = localStorage.getItem('loggedInUser');
    } catch (_) {}
  
    const userInfoSpan = document.getElementById('user-info-name');
    if (!loggedInUser) {
      alert('Você precisa estar logado para acessar esta página.');
      window.location.href = '../../login/login.html';
      return;
    } else {
      if (userInfoSpan) userInfoSpan.textContent = `Olá, ${loggedInUser}`;
    }
  
    // Esconder tela de carregamento (sem alterações)
    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }
    }, 1000);
  
    // Menu hamburger (mantido)
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', function () {
        this.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
      });
      navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          navLinks.classList.remove('active');
          document.body.style.overflow = '';
        });
      });
    }

    // --- Estado do carrinho ---
    let cart = {
      packageName: null,
      packagePrice: 0,
      totalPrice: 0,
      mealCredits: 0,
      packageCredits: 0,
      items: [],
    };
  
    const userInfoDiv = document.querySelector('.user-info');
    const cartInfoDiv = document.querySelector('.cart-info');
    const cartCountSpan = document.getElementById('cart-count');
    const cartTotalSpan = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const creditsBadge = document.getElementById('credits-badge');


    clearCartBtn?.addEventListener('click', () => {
        const hasPackage = !!cart.packageName;
        const hasItems = !!(cart.items && cart.items.length);
        if (!hasPackage && !hasItems) return;
      
        // Escolha do usuário:
        // 1 = itens, 2 = pacote, 3 = tudo
        let mode = '3';
        if (hasPackage && hasItems) {
          const ans = prompt(
            'O que deseja limpar?\n1 - Apenas itens selecionados\n2 - Apenas o pacote\n3 - Tudo',
            '3'
          );
          if (!ans) return;
          mode = ans.trim();
        } else if (hasItems) {
          mode = '1';
        } else if (hasPackage) {
          mode = '2';
        }
      
        if (mode === '1') {
          // Limpar apenas os itens: restaura créditos do pacote
          cart.items = [];
          cart.mealCredits = Number(cart.packageCredits || 0);
          showNotification('Itens removidos. Créditos restaurados.', 'success');
        } else if (mode === '2') {
          // Remover apenas o pacote: zera tudo que depende dele
          cart.packageName = null;
          cart.packagePrice = 0;
          cart.totalPrice = 0;
          cart.mealCredits = 0;
          cart.packageCredits = 0;
          cart.items = []; // não faz sentido manter itens sem pacote
          showNotification('Pacote removido.', 'success');
        } else if (mode === '3') {
          // Limpar tudo
          cart = {
            packageName: null,
            packagePrice: 0,
            totalPrice: 0,
            mealCredits: 0,
            packageCredits: 0,
            items: [],
          };
          showNotification('Carrinho esvaziado.', 'success');
        } else {
          return; // entrada inválida: não faz nada
        }
      
        // Persistência
        try {
          if (!cart.packageName) {
            localStorage.removeItem('marmitasCart');
          } else {
            localStorage.setItem('marmitasCart', JSON.stringify(cart));
          }
        } catch (_) {}
      
        updateCartDisplay();
      });

    // Alterado: usamos o container pai opcionalmente, com guarda
    const floatingCart = document.getElementById('floatingCart');
    const floatingCartIcon = floatingCart?.querySelector('.cart-icon');
    const floatingCartCount = document.getElementById('floatingCartCount');
  
    const creditsInfo = document.getElementById('creditsInfo');
    const creditsCount = document.getElementById('credits-count');
    const cartStatus = document.getElementById('cartStatus');
    const cartPreview = document.querySelector('.cart-preview');
    const orderItemsContainer = document.getElementById('order-items');
    const menuItems = document.querySelectorAll('.menu-item');
  
    // --- FUNÇÃO ATUALIZADA: triggerCartAnimation ---
    function triggerCartAnimation() {
      if (!floatingCartIcon) return;
      // reseta caso já esteja animando
      floatingCartIcon.classList.remove('shake');
      // reflow para garantir reinício da animação
      // eslint-disable-next-line no-unused-expressions
      void floatingCartIcon.offsetWidth;
      floatingCartIcon.classList.add('shake');
      setTimeout(() => {
        floatingCartIcon.classList.remove('shake');
      }, 500); // duração da animação no CSS
    }
  
    function updateCreditsBadge(){
        if (!creditsBadge) return;
        creditsBadge.textContent = `Créditos: ${cart.mealCredits}`;
      }

    function updateMenuItemQuantities() {
      menuItems.forEach((menuItem) => {
        const name = menuItem.dataset.name;
        const quantitySpan = menuItem.querySelector('.quantity');
        const itemInCart = cart.items.find((i) => i.name === name);
        if (quantitySpan) {
          quantitySpan.textContent = itemInCart ? String(itemInCart.quantity) : '0';
        }
      });
    }
  
    function updateCartPreview() {
      const previewItems = document.getElementById('cart-preview-items');
      const previewTotal = document.getElementById('cart-preview-total');
      if (!previewItems || !previewTotal) return;
  
      previewItems.innerHTML = '';
  
      if (!cart.items.length) {
        previewItems.innerHTML = '<p class="empty-cart">Carrinho vazio</p>';
      } else {
        cart.items.forEach((item) => {
          const el = document.createElement('div');
          el.className = 'preview-item';
          el.innerHTML = `
            <span>${item.name} (x${item.quantity})</span>
            <span>Incluso</span>
          `;
          previewItems.appendChild(el);
        });
      }
  
      previewTotal.textContent = `R$ ${Number(cart.totalPrice || 0).toFixed(2).replace('.', ',')}`;
    }
  
    function updateOrderSummary() {
      const orderTotal = document.getElementById('order-total-price');
      const orderSummary = document.getElementById('order-summary');
      if (!orderItemsContainer || !orderTotal || !orderSummary) return;
  
      orderItemsContainer.innerHTML = '';
  
      const packageItem = document.createElement('div');
      packageItem.className = 'order-item';
      packageItem.innerHTML = `
        <span>${cart.packageName}</span>
        <span>R$ ${Number(cart.packagePrice).toFixed(2).replace('.', ',')}</span>
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
  
      orderTotal.textContent = `R$ ${Number(cart.totalPrice).toFixed(2).replace('.', ',')}`;
    }
  
    function updateCartDisplay() {
      if (Number(cart.packagePrice) > 0) {
        userInfoDiv?.classList.add('hidden');
        cartInfoDiv?.classList.remove('hidden');
  
        if (cartCountSpan) cartCountSpan.innerHTML = `<i class="fas fa-utensils"></i> ${cart.mealCredits}`;
        if (cartTotalSpan) cartTotalSpan.innerText = `R$ ${Number(cart.totalPrice).toFixed(2).replace('.', ',')}`;
        if (floatingCartCount) {
          const count = cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
          floatingCartCount.textContent = String(count);
        }
        if (creditsCount) creditsCount.textContent = String(cart.mealCredits);
        updateCreditsBadge();

        creditsInfo?.classList.remove('hidden');
        cartStatus?.classList.add('hidden');
  
        const orderSummary = document.getElementById('order-summary');
        if (orderSummary) {
          if (cart.items.length > 0) {
            orderSummary.classList.remove('hidden');
            updateOrderSummary();
          } else {
            orderSummary.classList.add('hidden');
          }
        }
    } else {
        // Sem pacote: volta para a UI inicial
        userInfoDiv?.classList.remove('hidden');
        cartInfoDiv?.classList.add('hidden');
      
        if (cartCountSpan) cartCountSpan.innerHTML = `<i class="fas fa-utensils"></i> 0`;
        if (cartTotalSpan) cartTotalSpan.innerText = `R$ 0,00`;
        if (creditsCount) creditsCount.textContent = '0';
        updateCreditsBadge?.();
      
        creditsInfo?.classList.add('hidden');
        cartStatus?.classList.remove('hidden');
        document.getElementById('order-summary')?.classList.add('hidden');
      }
  
      updateMenuItemQuantities();
      updateCartPreview();
      try {
        localStorage.setItem('marmitasCart', JSON.stringify(cart));
      } catch (_) {}
    }
  
    // --- LÓGICA ATUALIZADA: Botões de Pacote ---
    const packageButtons = document.querySelectorAll('.add-package-to-cart');
    packageButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const price = parseFloat(button.dataset.price);
        const name = button.dataset.name;
        const credits = parseInt(button.dataset.credits, 10);
  
        // sanity checks
        const validPrice = Number.isFinite(price) ? price : 0;
        const validCredits = Number.isFinite(credits) ? credits : 0;
  
        if (cart.packageName && cart.packageName !== name) {
          const userConfirmed = confirm(
            'Você já tem um pacote no carrinho. Deseja substituí-lo? Todo o seu progresso no pacote atual será perdido.'
          );
          if (!userConfirmed) return;
        }
  
        cart = {
          packageName: name || null,
          packagePrice: validPrice,
          totalPrice: validPrice,
          mealCredits: validCredits,
          packageCredits: validCredits,
          items: [],
        };
  
        updateCartDisplay();
        showNotification(`"${name}" selecionado! Você tem ${validCredits} créditos.`, 'success');
        document.querySelector('#cardapio')?.scrollIntoView({ behavior: 'smooth' });
        triggerCartAnimation(); // feedback também ao selecionar pacote
      });
    });
  
    // --- NOVO: LÓGICA PARA ADICIONAR PACOTE PRÉ-SELECIONADO ---
    (function applyPreselectedPackage() {
      const raw = localStorage.getItem('selectedPackage');
      const key = (raw || '').toLowerCase().trim();
      if (!key) return;

      // não sobrescreve carrinho existente
      if (cart && cart.packageName) {
        localStorage.removeItem('selectedPackage');
        return;
      }

      // tenta casar por data-name contendo "Semanal", "Quinzenal" ou "Mensal"
      const label = key.charAt(0).toUpperCase() + key.slice(1); // semanal -> Semanal
      let btn = document.querySelector(`.add-package-to-cart[data-name*="${label}"]`);

      // fallback: varre todos os botões e compara nome/texto de forma case-insensitive
      if (!btn) {
        const buttons = document.querySelectorAll('.add-package-to-cart');
        btn = Array.from(buttons).find(b => {
          const n = ((b.dataset.name || b.textContent || '') + '').toLowerCase();
          return n.includes(key);
        });
      }

      if (btn) {
        btn.click(); // reaproveita a mesma lógica já existente
        localStorage.removeItem('selectedPackage'); // evita re-aplicar no próximo load
      } else {
        // opcional: limpar a chave se não achar nada
        localStorage.removeItem('selectedPackage');
        console.warn('selectedPackage informado, mas nenhum botão correspondente foi encontrado:', key);
      }
    })();

    // --- LÓGICA ATUALIZADA: Adicionar e remover itens ---
    menuItems.forEach((item) => {
      const name = item.dataset.name;
      const plusBtn = item.querySelector('.plus');
      const minusBtn = item.querySelector('.minus');
  
      plusBtn?.addEventListener('click', () => {
        if (!cart.packageName) {
          showNotification('Por favor, selecione um pacote para começar.', 'error');
          document.querySelector('#pacotes')?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
  
        if (cart.mealCredits <= 0) {
          showNotification('Você não tem créditos suficientes!', 'error');
          return;
        }
  
        cart.mealCredits = Math.max(0, Number(cart.mealCredits) - 1);
        const existingItem = cart.items.find((cartItem) => cartItem.name === name);
  
        if (existingItem) {
          existingItem.quantity = Number(existingItem.quantity || 0) + 1;
        } else {
          cart.items.push({ name, quantity: 1 });
        }
  
        updateCartDisplay();
        triggerCartAnimation();
      });
  
      minusBtn?.addEventListener('click', () => {
        const existingItem = cart.items.find((cartItem) => cartItem.name === name);
        if (existingItem && Number(existingItem.quantity) > 0) {
          existingItem.quantity = Number(existingItem.quantity) - 1;
          cart.mealCredits = Number(cart.mealCredits) + 1;
  
          if (existingItem.quantity === 0) {
            cart.items = cart.items.filter((cartItem) => cartItem.name !== name);
          }
  
          updateCartDisplay();
        }
      });
    });
  
    // Carrega o carrinho salvo ao iniciar
    let savedCart = null;
    try {
      savedCart = localStorage.getItem('marmitasCart');
    } catch (_) {}
  
    if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
      
          cart = {
            packageName: parsed?.packageName ?? null,
            packagePrice: Number.isFinite(+parsed?.packagePrice) ? +parsed.packagePrice : 0,
            totalPrice: Number.isFinite(+parsed?.totalPrice)
              ? +parsed.totalPrice
              : (Number.isFinite(+parsed?.packagePrice) ? +parsed.packagePrice : 0),
            mealCredits: Number.isFinite(+parsed?.mealCredits) ? +parsed.mealCredits : 0,
            packageCredits: Number.isFinite(+parsed?.packageCredits) ? +parsed.packageCredits : undefined, // 👈 tenta recuperar
            items: Array.isArray(parsed?.items) ? parsed.items : [],
          };
      
          // 👇 Só infere se não existir e houver pacote
          if (!Number.isFinite(cart.packageCredits) && cart.packageName) {
            const sumQty = cart.items.reduce((acc, it) => acc + Number(it?.quantity || 0), 0);
            cart.packageCredits = Number(cart.mealCredits || 0) + sumQty;
          }
      
          // (opcional) evita valores negativos
          cart.mealCredits = Math.max(0, cart.mealCredits);
          cart.packageCredits = Math.max(0, Number(cart.packageCredits || 0));
        } catch (_) {
          try { localStorage.removeItem('marmitasCart'); } catch (_) {}
        }
      
        updateCartDisplay();
      }
  
    // (demais blocos: slider, dots, etc. podem permanecer os mesmos)
    // Se o seu slider usa clique no .cart-icon para abrir/fechar o preview, mantenha:
    if (floatingCart) {
      floatingCart.addEventListener('click', (e) => {
        if (e.target.closest('.cart-icon')) cartPreview?.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!floatingCart.contains(e.target) && !cartPreview?.classList.contains('hidden')) {
          cartPreview?.classList.add('hidden');
        }
      });
    }
  
    // Notificações (mantida sua implementação original)
    function showNotification(message, type) {
      document.querySelector('.notification')?.remove();
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
  
      Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '5px',
        color: 'white',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease',
      });
  
      const colors = { success: 'var(--primary-green)', error: '#e74c3c', info: '#f39c12' };
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
  });