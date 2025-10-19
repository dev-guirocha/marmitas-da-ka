document.addEventListener('DOMContentLoaded', function () {
  // ✅ NOVA VERIFICAÇÃO DE LOGIN COM FIREBASE
  auth.onAuthStateChanged(user => {
    if (user) {
        // O utilizador está autenticado, busca os dados dele no Firestore
        console.log("Utilizador autenticado:", user.uid);
        const userInfoSpan = document.getElementById('user-info-name');
        
        // Busca o nome do utilizador na base de dados
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    userInfoSpan.textContent = `Olá, ${userData.name.split(' ')[0]}`;
                    if (userData.role === 'admin') {
                        adminLink?.classList.remove('hidden');
                    } else {
                        adminLink?.classList.add('hidden');
                    }
                } else {
                    // Fallback caso não encontre o documento
                    userInfoSpan.textContent = `Olá!`;
                    adminLink?.classList.add('hidden');
                }
            })
            .catch(error => {
                console.error("Erro ao buscar dados do utilizador:", error);
                userInfoSpan.textContent = `Olá!`;
                adminLink?.classList.add('hidden');
            });

    } else {
        // O utilizador não está autenticado, redireciona para o login
        console.log("Nenhum utilizador autenticado.");
        alert("A sua sessão expirou ou não está autenticado. Por favor, faça login novamente.");
        window.location.href = '../../login/login.html';
    }
});

