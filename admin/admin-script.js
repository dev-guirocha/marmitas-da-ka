document.addEventListener('DOMContentLoaded', () => {
  const PATH_LOGIN = '../login/login.html';
  const DASHBOARD_URL = '../login/dashboard/dashboard.html';
  const BUSINESS_WHATSAPP = '5579991428025';
  const ADMIN_EMAILS = ['contato@marmitasdaka.com.br'];

  const ORDER_STATUS_OPTIONS = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'em_preparo', label: 'Em preparo' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  const PAYMENT_STATUS_META = {
    pending: { icon: 'fa-clock', label: 'Pagamento pendente', short: 'Pendente' },
    paid: { icon: 'fa-circle-check', label: 'Pagamento confirmado', short: 'Pago' },
    cancelled: { icon: 'fa-circle-xmark', label: 'Pedido cancelado', short: 'Cancelado' },
  };

  const loadingScreen = document.getElementById('loadingScreen');
  const ordersListEl = document.getElementById('ordersList');
  const statusFilterEl = document.getElementById('statusFilter');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const menuItemsListEl = document.getElementById('menuItemsList');
  const refreshMenuBtn = document.getElementById('refreshMenuBtn');
  const newMenuItemForm = document.getElementById('newMenuItemForm');
  const orderTemplate = document.getElementById('orderTemplate');
  const menuTemplate = document.getElementById('menuItemTemplate');
  const liveRegion = document.getElementById('live-region');

  const formFields = {
    name: document.getElementById('itemName'),
    description: document.getElementById('itemDescription'),
    imageFile: document.getElementById('itemImage'),
    imageUrl: document.getElementById('itemImageUrl'),
    category: document.getElementById('itemCategory'),
  };

  let ordersData = [];
  let menuItemsData = [];
  let currentUser = null;
  let isAdmin = false;
  let menuLoading = false;
  let ordersLoading = false;

  let paymentMenuEl = null;
  let paymentMenuAnchor = null;
  let paymentMenuOrder = null;

  const handleOutsidePaymentClick = (event) => {
    if (!paymentMenuEl) return;
    if (paymentMenuEl.contains(event.target) || paymentMenuAnchor?.contains(event.target)) return;
    closePaymentMenu();
  };

  function closePaymentMenu() {
    if (paymentMenuEl) {
      paymentMenuEl.remove();
      paymentMenuEl = null;
      paymentMenuAnchor = null;
      paymentMenuOrder = null;
      document.removeEventListener('click', handleOutsidePaymentClick);
    }
  }

  const updatePaymentIndicator = (indicatorEl, state = 'pending') => {
    if (!indicatorEl) return;
    const meta = PAYMENT_STATUS_META[state] || PAYMENT_STATUS_META.pending;
    indicatorEl.dataset.state = state;
    indicatorEl.title = meta.label;
    const icon = indicatorEl.querySelector('i');
    if (icon) icon.className = `fas ${meta.icon}`;
  };

const openPaymentMenu = (order, anchor, card) => {
  if (!anchor || !card) return;
  if (paymentMenuEl && paymentMenuOrder === order) {
    closePaymentMenu();
    return;
  }

  closePaymentMenu();

  const menu = document.createElement('div');
  menu.className = 'payment-menu';

    const options = [
      { key: 'paid', label: 'Marcar como pago', icon: 'fa-circle-check' },
      { key: 'pending', label: 'Marcar como pendente', icon: 'fa-clock' },
      { key: 'cancelled', label: 'Cancelar pedido', icon: 'fa-circle-xmark' },
    ];

    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = `<i class="fas ${opt.icon}"></i> ${opt.label}`;
      if ((order.paymentStatus || 'pending') === opt.key) {
        btn.disabled = true;
        btn.classList.add('is-current');
      }
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        setPaymentStatus(order, opt.key);
      });
      menu.appendChild(btn);
    });

    const whatsappBtn = document.createElement('button');
    whatsappBtn.type = 'button';
    whatsappBtn.className = 'payment-menu__action';
    whatsappBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Abrir conversa no WhatsApp';
    whatsappBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const link = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(buildWhatsappMessage(order))}`;
      window.open(link, '_blank', 'noopener');
      closePaymentMenu();
    });
    menu.appendChild(whatsappBtn);

  const footer = card.querySelector('.order-card__footer');
  const targetContainer = footer || card;
  targetContainer.appendChild(menu);
  menu.style.minWidth = `${Math.max(220, anchor.offsetWidth + 40)}px`;

  const rect = menu.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (rect.top < 0) {
    menu.style.bottom = 'auto';
    menu.style.top = 'calc(100% + 12px)';
  }
  if (rect.bottom > viewportHeight) {
    menu.style.top = 'auto';
    menu.style.bottom = 'calc(100% + 12px)';
  }

  paymentMenuEl = menu;
  paymentMenuAnchor = anchor;
    paymentMenuOrder = order;

    setTimeout(() => document.addEventListener('click', handleOutsidePaymentClick), 0);
  };

  function setPaymentStatus(order, status) {
    if (!order) return;

    const previous = order.paymentStatus || 'pending';
    order.paymentStatus = status;

    closePaymentMenu();
    renderOrders();

    if (typeof db === 'undefined' || !db?.collection) {
      notify('Status de pagamento atualizado localmente.', 'info');
      return;
    }

    db.collection('orders')
      .doc(String(order.id))
      .update({
        paymentStatus: status,
        paymentStatusUpdatedAt: typeof firebase !== 'undefined' && firebase?.firestore
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
      })
      .then(() => {
        const meta = PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.pending;
        const type = status === 'paid' ? 'success' : (status === 'cancelled' ? 'error' : 'info');
        notify(meta.label, type);
      })
      .catch((err) => {
        console.error('Erro ao atualizar pagamento:', err);
        order.paymentStatus = previous;
        renderOrders();
        notify('Não foi possível atualizar o status de pagamento.', 'error');
      });
  }

  const notify = (message, type = 'success') => {
    document.querySelector('.notification')?.remove();
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'notification__close';
    closeBtn.setAttribute('aria-label', 'Fechar aviso');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => toast.remove());

    const text = document.createElement('span');
    text.className = 'notification__text';
    text.textContent = message;

    toast.appendChild(text);
    toast.appendChild(closeBtn);

    document.body.appendChild(toast);
    if (liveRegion) liveRegion.textContent = message;

    setTimeout(() => toast.remove(), 6000);
  };

  const hideLoading = () => {
    if (!loadingScreen) return;
    loadingScreen.style.opacity = '0';
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 400);
  };

  const formatDateTime = (order) => {
    if (order?.createdAtServer?.toDate) {
      return order.createdAtServer.toDate().toLocaleString('pt-BR');
    }
    if (order?.createdAtISO) {
      return new Date(order.createdAtISO).toLocaleString('pt-BR');
    }
    return '-';
  };

  const buildWhatsappMessage = (order) => {
    if (order?.whatsappMessage) return order.whatsappMessage;

    const items = Array.isArray(order?.cart?.items) && order.cart.items.length
      ? order.cart.items.map((item) => `- ${Number(item.quantity || 0)}x ${item.name}`)
      : ['- Montagem pendente'];

    const addr = order?.address || {};
    const lines = [
      `Olá, ${order?.customer?.name || 'cliente'}, segue a confirmação do seu pedido:`,
      '',
      `${order?.cart?.packageName || 'Pacote selecionado'}:`,
      ...items,
      '',
      `Endereço de entrega: ${addr.endereco || ''}, ${addr.numero || ''} - ${addr.bairro || ''} - CEP ${addr.cep || ''}`,
    ];
    if (addr.complemento) lines.push(`Complemento: ${addr.complemento}`);
    if (order?.delivery?.slotLabel) lines.push(`Horário escolhido: ${order.delivery.slotLabel}`);
    if (order?.delivery?.scheduledDate) {
      lines.push(`Data de entrega das marmitas: ${order.delivery.scheduledDate}`);
    }
    lines.push('');
    lines.push(`Pagamento: ${order?.payment?.label || 'A combinar'}`);
    if (order?.cart?.totalPrice !== undefined) {
      lines.push(`Valor total: R$ ${Number(order.cart.totalPrice || 0).toFixed(2).replace('.', ',')}`);
    }
    lines.push('Status: ' + (ORDER_STATUS_OPTIONS.find((opt) => opt.value === order?.status)?.label || 'Pendente'));
    lines.push('');
    lines.push('Contato do cliente:');
    if (order?.customer?.name) lines.push(`- Nome: ${order.customer.name}`);
    if (order?.customer?.email) lines.push(`- Email: ${order.customer.email}`);
    if (order?.customer?.phone) lines.push(`- Telefone: ${order.customer.phone}`);

    return lines.join('\n');
  };

  function renderOrders() {
    closePaymentMenu();

    if (!ordersListEl) return;

    if (!ordersData.length) {
      ordersListEl.innerHTML = '<p class="placeholder">Nenhum pedido encontrado.</p>';
      return;
    }

    const filter = statusFilterEl?.value || 'todos';
    const filtered = filter === 'todos'
      ? ordersData
      : ordersData.filter((order) => order.status === filter);

    if (!filtered.length) {
      ordersListEl.innerHTML = '<p class="placeholder">Nenhum pedido com esse status.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((order) => {
      const tpl = orderTemplate.content.cloneNode(true);
      const card = tpl.querySelector('.order-card');

      const paymentState = order.paymentStatus || order.payment?.status || 'pending';
      order.paymentStatus = paymentState;

      const paymentIndicator = tpl.querySelector('.order-payment-indicator');
      updatePaymentIndicator(paymentIndicator, paymentState);
      card.dataset.paymentState = paymentState;

      tpl.querySelector('.order-id').textContent = `#${order.id}`;
      tpl.querySelector('.order-date').textContent = formatDateTime(order);
      tpl.querySelector('.order-package').textContent = order?.cart?.packageName || '-';
      tpl.querySelector('.order-total').textContent = `Total: R$ ${Number(order?.cart?.totalPrice || 0).toFixed(2).replace('.', ',')}`;

      const itemsList = tpl.querySelector('.order-items');
      itemsList.innerHTML = '';
      if (Array.isArray(order?.cart?.items) && order.cart.items.length) {
        order.cart.items.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = `${item.quantity}x ${item.name}`;
          itemsList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'Nenhuma marmita selecionada.';
        itemsList.appendChild(li);
      }

      tpl.querySelector('.order-customer').textContent = order?.customer?.name || 'Cliente';
      const contactLines = [];
      if (order?.customer?.email) contactLines.push(order.customer.email);
      if (order?.customer?.phone) contactLines.push(order.customer.phone);
      tpl.querySelector('.order-contact').textContent = contactLines.join(' | ') || 'Sem contato cadastrado.';

      const addr = order?.address || {};
      const addressLine = `${addr.endereco || ''}, ${addr.numero || ''} - ${addr.bairro || ''} - CEP ${addr.cep || ''}`;
      tpl.querySelector('.order-address').textContent = addressLine.trim();
      const scheduleParts = [];
      if (order?.delivery?.slotLabel) scheduleParts.push(order.delivery.slotLabel);
      if (order?.delivery?.scheduledDate) scheduleParts.push(order.delivery.scheduledDate);
      tpl.querySelector('.order-schedule').textContent = scheduleParts.join(' | ') || 'Horário a combinar.';
      const paymentMeta = PAYMENT_STATUS_META[paymentState] || PAYMENT_STATUS_META.pending;
      tpl.querySelector('.order-payment').textContent = `Pagamento: ${order?.payment?.label || 'A combinar'} • ${paymentMeta.label}`;

      const statusSelect = tpl.querySelector('.order-status');
      ORDER_STATUS_OPTIONS.forEach((opt) => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        if (opt.value === (order.status || 'pendente')) optionEl.selected = true;
        statusSelect.appendChild(optionEl);
      });
      statusSelect.dataset.id = order.id;
      statusSelect.addEventListener('change', (event) => handleStatusChange(event, order));

      const paymentBtn = tpl.querySelector('.payment-status');
      const deliveryBtn = tpl.querySelector('.delivery-status');

      paymentBtn.setAttribute('aria-label', `Status de pagamento: ${paymentMeta.short}`);
      deliveryBtn.setAttribute('aria-label', 'Status de entrega');

      paymentBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openPaymentMenu(order, paymentBtn, card);
      });

      deliveryBtn.addEventListener('click', () => {
        notify('Atualize o status de entrega usando o seletor acima.', 'info');
      });

      fragment.appendChild(tpl);
    });

    ordersListEl.innerHTML = '';
    ordersListEl.appendChild(fragment);
  }

  const renderMenuItems = () => {
    closePaymentMenu();

    if (!menuItemsListEl) return;

    if (!menuItemsData.length) {
      menuItemsListEl.innerHTML = '<p class="placeholder">Nenhum item cadastrado no cardápio.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    menuItemsData.forEach((item) => {
      const tpl = menuTemplate.content.cloneNode(true);
      const card = tpl.querySelector('.menu-card');
      card.dataset.id = item.id;

      const image = tpl.querySelector('.menu-card__image');
      image.src = item.imageUrl || 'https://via.placeholder.com/360x220?text=Marmita';
      image.alt = item.name || 'Prato do cardápio';

      tpl.querySelector('.menu-card__title').textContent = item.name || 'Novo prato';
      tpl.querySelector('.menu-card__description').textContent = item.description || 'Sem descrição.';

      const metaParts = [];
      metaParts.push(item.isActive === false ? 'Inativo' : 'Ativo');
      if (item.category) metaParts.push(item.category);
      if (item.createdAt?.toDate) {
        metaParts.push(`Criado em ${item.createdAt.toDate().toLocaleDateString('pt-BR')}`);
      }
      tpl.querySelector('.menu-card__meta').textContent = metaParts.join(' · ');

      const toggleBtn = tpl.querySelector('.toggle-active');
      toggleBtn.textContent = item.isActive === false ? 'Reativar' : 'Desativar';
      toggleBtn.dataset.id = item.id;
      toggleBtn.addEventListener('click', () => toggleMenuItem(item));

      const openBtn = tpl.querySelector('.open-image');
      openBtn.addEventListener('click', () => {
        if (item.imageUrl) window.open(item.imageUrl, '_blank', 'noopener');
      });

      fragment.appendChild(tpl);
    });

    menuItemsListEl.innerHTML = '';
    menuItemsListEl.appendChild(fragment);
  };

  const handleStatusChange = (event, order) => {
    const newStatus = event.target.value;
    if (!order?.id || typeof db === 'undefined' || !db?.collection) {
      notify('Não foi possível atualizar o status.', 'error');
      return;
    }

    event.target.disabled = true;
    db.collection('orders')
      .doc(String(order.id))
      .update({
        status: newStatus,
        updatedAtServer: typeof firebase !== 'undefined' && firebase?.firestore
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
      })
      .then(() => {
        notify('Status atualizado.');
        order.status = newStatus;
        renderOrders();
      })
      .catch((err) => {
        console.error('Erro ao atualizar status do pedido:', err);
        notify('Erro ao atualizar status.', 'error');
        event.target.value = order.status || 'pendente';
      })
      .finally(() => {
        event.target.disabled = false;
      });
  };

  const loadOrders = () => {
    if (typeof db === 'undefined' || !db?.collection) {
      ordersListEl.innerHTML = '<p class="placeholder">Firestore não disponível.</p>';
      hideLoading();
      return;
    }

    ordersLoading = true;
    db.collection('orders')
      .orderBy('createdAtServer', 'desc')
      .get()
      .then((snapshot) => {
        ordersData = [];
        snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        if (!data.paymentStatus) data.paymentStatus = 'pending';
        ordersData.push(data);
        });
        renderOrders();
      })
      .catch((err) => {
        console.error('Erro ao carregar pedidos:', err);
        ordersListEl.innerHTML = '<p class="placeholder">Não foi possível carregar os pedidos.</p>';
      })
      .finally(() => {
        ordersLoading = false;
        hideLoading();
      });
  };

  const loadMenuItems = (notifySuccess = false) => {
    if (typeof db === 'undefined' || !db?.collection) {
      menuItemsListEl.innerHTML = '<p class="placeholder">Firestore não disponível.</p>';
      return Promise.resolve();
    }

    menuLoading = true;
    menuItemsListEl.innerHTML = '<p class="placeholder">Carregando itens...</p>';

    return db.collection('menuItems')
      .orderBy('name')
      .get()
      .then((snapshot) => {
        menuItemsData = [];
        snapshot.forEach((doc) => {
          menuItemsData.push({ id: doc.id, ...doc.data() });
        });
        renderMenuItems();
        if (notifySuccess) notify('Cardápio atualizado.');
      })
      .catch((err) => {
        console.error('Erro ao carregar cardápio:', err);
        menuItemsListEl.innerHTML = '<p class="placeholder">Não foi possível carregar o cardápio.</p>';
      })
      .finally(() => {
        menuLoading = false;
      });
  };

  const toggleMenuItem = (item) => {
    if (!item?.id || typeof db === 'undefined' || !db?.collection) {
      notify('Ação indisponível.', 'error');
      return;
    }

    const nextState = item.isActive === false;
    db.collection('menuItems')
      .doc(item.id)
      .update({
        isActive: nextState,
        updatedAt: typeof firebase !== 'undefined' && firebase?.firestore
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
      })
      .then(() => {
        notify(`Item ${nextState ? 'reativado' : 'desativado'}.`);
        item.isActive = nextState;
        const idx = menuItemsData.findIndex((entry) => entry.id === item.id);
        if (idx >= 0) menuItemsData[idx].isActive = nextState;
        renderMenuItems();
      })
      .catch((err) => {
        console.error('Erro ao atualizar item do cardápio:', err);
        notify('Não foi possível atualizar este item.', 'error');
      });
  };

  const uploadMenuImage = (file) => {
    if (!file || typeof firebase === 'undefined' || !firebase?.storage) {
      return Promise.resolve(null);
    }

    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`menu-items/${Date.now()}-${file.name}`);

    return fileRef
      .put(file)
      .then((snapshot) => snapshot.ref.getDownloadURL());
  };

  const handleNewMenuItem = async (event) => {
    event.preventDefault();
    if (!newMenuItemForm || menuLoading) return;

    const name = formFields.name.value.trim();
    const description = formFields.description.value.trim();
    const category = formFields.category.value.trim();
    const imageUrlRaw = formFields.imageUrl.value.trim();
    const imageFile = formFields.imageFile.files[0];

    if (!name || !description) {
      notify('Preencha nome e descrição do prato.', 'error');
      return;
    }

    if (typeof db === 'undefined' || !db?.collection) {
      notify('Firestore não está disponível.', 'error');
      return;
    }

    newMenuItemForm.classList.add('is-loading');

    try {
      let imageUrl = imageUrlRaw;
      if (!imageUrl && imageFile) {
        imageUrl = await uploadMenuImage(imageFile);
      }

      const payload = {
        name,
        description,
        imageUrl: imageUrl || '',
        category: category || '',
        isActive: true,
        createdBy: currentUser?.uid || null,
        createdAt: typeof firebase !== 'undefined' && firebase?.firestore
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
      };

      await db.collection('menuItems').add(payload);
      notify('Item adicionado ao cardápio.');
      newMenuItemForm.reset();
      await loadMenuItems(false);
    } catch (err) {
      console.error('Erro ao adicionar item ao cardápio:', err);
      notify('Erro ao publicar o item.', 'error');
    } finally {
      newMenuItemForm.classList.remove('is-loading');
    }
  };

  const checkAdminPrivileges = async (user) => {
    if (!user) return false;
    if (ADMIN_EMAILS.includes(user.email)) return true;
    if (typeof db === 'undefined' || !db?.collection) return false;

    try {
      const doc = await db.collection('users').doc(user.uid).get();
      return doc.exists && doc.data()?.role === 'admin';
    } catch (err) {
      console.error('Erro ao verificar privilégios de administrador:', err);
      return false;
    }
  };

  const init = async () => {
    if (typeof auth === 'undefined' || !auth?.onAuthStateChanged) {
      notify('Firebase Auth não disponível.', 'error');
      hideLoading();
      return;
    }

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        notify('Faça login para acessar o painel administrativo.', 'error');
        hideLoading();
        setTimeout(() => { window.location.href = PATH_LOGIN; }, 1800);
        return;
      }

      currentUser = user;
      isAdmin = await checkAdminPrivileges(user);

      if (!isAdmin) {
        notify('Acesso restrito. Redirecionando...', 'error');
        hideLoading();
        setTimeout(() => { window.location.href = DASHBOARD_URL; }, 1800);
        return;
      }

      hideLoading();
      loadOrders();
      loadMenuItems();

      logoutBtn?.addEventListener('click', () => {
        auth.signOut()
          .then(() => { window.location.href = PATH_LOGIN; })
          .catch(() => notify('Não foi possível encerrar a sessão.', 'error'));
      });

      statusFilterEl?.addEventListener('change', renderOrders);
      newMenuItemForm?.addEventListener('submit', handleNewMenuItem);
      refreshMenuBtn?.addEventListener('click', () => loadMenuItems(true));
    });
  };

  init();
});
