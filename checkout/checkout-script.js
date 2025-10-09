document.addEventListener('DOMContentLoaded', () => {
  // ===== Config =====
  const PATH_DASHBOARD = '../login/dashboard/dashboard.html';

  // ===== Endereço (persistência) =====
  const ADDRESS_KEY = 'mdk_address_v1';
  const addressFields = {
    cep: document.getElementById('cep'),
    endereco: document.getElementById('endereco'),
    numero: document.getElementById('numero'),
    bairro: document.getElementById('bairro'),
    deliveryTime: document.getElementById('delivery-time-select')
  };

  function loadSavedAddress() {
    let raw = null;
    try { raw = localStorage.getItem(ADDRESS_KEY); } catch (_) {}
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.cep && addressFields.cep) addressFields.cep.value = data.cep;
      if (data.endereco && addressFields.endereco) addressFields.endereco.value = data.endereco;
      if (data.numero && addressFields.numero) addressFields.numero.value = data.numero;
      if (data.bairro && addressFields.bairro) addressFields.bairro.value = data.bairro;
      if (data.deliveryTime && addressFields.deliveryTime) addressFields.deliveryTime.value = data.deliveryTime;
    } catch (_) {}
  }

  function saveAddress() {
    const payload = {
      cep: addressFields.cep?.value || '',
      endereco: addressFields.endereco?.value || '',
      numero: addressFields.numero?.value || '',
      bairro: addressFields.bairro?.value || '',
      deliveryTime: addressFields.deliveryTime?.value || ''
    };
    try { localStorage.setItem(ADDRESS_KEY, JSON.stringify(payload)); } catch (_) {}
  }

  // chama no boot para autopreencher
  loadSavedAddress();

  // salve automaticamente sempre que o usuário mexer (uma única vez)
  Object.values(addressFields).forEach(el => {
    el?.addEventListener('change', saveAddress);
    el?.addEventListener('blur', saveAddress);
  });

  // ===== Utils =====
  const qs  = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const formatBRL = (n) => `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`;
  const safeParse = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
  const isCEP = (v) => /^\d{8}$/.test(v);

  // aria-live para leitores de tela
  let live = qs('#live-region');
  if (!live) {
    live = document.createElement('div');
    live.id = 'live-region';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.style.position = 'absolute';
    live.style.left = '-9999px';
    document.body.appendChild(live);
  }

  const showNotification = (message, type = 'success') => {
    qs('.notification')?.remove();
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;

    // Fallback inline (caso CSS não exista)
    Object.assign(n.style, {
      position: 'fixed', top: '20px', right: '20px', padding: '15px 20px',
      borderRadius: '5px', color: '#fff', zIndex: '10000', opacity: '0',
      transform: 'translateX(100%)', transition: 'all .3s ease',
      backgroundColor: type === 'success' ? 'var(--primary-green, #2ecc71)'
                      : type === 'error'   ? '#e74c3c'
                      :                       '#f39c12'
    });

    document.body.appendChild(n);
    live.textContent = message;

    requestAnimationFrame(() => {
      n.style.opacity = '1';
      n.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      n.style.opacity = '0';
      n.style.transform = 'translateX(100%)';
      setTimeout(() => n.remove(), 300);
    }, 3000);
  };

  // ===== Loading screen =====
  setTimeout(() => {
    const loadingScreen = qs('#loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
    }
  }, 1000);

  // ===== Elements =====
  const container         = qs('#container');
  const goToDeliveryBtn   = qs('#goToDelivery');
  const goToCartBtn       = qs('#goToCart');
  const summaryContainer  = qs('#cart-summary');
  const totalPriceEl      = qs('#total-price');
  const deliveryForm      = qs('#delivery-form');
  const cepInput          = qs('#cep');
  const enderecoInput     = qs('#endereco');
  const bairroInput       = qs('#bairro');
  const numeroInput       = qs('#numero');

  // ===== Carrinho =====
  let cart = {};
  const loadCart = () => {
    let data = null;
    try { data = localStorage.getItem('marmitasCart'); } catch {}
    const parsed = data ? safeParse(data, null) : null;

    // Normaliza estrutura
    cart = parsed && typeof parsed === 'object' ? parsed : {};
    cart.items = Array.isArray(cart.items) ? cart.items : [];
    cart.mealCredits = Number.isFinite(+cart.mealCredits) ? +cart.mealCredits : 0;
    cart.packagePrice = Number.isFinite(+cart.packagePrice) ? +cart.packagePrice : 0;
    cart.totalPrice = Number.isFinite(+cart.totalPrice) ? +cart.totalPrice
                    : (Number.isFinite(+cart.packagePrice) ? +cart.packagePrice : 0); // fallback seguro
  };

  const saveCart = () => {
    try { localStorage.setItem('marmitasCart', JSON.stringify(cart)); } catch {}
  };

  const renderCart = () => {
    if (!summaryContainer || !totalPriceEl) return;

    summaryContainer.innerHTML = '';

    if (!cart || !cart.packageName) {
      summaryContainer.innerHTML = '<p>Seu carrinho está vazio. Volte para a loja para escolher um pacote!</p>';
      totalPriceEl.innerText = formatBRL(0);
      if (goToDeliveryBtn) {
        goToDeliveryBtn.disabled = true;
        goToDeliveryBtn.style.opacity = '0.5';
      }
      return;
    }

    if (goToDeliveryBtn) {
      goToDeliveryBtn.disabled = false;
      goToDeliveryBtn.style.opacity = '1';
    }

    const packageDiv = document.createElement('div');
    packageDiv.className = 'summary-package';
    packageDiv.innerHTML = `
      <div class="package-header">
        <span class="package-name"></span>
        <span class="package-price"></span>
      </div>
      <div class="meal-list"></div>
    `;

    packageDiv.querySelector('.package-name').textContent = cart.packageName;
    packageDiv.querySelector('.package-price').textContent = formatBRL(cart.packagePrice);

    const mealListContainer = packageDiv.querySelector('.meal-list');

    if (cart.items.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhum prato selecionado ainda.';
      mealListContainer.appendChild(empty);
    } else {
      cart.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'summary-item';
        itemDiv.innerHTML = `
          <span class="summary-item-name"></span>
          <div class="quantity-selector">
            <button class="btn-qty minus" data-index="${index}" aria-label="Remover um">-</button>
            <span class="item-quantity">${Number(item.quantity || 0)}</span>
            <button class="btn-qty plus" data-index="${index}" aria-label="Adicionar um">+</button>
          </div>
        `;
        itemDiv.querySelector('.summary-item-name').textContent = item.name;
        mealListContainer.appendChild(itemDiv);
      });
    }

    summaryContainer.appendChild(packageDiv);
    totalPriceEl.innerText = formatBRL(cart.totalPrice);
  };

  // Delegação de eventos para +/-
  if (summaryContainer) {
    summaryContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-qty');
      if (!btn) return;

      const isPlus = btn.classList.contains('plus');
      const index = Number(btn.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= cart.items.length) return;

      const item = cart.items[index];

      if (isPlus) {
        if (cart.mealCredits <= 0) {
          showNotification('Você não tem mais créditos disponíveis!', 'error');
          return;
        }
        item.quantity = Number(item.quantity || 0) + 1;
        cart.mealCredits = Math.max(0, Number(cart.mealCredits) - 1);
      } else {
        const q = Number(item.quantity || 0);
        if (q > 0) {
          item.quantity = q - 1;
          cart.mealCredits = Number(cart.mealCredits) + 1;
          if (item.quantity === 0) {
            cart.items.splice(index, 1);
          }
        }
      }

      // totalPrice permanece o preço do pacote (itens são “Incluso”)
      saveCart();
      renderCart();
    });
  }

  // Navegação container
  goToDeliveryBtn?.addEventListener('click', () => container?.classList.add('right-panel-active'));
  goToCartBtn?.addEventListener('click', () => container?.classList.remove('right-panel-active'));

  // ===== CEP / ViaCEP =====
  const clearAddressForm = () => {
    if (enderecoInput) enderecoInput.value = '';
    if (bairroInput)   bairroInput.value   = '';
  };

  // Máscara do CEP
  cepInput?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
  });

  let cepController = null;

  cepInput?.addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (!isCEP(cep)) { clearAddressForm(); return; }

    if (enderecoInput) enderecoInput.value = 'Buscando...';
    if (bairroInput)   bairroInput.value   = 'Buscando...';

    // cancela requisição anterior
    if (cepController) cepController.abort();
    cepController = new AbortController();

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: cepController.signal });
      const data = await resp.json();

      if (!data || data.erro) {
        clearAddressForm();
        showNotification('CEP não encontrado. Por favor, verifique.', 'error');
        return;
      }

      if (enderecoInput) enderecoInput.value = data.logradouro || '';
      if (bairroInput)   bairroInput.value   = data.bairro || '';
      showNotification('Endereço preenchido!', 'success');
      numeroInput?.focus();
    } catch (err) {
      if (err.name === 'AbortError') return; // usuário digitou/outro blur
      clearAddressForm();
      showNotification('Não foi possível buscar o CEP. Tente novamente.', 'error');
      console.error('Erro ao buscar CEP:', err);
    } finally {
      cepController = null;
    }
  });

  // ===== Formulário de entrega =====
  deliveryForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const requiredFields = ['cep', 'endereco', 'numero', 'bairro', 'delivery-time-select'];
    let isValid = true;

    requiredFields.forEach((fieldId) => {
      const input = document.getElementById(fieldId);
      if (!input) return;
      input.style.borderColor = '#ccc'; // reset visual
      if (!String(input.value).trim()) {
        isValid = false;
        input.style.borderColor = 'red';
        setTimeout(() => { input.style.borderColor = '#ccc'; }, 3000);
      }
    });

    if (!isValid) {
      showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    // Extra: garante que exista um pacote (defensivo)
    if (!cart || !cart.packageName) {
      showNotification('Seu carrinho está vazio ou sem pacote selecionado.', 'error');
      return;
    }

    // --- NOVO: LÓGICA PARA GUARDAR O PEDIDO ---
    // Snapshot do carrinho para não sofrer mutações futuras
    const cartSnapshot = JSON.parse(JSON.stringify(cart));

    // Snapshot do endereço selecionado
    const orderAddress = {
      cep: document.getElementById('cep')?.value || '',
      endereco: document.getElementById('endereco')?.value || '',
      numero: document.getElementById('numero')?.value || '',
      bairro: document.getElementById('bairro')?.value || '',
      deliveryTime: document.getElementById('delivery-time-select')?.value || '',
    };

    // Objeto do pedido
    const now = new Date();
    const newOrder = {
      id: now.getTime(),                        // ID único
      createdAtISO: now.toISOString(),          // data em ISO
      createdAtDisplay: now.toLocaleString('pt-BR'), // exibição pt-BR
      status: 'pendente',                       // status inicial
      cart: {
        packageName: cartSnapshot.packageName,
        packagePrice: Number(cartSnapshot.packagePrice) || 0,
        totalPrice: Number(cartSnapshot.totalPrice) || 0,
        creditsPurchased: Number(cartSnapshot.packageCredits || 0),
        creditsRemaining: Number(cartSnapshot.mealCredits || 0),
        items: Array.isArray(cartSnapshot.items) ? cartSnapshot.items : [],
      },
      address: orderAddress,
    };

    // Persiste em marmitasOrders
    try {
      const raw = localStorage.getItem('marmitasOrders');
      const orders = raw ? JSON.parse(raw) : [];
      orders.push(newOrder);
      localStorage.setItem('marmitasOrders', JSON.stringify(orders));
    } catch (_) {
      // Se falhar, ainda assim seguimos com o fluxo
      console.warn('Não foi possível salvar o pedido em marmitasOrders.');
    }

    showNotification('Processando seu pedido...', 'success');

    setTimeout(() => {
      alert('Pedido finalizado com sucesso! Entraremos em contato para confirmar a entrega e o pagamento.');
      try { localStorage.removeItem('marmitasCart'); } catch {}
      saveAddress(); // garante persistência da última edição
      window.location.href = PATH_DASHBOARD;
    }, 2000);
  });

  // ===== Boot =====
  loadCart();
  renderCart();
});