// ✅ LÓGICA DO BOTÃO DE LOGOUT
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', () => {
    auth.signOut().then(() => {
        showNotification('Sessão terminada. Até breve!', 'info');
        setTimeout(() => {
            window.location.href = '../../login/login.html';
        }, 1500);
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
        showNotification('Ocorreu um erro ao tentar sair.', 'error');
    });
});

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

  const cartCountSpan = document.getElementById('cart-count');
  const cartTotalSpan = document.getElementById('cart-total');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const modal = document.getElementById('clearCartModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalOptions = document.querySelector('.modal-options');

  const openModal = () => modal?.classList.remove('hidden');
  const closeModal = () => modal?.classList.add('hidden');

  clearCartBtn?.addEventListener('click', () => {
    const hasPackage = !!cart.packageName;
    const hasItems = !!(cart.items && cart.items.length > 0);
    if (!hasPackage && !hasItems) {
      showNotification('O carrinho já está vazio.', 'info');
      return;
    }
    openModal();
  });

  closeModalBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modalOptions?.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const mode = button.dataset.mode;

    if (mode === '1') {
      cart.items = [];
      cart.mealCredits = Number(cart.packageCredits || 0);
      showNotification('Itens removidos. Créditos restaurados.', 'success');
    } else if (mode === '2') {
      cart.packageName = null;
      cart.packagePrice = 0;
      cart.totalPrice = 0;
      cart.mealCredits = 0;
      cart.packageCredits = 0;
      cart.items = [];
      showNotification('Pacote removido.', 'success');

      // UI: remover destaque do pacote selecionado
      document.querySelectorAll('.pacote-card').forEach((card) => card.classList.remove('selected'));
      document.querySelector('.pacotes-grid')?.classList.remove('has-selection');
    } else if (mode === '3') {
      cart = { packageName: null, packagePrice: 0, totalPrice: 0, mealCredits: 0, packageCredits: 0, items: [] };
      showNotification('Carrinho esvaziado.', 'success');

      // UI: remover destaque do pacote selecionado
      document.querySelectorAll('.pacote-card').forEach((card) => card.classList.remove('selected'));
      document.querySelector('.pacotes-grid')?.classList.remove('has-selection');
    } else {
      return;
    }

    try {
      if (!cart.packageName) {
        localStorage.removeItem('marmitasCart');
      } else {
        localStorage.setItem('marmitasCart', JSON.stringify(cart));
      }
    } catch (_) {}

    updateCartDisplay();
    closeModal();
  });

  // Alterado: usamos o container pai opcionalmente, com guarda
  const floatingCart = document.getElementById('floatingCart');
  const floatingCartIcon = floatingCart?.querySelector('.cart-icon');
  const floatingCartCount = document.getElementById('floatingCartCount');

  const creditsInfo = document.getElementById('creditsInfo');
  const creditsCount = document.getElementById('credits-count');
  const creditsBadge = document.getElementById('credits-badge'); // <- adicionado
  const cartStatus = document.getElementById('cartStatus');
  const cartPreview = document.querySelector('.cart-preview');
  const orderItemsContainer = document.getElementById('order-items');
  const menuSlider = document.querySelector('.menu-slider');
  const adminLink = document.getElementById('adminLink');
  const upgradeModal = document.getElementById('upgradeModal');
  const upgradeMessageEl = document.getElementById('upgradeMessage');
  const upgradeAcceptBtn = document.getElementById('upgradeAcceptBtn');
  const upgradeDeclineBtn = document.getElementById('upgradeDeclineBtn');
  const upgradeCloseBtn = document.getElementById('upgradeCloseBtn');

  let pendingUpgrade = null;

  adminLink?.classList.add('hidden');

  orderItemsContainer?.addEventListener('click', (event) => {
    const button = event.target.closest('.remove-order-item');
    if (!button) return;

    const index = Number(button.dataset.index);
    if (!Number.isFinite(index) || index < 0) return;

    const removed = cart.items[index];
    if (!removed) return;

    const creditsToRestore = Math.max(0, Number(removed.quantity || 0));
    cart.items.splice(index, 1);

    const maxCredits = Number(cart.packageCredits || 0);
    const nextCredits = Number(cart.mealCredits || 0) + creditsToRestore;
    cart.mealCredits = Math.min(maxCredits || nextCredits, nextCredits);

    updateCartDisplay();
    showNotification(`${removed.name} removida do pedido.`, 'info');
  });

  function attachMenuItemBehavior(item) {
    if (!item || item.dataset.initialized === 'true') return;

    const name = item.dataset.name;
    if (!name) return;

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

    item.dataset.initialized = 'true';
  }

  function initializeMenuItems() {
    document.querySelectorAll('.menu-item').forEach(attachMenuItemBehavior);
  }

  function clearDynamicMenuItems() {
    menuSlider?.querySelectorAll('.menu-item[data-source="dynamic"]').forEach((el) => el.remove());
  }

  function createMenuItemCard(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-item';
    wrapper.dataset.name = item?.name || '';
    wrapper.dataset.source = 'dynamic';

    const imageUrl = item?.imageUrl || 'https://via.placeholder.com/320x200?text=Marmita';
    const description = item?.description || 'Delícia saudável da semana.';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = item?.name || 'Item do cardápio';

    const title = document.createElement('h3');
    title.textContent = item?.name || 'Novo prato';

    const desc = document.createElement('p');
    desc.className = 'item-description';
    desc.textContent = description;

    const footer = document.createElement('div');
    footer.className = 'item-footer';

    const qtyWrapper = document.createElement('div');
    qtyWrapper.className = 'quantity-selector';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'btn-qty minus';
    minusBtn.type = 'button';
    minusBtn.setAttribute('aria-label', 'Remover um');
    minusBtn.textContent = '-';

    const quantity = document.createElement('span');
    quantity.className = 'quantity';
    quantity.textContent = '0';

    const plusBtn = document.createElement('button');
    plusBtn.className = 'btn-qty plus';
    plusBtn.type = 'button';
    plusBtn.setAttribute('aria-label', 'Adicionar um');
    plusBtn.textContent = '+';

    qtyWrapper.appendChild(minusBtn);
    qtyWrapper.appendChild(quantity);
    qtyWrapper.appendChild(plusBtn);
    footer.appendChild(qtyWrapper);

    wrapper.appendChild(img);
    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    wrapper.appendChild(footer);

    return wrapper;
  }

  function loadDynamicMenuItems() {
    if (!menuSlider || typeof db === 'undefined' || !db?.collection) {
      return Promise.resolve();
    }

    clearDynamicMenuItems();

    return db
      .collection('menuItems')
      .orderBy('name')
      .get()
      .then((snapshot) => {
        if (snapshot.empty) return;
        const fragment = document.createDocumentFragment();

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data || !data.name || data.isActive === false) return;

          const card = createMenuItemCard({ id: doc.id, ...data });
          fragment.appendChild(card);
        });

        if (fragment.childNodes.length) {
          menuSlider?.appendChild(fragment);
          initializeMenuItems();
          updateMenuItemQuantities();
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar cardápio dinâmico:', err);
      });
  }

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

  function updateCreditsBadge() {
    if (!creditsBadge) return;
    creditsBadge.textContent = `Créditos: ${cart.mealCredits}`;
  }

  // === Ponto 2.2: Desativar/Add feedback quando créditos acabarem ===
  function managePlusButtonsState() {
    const plusButtons = document.querySelectorAll('.quantity-selector .btn-qty.plus');
    const creditsInfoEl = document.getElementById('creditsInfo');

    const noCredits = Number(cart?.mealCredits || 0) <= 0;

    plusButtons.forEach((btn) => {
      btn.disabled = noCredits;
      btn.setAttribute('aria-disabled', noCredits ? 'true' : 'false');
      if (noCredits) {
        btn.setAttribute('title', 'Sem créditos disponíveis');
      } else {
        btn.removeAttribute('title');
      }
    });

    creditsInfoEl?.classList.toggle('warning', noCredits);
  }

  function updateMenuItemQuantities() {
    document.querySelectorAll('.menu-item').forEach((menuItem) => {
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
    const totalItems = cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
    updateCreditsBadge();

    if (Number(cart.packagePrice) > 0) {
      creditsBadge?.classList.remove('hidden');
      if (floatingCartCount) floatingCartCount.textContent = String(totalItems);
      if (creditsCount) creditsCount.textContent = String(cart.mealCredits);

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
      creditsBadge?.classList.add('hidden');
      if (floatingCartCount) floatingCartCount.textContent = '0';
      if (creditsCount) creditsCount.textContent = '0';

      creditsInfo?.classList.add('hidden');
      cartStatus?.classList.remove('hidden');
      document.getElementById('order-summary')?.classList.add('hidden');
    }

    updateMenuItemQuantities();
    updateCartPreview();
    managePlusButtonsState();

    try {
      localStorage.setItem('marmitasCart', JSON.stringify(cart));
    } catch (_) {}
  }

  // --- LÓGICA ATUALIZADA: Botões de Pacote ---
  const packageButtons = Array.from(document.querySelectorAll('.add-package-to-cart'));

  const upgradeMap = {
    'Plano Praticidade': [
      { name: 'Plano Constância', credits: 10 },
      { name: 'Plano Equilíbrio', credits: 20 },
    ],
  };

  function showUpgradeSuggestion(currentName) {
    const suggestions = upgradeMap[currentName];
    if (!suggestions || !suggestions.length) {
      showNotification('Você já selecionou este plano. Se quiser trocar, escolha outro pacote.', 'info');
      return;
    }

    const [primarySuggestion, secondarySuggestion] = suggestions;
    const secondaryText = secondarySuggestion
      ? `<br>Outra possibilidade é o <strong>${secondarySuggestion.name}</strong> (${secondarySuggestion.credits} marmitas).`
      : '';

    if (upgradeMessageEl) {
      upgradeMessageEl.innerHTML = `Você já está com o <strong>${currentName}</strong>.<br><br>` +
        `Que tal atualizar para o <strong>${primarySuggestion.name}</strong> (${primarySuggestion.credits} marmitas)?${secondaryText}`;
    }

    pendingUpgrade = { targetName: primarySuggestion.name };
    upgradeAcceptBtn?.setAttribute('data-target-name', primarySuggestion.name);

    upgradeModal?.classList.remove('hidden');
  }

  function handlePackageSelection(button, { skipSuggestion = false, skipReplaceConfirm = false } = {}) {
    if (!button) return;

    const price = parseFloat(button.dataset.price);
    const name = button.dataset.name;
    const credits = parseInt(button.dataset.credits, 10);

    const validPrice = Number.isFinite(price) ? price : 0;
    const validCredits = Number.isFinite(credits) ? credits : 0;

    if (!skipSuggestion && cart.packageName && cart.packageName === name) {
      showUpgradeSuggestion(name);
      return;
    }

    if (!skipReplaceConfirm && cart.packageName && cart.packageName !== name) {
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

    document.querySelectorAll('.pacote-card').forEach((card) => card.classList.remove('selected'));
    button.closest('.pacotes-grid')?.classList.add('has-selection');
    button.closest('.pacote-card')?.classList.add('selected');

    updateCartDisplay();
    showNotification(`"${name}" selecionado! Você tem ${validCredits} créditos.`, 'success');
    document.querySelector('#cardapio')?.scrollIntoView({ behavior: 'smooth' });
    triggerCartAnimation();
  }

  packageButtons.forEach((button) => {
    button.addEventListener('click', () => handlePackageSelection(button));
  });

  const closeUpgradeModal = (showInfo = false) => {
    if (upgradeModal?.classList.contains('hidden')) return;
    upgradeModal.classList.add('hidden');
    if (showInfo) {
      showNotification('Mantivemos o plano atual. Você pode trocar a qualquer momento.', 'info');
    }
    pendingUpgrade = null;
  };

  upgradeAcceptBtn?.addEventListener('click', () => {
    const targetName = pendingUpgrade?.targetName || upgradeAcceptBtn.dataset.targetName;
    if (!targetName) {
      closeUpgradeModal();
      return;
    }

    const targetButton = packageButtons.find((btn) => btn.dataset.name === targetName);
    if (targetButton) {
      handlePackageSelection(targetButton, { skipSuggestion: true, skipReplaceConfirm: true });
    } else {
      showNotification(`Plano ${targetName} não encontrado.`, 'error');
    }
    closeUpgradeModal();
  });

  upgradeDeclineBtn?.addEventListener('click', () => {
    closeUpgradeModal(true);
  });

  upgradeCloseBtn?.addEventListener('click', () => closeUpgradeModal());
  upgradeModal?.addEventListener('click', (event) => {
    if (event.target === upgradeModal) closeUpgradeModal();
  });

  initializeMenuItems();

  // Carrega o carrinho salvo ao iniciar
  let savedCart = null;
  try {
    savedCart = localStorage.getItem('marmitasCart');
  } catch (_) {}

  if (savedCart) {
    // Se há um carrinho salvo, primeiro carregamos ele
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
      try {
        localStorage.removeItem('marmitasCart');
      } catch (_) {}
    }
  }

  updateCartDisplay();

  // --- Seleciona pacote vindo do index/login ---
  function applyPreselectedPackage() {
    let raw = null;
    try {
      raw = localStorage.getItem('selectedPackage');
    } catch (_) {}

    const key = (raw || '').toLowerCase().trim();
    if (!key) return;

    const aliasMap = {
      semanal: 'semanal',
      quinzenal: 'quinzenal',
      mensal: 'mensal',
      praticidade: 'semanal',
      'planopraticidade': 'semanal',
      constancia: 'quinzenal',
      'planoconstancia': 'quinzenal',
      equilibrio: 'mensal',
      'planoequilibrio': 'mensal',
    };

    const sanitizedKey = key.replace(/[^a-z0-9]/g, '');
    const canonicalKey = aliasMap[sanitizedKey] || aliasMap[key] || sanitizedKey;

    const packageMap = {
      semanal: { key: 'semanal', name: 'Plano Praticidade' },
      quinzenal: { key: 'quinzenal', name: 'Plano Constância' },
      mensal: { key: 'mensal', name: 'Plano Equilíbrio' },
    };

    const packageInfo = packageMap[canonicalKey];
    if (!packageInfo) {
      localStorage.removeItem('selectedPackage');
      return;
    }

    let btn =
      document.querySelector(`.add-package-to-cart[data-package-key="${packageInfo.key}"]`) ||
      document.querySelector(`.add-package-to-cart[data-name="${packageInfo.name}"]`);

    if (!btn) {
      const buttons = document.querySelectorAll('.add-package-to-cart');
      btn = Array.from(buttons).find((b) => (b.dataset.name || '').toLowerCase().includes(packageInfo.name.toLowerCase()));
    }

    if (!btn) {
      localStorage.removeItem('selectedPackage');
      console.warn('selectedPackage informado, mas nenhum botão correspondente foi encontrado:', key);
      return;
    }

    const targetName = btn.dataset.name || packageInfo.name;

    if (cart.packageName && cart.packageName === targetName) {
      document.querySelectorAll('.pacote-card').forEach((card) => card.classList.remove('selected'));
      btn.closest('.pacote-card')?.classList.add('selected');
      btn.closest('.pacotes-grid')?.classList.add('has-selection');
      localStorage.removeItem('selectedPackage');
      return;
    }

    if (cart.packageName && cart.packageName !== targetName) {
      cart = {
        packageName: null,
        packagePrice: 0,
        totalPrice: 0,
        mealCredits: 0,
        packageCredits: 0,
        items: [],
      };
      updateCartDisplay();
      try {
        localStorage.removeItem('marmitasCart');
      } catch (_) {}
    }

    btn.click();
    localStorage.removeItem('selectedPackage');
  }

  loadDynamicMenuItems()
    .catch(() => {})
    .finally(() => {
      initializeMenuItems();
      updateMenuItemQuantities();
      applyPreselectedPackage();
      setupMenuSlider();
    });

  function setupMenuSlider() {
    const slider = document.querySelector('.menu-slider');
    const items = slider ? Array.from(slider.querySelectorAll('.menu-item')) : [];
    const prevArrow = document.querySelector('.slider-arrow.prev');
    const nextArrow = document.querySelector('.slider-arrow.next');
    const dotsContainer = document.querySelector('.navigation-dots');

    if (!slider || !items.length) return;

    let itemsPerView = calcItemsPerView();
    let totalSlides = Math.max(1, Math.ceil(items.length / itemsPerView));
    let currentSlide = 0;
    let resizeRaf = null;
    let isProgrammaticScroll = false;
    let scrollTimeout = null;

    rebuildDots();
    updateUI();

    prevArrow?.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextArrow?.addEventListener('click', () => goToSlide(currentSlide + 1));

    dotsContainer?.addEventListener('click', (event) => {
      const dot = event.target.closest('.dot');
      if (!dot) return;
      const index = Number(dot.dataset.index);
      if (!Number.isFinite(index)) return;
      goToSlide(index);
    });

    slider.addEventListener('scroll', () => {
      if (isProgrammaticScroll) return;
      if (!items.length) return;
      const scrollLeft = slider.scrollLeft;
      const targetIndex = items.reduce((closest, item, idx) => {
        const distance = Math.abs(item.offsetLeft - scrollLeft);
        return distance < closest.distance ? { distance, index: idx } : closest;
      }, { distance: Number.POSITIVE_INFINITY, index: 0 }).index;

      const inferredSlide = Math.floor(targetIndex / itemsPerView);
      if (inferredSlide !== currentSlide) {
        currentSlide = inferredSlide;
        updateUI();
      }
    });

    window.addEventListener('resize', () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        const nextPerView = calcItemsPerView();
        if (nextPerView === itemsPerView) return;

        itemsPerView = nextPerView;
        totalSlides = Math.max(1, Math.ceil(items.length / itemsPerView));
        currentSlide = Math.min(currentSlide, totalSlides - 1);
        rebuildDots();
        updateUI();
        const targetItem = items[currentSlide * itemsPerView];
        if (targetItem) {
          slider.scrollTo({ left: targetItem.offsetLeft, behavior: 'auto' });
        }
      });
    });

    function calcItemsPerView() {
      if (!items.length) return 1;
      const sliderWidth = slider.clientWidth;
      const itemWidth = items[0].clientWidth;
      if (!itemWidth || !sliderWidth) return 1;
      const computed = window.getComputedStyle(slider);
      const gap = Number.parseFloat(computed.gap || computed.columnGap || '0') || 0;
      const totalWidth = itemWidth + gap;
      if (!totalWidth) return 1;
      return Math.max(1, Math.round((sliderWidth + gap) / totalWidth));
    }

    function goToSlide(index) {
      const targetSlide = Math.max(0, Math.min(index, totalSlides - 1));
      currentSlide = targetSlide;
      const targetItem = items[currentSlide * itemsPerView];
      if (targetItem) {
        isProgrammaticScroll = true;
        slider.scrollTo({ left: targetItem.offsetLeft, behavior: 'smooth' });
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(() => {
          isProgrammaticScroll = false;
          scrollTimeout = null;
          updateUI();
        }, 400);
      } else {
        isProgrammaticScroll = false;
      }
      updateUI();
    }

    function rebuildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides; i += 1) {
        const dot = document.createElement('span');
        dot.className = `dot${i === currentSlide ? ' active' : ''}`;
        dot.dataset.index = String(i);
        dotsContainer.appendChild(dot);
      }
    }

    function updateDots() {
      if (!dotsContainer) return;
      dotsContainer.querySelectorAll('.dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentSlide);
      });
    }

    function updateArrows() {
      if (prevArrow) {
        const disabled = currentSlide <= 0;
        prevArrow.disabled = disabled;
        prevArrow.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }
      if (nextArrow) {
        const disabled = currentSlide >= totalSlides - 1;
        nextArrow.disabled = disabled;
        nextArrow.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      }
    }

    function updateUI() {
      updateDots();
      updateArrows();
    }
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

  // ✅ Sincronização entre abas (marmitasCart)
  window.addEventListener('storage', (e) => {
    if (e.key !== 'marmitasCart') return; // só nos interessa o carrinho
    console.log('Sincronizando carrinho a partir de outra aba...');

    // Estado base (fallback)
    let next = {
      packageName: null,
      packagePrice: 0,
      totalPrice: 0,
      mealCredits: 0,
      packageCredits: 0,
      items: [],
    };

    try {
      if (e.newValue) {
        const parsed = JSON.parse(e.newValue);

        if (parsed && typeof parsed === 'object') {
          next.packageName = parsed?.packageName ?? null;
          next.packagePrice = Number.isFinite(+parsed?.packagePrice) ? +parsed.packagePrice : 0;
          next.items = Array.isArray(parsed?.items) ? parsed.items : [];
          next.mealCredits = Number.isFinite(+parsed?.mealCredits) ? +parsed.mealCredits : 0;

          next.totalPrice = Number.isFinite(+parsed?.totalPrice)
            ? +parsed.totalPrice
            : (Number.isFinite(+parsed?.packagePrice) ? +parsed.packagePrice : 0);

          if (Number.isFinite(+parsed?.packageCredits)) {
            next.packageCredits = +parsed.packageCredits;
          } else if (next.packageName) {
            const sumQty = next.items.reduce((acc, it) => acc + Number(it?.quantity || 0), 0);
            next.packageCredits = Math.max(0, next.mealCredits + sumQty);
          } else {
            next.packageCredits = 0;
          }
        }
      } else {
        // carrinho foi limpo na outra aba
        next = { packageName: null, packagePrice: 0, totalPrice: 0, mealCredits: 0, packageCredits: 0, items: [] };
      }
    } catch (err) {
      console.error('Erro ao analisar dados do carrinho sincronizado:', err);
    }

    // aplica e atualiza UI
    cart = next;
    updateCartDisplay();

    // Reflete visual do pacote selecionado
    if (cart?.packageName) {
      const buttons = document.querySelectorAll('.add-package-to-cart');
      const btn = Array.from(buttons).find((b) => {
        const n = (b.dataset.name || '').toLowerCase();
        return n && cart.packageName && n.includes(cart.packageName.toLowerCase());
      });

      document.querySelectorAll('.pacote-card').forEach((card) => card.classList.remove('selected'));
      document.querySelector('.pacotes-grid')?.classList.toggle('has-selection', !!btn);
      btn?.closest('.pacote-card')?.classList.add('selected');
    } else {
      document.querySelectorAll('.pacote-card').forEach((card) => card.classList.remove('selected'));
      document.querySelector('.pacotes-grid')?.classList.remove('has-selection');
    }

    showNotification('Seu carrinho foi atualizado por outra aba.', 'info');
  });
});
