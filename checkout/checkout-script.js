document.addEventListener('DOMContentLoaded', async () => {
  // ===== Config =====
  const PATH_DASHBOARD = '../login/dashboard/dashboard.html';
  const PATH_LOGIN = '../login/login.html';
  const WHATSAPP_NUMBER = '5579991428025';
  const PAYMENT_LABELS = { pix: 'PIX', cash: 'Dinheiro' };
  const DELIVERY_LABELS = {
    manha: 'Manhã (08h às 12h)',
    tarde: 'Tarde (13h às 18h)',
    noite: 'Noite (18h às 22h)',
  };

  let currentUser = null;
  let customerProfile = {};
  let userProfileLoaded = false;
  let authReadyResolved = false;
  let resolveAuthReady = () => {};
  const authReady = new Promise((resolve) => {
    resolveAuthReady = (value) => {
      if (!authReadyResolved) {
        authReadyResolved = true;
        resolve(value);
      }
    };
  });

  const waitForAuth = (timeoutMs = 3000) => Promise.race([ // Aumentei o timeout para 3s
    authReady.then(() => 'resolved'),
    new Promise((resolve) => setTimeout(() => resolve('timeout'), timeoutMs)),
  ]);

  // ===== Navegação e scroll suave =====
  const initNavigation = () => {
    const navLinks = document.getElementById('navLinks');
    const hamburger = document.getElementById('hamburger');
    if (!navLinks || !hamburger) return;

    const updateNavState = () => {
      const isActive = hamburger.classList.contains('active');
      const isMobile = window.matchMedia('(max-width: 992px)').matches;
      navLinks.setAttribute('aria-hidden', String(isMobile ? !isActive : false));
      hamburger.setAttribute('aria-expanded', String(isActive));
      document.body.style.overflow = isActive && isMobile ? 'hidden' : '';
    };

    const closeNav = () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      updateNavState();
    };

    hamburger.addEventListener('click', () => {
      const toggled = hamburger.classList.toggle('active');
      navLinks.classList.toggle('active', toggled);
      updateNavState();
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeNav);
    });

    window.addEventListener('resize', updateNavState);
    updateNavState();
  };

  const enableSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || targetId.length <= 1) return;
        const targetEl = document.querySelector(targetId);
        if (!targetEl) return;

        event.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  initNavigation();
  enableSmoothScroll();

  // ===== Endereço (persistência) - ATUALIZADO =====
  const ADDRESS_KEY = 'mdk_address_v1';
  const addressFields = {
    cep: document.getElementById('cep'),
    endereco: document.getElementById('endereco'),
    numero: document.getElementById('numero'),
    bairro: document.getElementById('bairro'),
    complemento: document.getElementById('complemento'),
    deliveryTime: document.getElementById('delivery-time-select'),
    saveAddressCheck: document.getElementById('save-address'),
  };

  function loadSavedAddress() {
    let raw = null;
    try { raw = localStorage.getItem(ADDRESS_KEY); } catch (_) {}
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.savePreference) {
        if (data.cep && addressFields.cep) addressFields.cep.value = data.cep;
        if (data.endereco && addressFields.endereco) addressFields.endereco.value = data.endereco;
        if (data.numero && addressFields.numero) addressFields.numero.value = data.numero;
        if (data.bairro && addressFields.bairro) addressFields.bairro.value = data.bairro;
        if (data.complemento && addressFields.complemento) addressFields.complemento.value = data.complemento;
        if (data.deliveryTime && addressFields.deliveryTime) addressFields.deliveryTime.value = data.deliveryTime;
        if (addressFields.saveAddressCheck) addressFields.saveAddressCheck.checked = true;
      }
    } catch (_) {}
  }

  function saveAddress() {
    if (!addressFields.saveAddressCheck?.checked) {
        try { localStorage.removeItem(ADDRESS_KEY); } catch (_) {}
        return;
    }

    const payload = {
      cep: addressFields.cep?.value || '',
      endereco: addressFields.endereco?.value || '',
      numero: addressFields.numero?.value || '',
      bairro: addressFields.bairro?.value || '',
      complemento: addressFields.complemento?.value || '',
      deliveryTime: addressFields.deliveryTime?.value || '',
      savePreference: addressFields.saveAddressCheck?.checked || false
    };
    try { localStorage.setItem(ADDRESS_KEY, JSON.stringify(payload)); } catch (_) {}
  }

  // Não chama mais loadSavedAddress() aqui, será chamado no boot
  
  Object.values(addressFields).forEach(el => {
    el?.addEventListener('change', saveAddress);
  });

  // ===== Utils =====
  const qs  = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const formatBRL = (n) => `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`;
  const safeParse = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
  const isCEP = (v) => /^\d{8}$/.test(v);
  const setButtonLoading = (button, isLoading, loadingText) => {
    if (!button) return;
    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      if (loadingText) {
        button.textContent = loadingText;
      }
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  };

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
  // Removido o setTimeout(..., 1000) daqui
  // O loading será controlado pela função de boot no final do arquivo
  const loadingScreen = qs('#loadingScreen');
  const hideLoadingScreen = () => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => { loadingScreen.style.display = 'none'; }, 500);
    }
  };

  // ===== Elements =====
  const container         = qs('#container');
  const summaryContainer  = qs('#cart-summary');
  const totalPriceEl      = qs('#total-price');
  const deliveryForm      = qs('#delivery-form');
  const cepInput          = qs('#cep');
  const enderecoInput     = qs('#endereco');
  const bairroInput       = qs('#bairro');
  const numeroInput       = qs('#numero');
  const complementoInput  = qs('#complemento');
  const deliverySelect    = qs('#delivery-time-select');
  const paymentInputs     = qsa('input[name="payment"]');
  const deliveryFormContainer = qs('.delivery-container'); // ✅ NOVO: Para o scroll
  const finishOrderBtn    = qs('.btn-finish-order');
  const spinner           = qs('#cep-spinner'); // ✅ NOVO: Definido aqui

  const fieldErrorEls = {
    cep: qs('#error-cep'),
    endereco: qs('#error-endereco'),
    numero: qs('#error-numero'),
    bairro: qs('#error-bairro'),
    complemento: qs('#error-complemento'),
    delivery: qs('#error-delivery'),
  };

  const fieldInputs = {
    cep: cepInput,
    endereco: enderecoInput,
    numero: numeroInput,
    bairro: bairroInput,
    complemento: complementoInput,
    delivery: deliverySelect,
  };
  
  // ===== LÓGICA DE SCROLL AUTOMÁTICO (MOBILE) =====
  paymentInputs.forEach((input) => {
    input.addEventListener('change', () => {
        if (!input.checked) return;

        // Apenas scroll suave no mobile
        if (window.innerWidth <= 768 && deliveryFormContainer) {
            deliveryFormContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
  });

  const setFieldError = (fieldKey, message) => {
    const inputEl = fieldInputs[fieldKey];
    const errorEl = fieldErrorEls[fieldKey];
    if (!inputEl || !errorEl) return;
    if (message) {
      errorEl.textContent = message;
      inputEl.setAttribute('aria-invalid', 'true');
      inputEl.classList.add('has-error');
    } else {
      errorEl.textContent = '';
      inputEl.removeAttribute('aria-invalid');
      inputEl.classList.remove('has-error');
    }
  };

  Object.entries(fieldInputs).forEach(([key, inputEl]) => {
    if (!inputEl) return;
    const eventName = key === 'delivery' ? 'change' : 'input';
    inputEl.addEventListener(eventName, () => setFieldError(key, ''));
  });

  const getSelectedPaymentMethod = () => {
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected?.value || 'pix';
  };

  const getDeliverySlotLabel = (slot) => DELIVERY_LABELS[slot] || 'A combinar';

  const getNextMondayDate = () => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const day = base.getDay(); // 0=domingo, 1=segunda
    let offset = (8 - day) % 7; // próxima segunda
    if (offset === 0) offset = 7;
    base.setDate(base.getDate() + offset);
    return base.toLocaleDateString('pt-BR');
  };

  // ===== Sessão / Perfil =====
  const ensureAuthSession = () => {
    if (typeof auth === 'undefined' || !auth?.onAuthStateChanged) {
      console.warn("Firebase Auth não está definida. Operando em modo offline.");
      userProfileLoaded = true;
      resolveAuthReady(null); // Resolve como nulo (offline)
      return;
    }

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        showNotification('Sua sessão expirou. Faça login novamente.', 'error');
        resolveAuthReady(null);
        setTimeout(() => { window.location.href = PATH_LOGIN; }, 1800);
        return;
      }

      currentUser = user;
      const baseProfile = {
        uid: user.uid,
        email: user.email || '',
        phone: user.phoneNumber || '',
        name: user.displayName || '',
      };

      customerProfile = { ...baseProfile };
      userProfileLoaded = true;
      
      // Tenta buscar perfil do Firestore, mas resolve o auth antes
      if (typeof db !== 'undefined' && db?.collection) {
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            const data = doc.data() || {};
            customerProfile = {
              ...baseProfile,
              ...data,
              email: data.email || baseProfile.email,
              phone: data.phone || baseProfile.phone,
              name: data.name || baseProfile.name,
            };
          }
        } catch (err) {
          console.warn('Não foi possível carregar os dados do utilizador:', err);
        }
      }
      
      // Resolve a promise de auth SÓ DEPOIS de ter o perfil básico
      resolveAuthReady(user); 
    });
  };

  // ===== Carrinho =====
  let cart = {};
  const loadCart = () => {
    let data = null;
    try { data = localStorage.getItem('marmitasCart'); } catch {}
    const parsed = data ? safeParse(data, null) : null;

    cart = parsed && typeof parsed === 'object' ? parsed : {};
    cart.items = Array.isArray(cart.items) ? cart.items : [];
    cart.mealCredits = Number.isFinite(+cart.mealCredits) ? +cart.mealCredits : 0;
    cart.packagePrice = Number.isFinite(+cart.packagePrice) ? +cart.packagePrice : 0;
    cart.totalPrice = Number.isFinite(+cart.totalPrice) ? +cart.totalPrice
                    : (Number.isFinite(+cart.packagePrice) ? +cart.packagePrice : 0);
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

      return;
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
      saveCart();
      renderCart();
    });
  }



  // ===== CEP / ViaCEP =====
  const clearAddressForm = () => {
    if (enderecoInput) enderecoInput.value = '';
    if (bairroInput)   bairroInput.value   = '';
    setFieldError('endereco', '');
    setFieldError('bairro', '');
  };

  cepInput?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    e.target.value = value;
  });

  let cepController = null;

  cepInput?.addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (!isCEP(cep)) { 
      clearAddressForm(); 
      setFieldError('cep', 'Digite um CEP válido com 8 dígitos.');
      spinner?.classList.add('hidden'); 
      return; 
    }

    setFieldError('cep', '');
    if (enderecoInput) enderecoInput.value = 'Buscando...';
    if (bairroInput)   bairroInput.value   = 'Buscando...';

    if (cepController) cepController.abort();
    cepController = new AbortController();

    spinner?.classList.remove('hidden');

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: cepController.signal });
      const data = await resp.json();

      if (!data || data.erro) {
        clearAddressForm();
        showNotification('CEP não encontrado. Por favor, verifique.', 'error');
        setFieldError('cep', 'Não encontramos o CEP informado.');
        return;
      }

      if (enderecoInput) enderecoInput.value = data.logradouro || '';
      if (bairroInput)   bairroInput.value   = data.bairro || '';
      setFieldError('endereco', '');
      setFieldError('bairro', '');
      showNotification('Endereço preenchido!', 'success');
      numeroInput?.focus();
    } catch (err) {
      if (err.name === 'AbortError') return;
      clearAddressForm();
      showNotification('Não foi possível buscar o CEP. Tente novamente.', 'error');
      console.error('Erro ao buscar CEP:', err);
      setFieldError('cep', 'Não foi possível buscar o CEP. Tente novamente.');
    } finally {
      spinner?.classList.add('hidden');
      cepController = null;
    }
  });

  // ===== Formulário de entrega =====
  deliveryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const requiredFields = [
      { key: 'cep', message: 'Informe um CEP válido.' },
      { key: 'endereco', message: 'Informe o endereço.' },
      { key: 'numero', message: 'Informe o número.' },
      { key: 'bairro', message: 'Informe o bairro.' },
    ];
    let isValid = true;

    requiredFields.forEach(({ key }) => setFieldError(key, ''));
    setFieldError('delivery', '');

    requiredFields.forEach(({ key, message }) => {
      const inputEl = fieldInputs[key];
      if (!inputEl) return;
      const value = String(inputEl.value || '').trim();
      if (!value) {
        setFieldError(key, message);
        isValid = false;
        return;
      }

      if (key === 'cep' && !isCEP(value.replace(/\D/g, ''))) {
        setFieldError('cep', 'O CEP deve ter 8 dígitos.');
        isValid = false;
      }

      if (key === 'numero' && !/^[\w\s-]{1,10}$/.test(value)) {
        setFieldError('numero', 'Use apenas números e letras curtos.');
        isValid = false;
      }
    });

    if (!deliverySelect?.value) {
      setFieldError('delivery', 'Escolha um horário de entrega.');
      isValid = false;
    }

    if (!isValid) {
      showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    if (!cart || !cart.packageName) {
      showNotification('Seu carrinho está vazio ou sem pacote selecionado.', 'error');
      return;
    }

    // A verificação de Auth agora é mais robusta
    if (typeof auth !== 'undefined' && auth?.onAuthStateChanged) {
      const authStatus = await waitForAuth();
      if (!authReadyResolved && authStatus === 'timeout') {
        showNotification('Estamos carregando sua sessão. Tente novamente em instantes.', 'error');
        return;
      }
      if (!currentUser) {
        showNotification('Sua sessão expirou. Faça login novamente.', 'error');
        setTimeout(() => { window.location.href = PATH_LOGIN; }, 1800);
        return;
      }
    }

    setButtonLoading(finishOrderBtn, true, 'Enviando pedido...');
    let shouldUnlockFinishButton = true;

    try {
      const cartSnapshot = JSON.parse(JSON.stringify(cart));

      const paymentMethod = getSelectedPaymentMethod();
      const paymentLabel = PAYMENT_LABELS[paymentMethod] || paymentMethod.toUpperCase();

      const deliverySlotValue = document.getElementById('delivery-time-select')?.value || '';
      const deliverySlotLabel = getDeliverySlotLabel(deliverySlotValue);
      const nextDeliveryDate = getNextMondayDate();

      const orderAddress = {
        cep: (cepInput?.value || '').trim(),
        endereco: (enderecoInput?.value || '').trim(),
        numero: (numeroInput?.value || '').trim(),
        bairro: (bairroInput?.value || '').trim(),
        complemento: (complementoInput?.value || '').trim(),
        deliveryTime: deliverySlotValue,
        deliveryTimeLabel: deliverySlotLabel,
      };

      const customerNameFull = (customerProfile.name || currentUser?.displayName || '').trim() || 'Cliente';
      const customerEmail = (customerProfile.email || currentUser?.email || '').trim();
      const customerPhone = (customerProfile.phone || currentUser?.phoneNumber || '').trim();

      const itemsLines = (cartSnapshot.items || []).length
        ? cartSnapshot.items.map((item) => `- ${Number(item.quantity || 0)}x ${item.name}`)
        : ['- Montagem pendente (nenhuma marmita adicionada)'];

      const addressLine = `${orderAddress.endereco}, ${orderAddress.numero} - ${orderAddress.bairro} - CEP ${orderAddress.cep}`;
      const whatsappLines = [
        `Olá, ${customerNameFull}, segue a confirmação do seu pedido:`,
        '',
        `${cartSnapshot.packageName || 'Pacote selecionado'}:`,
        ...itemsLines,
        '',
        `Endereço de entrega: ${addressLine}`,
      ];

      if (orderAddress.complemento) {
        whatsappLines.push(`Complemento: ${orderAddress.complemento}`);
      }

      whatsappLines.push(`Horário escolhido: ${deliverySlotLabel}`);
      whatsappLines.push(`Data de entrega das marmitas: ${nextDeliveryDate} (segunda-feira subsequente)`);
      whatsappLines.push('');
      whatsappLines.push(`Pagamento: ${paymentLabel}`);
      whatsappLines.push(`Valor total: ${formatBRL(cartSnapshot.totalPrice)}`);
      whatsappLines.push('Status: Aguardando pagamento');
      whatsappLines.push('');
      whatsappLines.push('Contato do cliente:');
      whatsappLines.push(`- Nome: ${customerNameFull}`);
      if (customerEmail) whatsappLines.push(`- Email: ${customerEmail}`);
      if (customerPhone) whatsappLines.push(`- Telefone: ${customerPhone}`);

      const whatsappMessage = whatsappLines.join('\n');

      const now = new Date();
      const newOrder = {
        id: now.getTime(),
        createdAtISO: now.toISOString(),
        createdAtDisplay: now.toLocaleString('pt-BR'),
        status: 'pendente',
        cart: {
          packageName: cartSnapshot.packageName,
          packagePrice: Number(cartSnapshot.packagePrice) || 0,
          totalPrice: Number(cartSnapshot.totalPrice) || 0,
          creditsPurchased: Number(cartSnapshot.packageCredits || 0),
          creditsRemaining: Number(cartSnapshot.mealCredits || 0),
          items: Array.isArray(cartSnapshot.items) ? cartSnapshot.items : [],
        },
        address: orderAddress,
        paymentStatus: 'pending',
        payment: {
          method: paymentMethod,
          label: paymentLabel,
        },
        customer: {
          uid: currentUser?.uid || null,
          name: customerNameFull,
          email: customerEmail,
          phone: customerPhone,
        },
        delivery: {
          slot: deliverySlotValue,
          slotLabel: deliverySlotLabel,
          scheduledDate: nextDeliveryDate,
        },
        whatsappMessage,
      };

      try {
        const raw = localStorage.getItem('marmitasOrders');
        const orders = raw ? JSON.parse(raw) : [];
        orders.push(newOrder);
        localStorage.setItem('marmitasOrders', JSON.stringify(orders));
      } catch (_) {
        console.warn('Não foi possível salvar o pedido em marmitasOrders.');
      }

      if (typeof db !== 'undefined' && db?.collection) {
        const orderDoc = db.collection('orders').doc(String(newOrder.id));
        const payload = {
          ...newOrder,
          createdAtServer: typeof firebase !== 'undefined' && firebase?.firestore
            ? firebase.firestore.FieldValue.serverTimestamp()
            : null,
        };

        orderDoc
          .set(payload, { merge: true })
          .catch((err) => console.error('Falha ao gravar pedido no Firestore:', err));
      }

      showNotification('Estamos abrindo o WhatsApp com a confirmação do pedido.', 'success');
      saveAddress();

      const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
      const windowRef = window.open(whatsappURL, '_blank', 'noopener');
      if (!windowRef) {
        window.location.href = whatsappURL;
      }

      try { localStorage.removeItem('marmitasCart'); } catch (_) {}

      shouldUnlockFinishButton = false;

      setTimeout(() => {
        window.location.href = PATH_DASHBOARD;
      }, 2500);
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      showNotification('Não foi possível finalizar o pedido. Tente novamente.', 'error');
    } finally {
      if (shouldUnlockFinishButton) {
        setButtonLoading(finishOrderBtn, false);
      }
    }
  });

  // ===== Boot (INICIALIZAÇÃO ATUALIZADA) =====
  
  // 1. Inicia a verificação de auth
  ensureAuthSession();

  // 2. Espera pela verificação (com timeout)
  const authStatus = await waitForAuth(3000); 

  if (authStatus === 'timeout' && !currentUser) {
      // Firebase demorou muito e não temos usuário
      showNotification('Falha ao verificar sua sessão. Tente recarregar a página.', 'error');
      // Esconde o loading de qualquer forma para não travar a tela
      hideLoadingScreen();
      // Não redireciona, mas o envio do form vai falhar e pedir login

  } else if (!currentUser) {
      // 'resolved' mas como nulo (ninguém logado)
      // O próprio ensureAuthSession já deve ter mostrado notificação e iniciado o redirect
      // A tela de loading vai sumir quando a página de login carregar
      return; // Não faz mais nada, espera o redirect

  }
  
  // 3. Se chegou aqui, temos um usuário (ou estamos offline)!
  // Carregue o conteúdo principal
  loadCart();
  renderCart();
  loadSavedAddress(); // Carrega o endereço salvo

  // 4. Só agora esconda o loading principal
  hideLoadingScreen();
  
});
