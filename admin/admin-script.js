document.addEventListener('DOMContentLoaded', () => {
  // Configurações
  const PATH_LOGIN = '../login/login.html';
  const DASHBOARD_URL = '../login/dashboard/dashboard.html';
  const ADMIN_EMAILS = ['karinekawai@hotmail.com', 'guiccpa@gmail.com', 'guntato@marmitasdaka.com.br']; // ✅ ADICIONE SEUS EMAILS
  const BUSINESS_WHATSAPP = '5579991428025';

  // ✅ Inicializar Firebase
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Elementos base
  const loadingScreen = document.getElementById('loadingScreen');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  // Pedidos
  const ordersListEl = document.getElementById('ordersList');
  const statusFilterEl = document.getElementById('statusFilter');
  const orderTemplate = document.getElementById('orderTemplate');

  // Cardápio
  const menuItemsListEl = document.getElementById('menuItemsList');
  const refreshMenuBtn = document.getElementById('refreshMenuBtn');
  const newMenuItemForm = document.getElementById('newMenuItemForm');
  const menuTemplate = document.getElementById('menuItemTemplate');
  const fileInput = document.getElementById('itemImage');
  const fileChosenSpan = document.getElementById('file-chosen');
  const submitBtn = newMenuItemForm?.querySelector('button[type="submit"]');

  const PAYMENT_STATES = {
    pending: { label: 'Pendente', className: 'pending' },
    paid: { label: 'Pago', className: 'paid' },
    cancelled: { label: 'Cancelado', className: 'cancelled' },
  };

  let currentUser = null;
  let ordersData = [];
  let menuItemsData = [];

  // ==============================================
  // CORREÇÃO DO BUG - LIMPEZA DE ELEMENTOS PROBLEMÁTICOS
  // ==============================================

  const cleanProblematicElements = () => {
    // Remover elementos com datas específicas
    document.querySelectorAll('*').forEach(element => {
      const text = element.textContent || '';
      if (text.includes('12/10/2025') || text.includes('13:10:21')) {
        element.remove();
      }
    });

    // Remover tooltips/avisos problemáticos
    const problematicSelectors = [
      '[class*="tooltip"]',
      '[class*="hover"]',
      '[class*="bubble"]',
      '[class*="popup"]',
      '[class*="notification"]:not(.notification)'
    ];

    problematicSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (!element.closest('.order-card') && !element.classList.contains('notification')) {
          element.remove();
        }
      });
    });
  };

  // ==============================================
  // AUTH - VERSÃO CORRIGIDA (SEM FIRESTORE)
  // ==============================================

  const checkAdminPrivileges = async (user) => {
      if (!user) {
          console.log('❌ Usuário não autenticado');
          return false;
      }
      
      console.log('🔐 Verificando admin para:', user.email);
      
      // ✅ VERIFICAÇÃO APENAS POR EMAIL - SEM FIRESTORE (evita erro CORS)
      const isAdmin = ADMIN_EMAILS.includes(user.email);
      
      if (isAdmin) {
          console.log('✅ ACESSO PERMITIDO - Email administrador');
          return true;
      } else {
          console.log('❌ ACESSO NEGADO - Email não é administrador');
          console.log('💡 Emails permitidos:', ADMIN_EMAILS);
          return false;
      }
  };

  // ==============================================
  // UTILS
  // ==============================================

  const showNotification = (message, type = 'success') => {
    document.querySelector('.notification')?.remove();
    
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const text = document.createElement('span');
    text.className = 'notification__text';
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'notification__close';
    closeBtn.setAttribute('aria-label', 'Fechar aviso');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(text);
    toast.appendChild(closeBtn);
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 6000);
  };

  const hideLoading = () => {
    if (!loadingScreen) return;
    loadingScreen.style.opacity = '0';
    setTimeout(() => { 
      loadingScreen.style.display = 'none'; 
    }, 400);
  };

  const sanitizePhone = (phone) => {
    const cleaned = String(phone || '').replace(/\D/g, '');
    return cleaned || BUSINESS_WHATSAPP;
  };

  const formatDateTime = (order) => {
    try {
      if (order?.createdAtServer?.toDate) {
        return order.createdAtServer.toDate().toLocaleString('pt-BR');
      }
      if (order?.createdAtISO) {
        return new Date(order.createdAtISO).toLocaleString('pt-BR');
      }
      if (order?.createdAt?.toDate) {
        return order.createdAt.toDate().toLocaleString('pt-BR');
      }
    } catch (error) {
      console.warn('Erro ao formatar data:', error);
    }
    return '—';
  };

  const getPaymentMeta = (state) => {
    return PAYMENT_STATES[state] || PAYMENT_STATES.pending;
  };

  const updatePaymentButton = (indicatorEl, textEl, state) => {
    const meta = getPaymentMeta(state);
    indicatorEl.className = `payment-indicator ${meta.className}`;
    textEl.textContent = meta.label;
  };

  const setFormLoading = (isLoading) => {
    if (!submitBtn) return;
    const text = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.btn-spinner');
    
    submitBtn.disabled = isLoading;
    text?.classList.toggle('hidden', isLoading);
    spinner?.classList.toggle('hidden', !isLoading);
  };

  const buildWhatsAppMessage = (order) => {
    const cart = order.cart || {};
    const customer = order.customer || {};
    const address = order.address || {};
    const delivery = order.delivery || {};

    const itemsLines = (cart.items || []).map((item) => 
      `- ${item.quantity || 0}x ${item.name || ''}`
    );

    return [
      `Olá, ${customer.name || 'cliente'}!`,
      '',
      `*Pedido #${String(order.id).slice(0, 7)}*`,
      `*${cart.packageName || 'Pacote selecionado'}*:`,
      ...(itemsLines.length ? itemsLines : ['- Nenhuma marmita selecionada.']),
      '',
      `*Endereço de entrega:*`,
      `${address.endereco || ''}, ${address.numero || ''}`,
      `${address.bairro || ''} - CEP ${address.cep || ''}`,
      delivery.slotLabel ? `*Horário:* ${delivery.slotLabel}` : '',
      delivery.scheduledDate ? `*Data prevista:* ${delivery.scheduledDate}` : '',
      '',
      `*Pagamento:* ${order.payment?.label || 'A combinar'}`,
      `*Status:* ${getPaymentMeta(order.paymentStatus).label}`,
      `*Valor total:* R$ ${Number(cart.totalPrice || 0).toFixed(2).replace('.', ',')}`,
      '',
      '*Contato do cliente:*',
      customer.email ? `- Email: ${customer.email}` : '',
      customer.phone ? `- Telefone: ${customer.phone}` : '',
      '',
      '_Marmitas da Ka - Comida saudável com amor 💚_'
    ].filter(Boolean).join('\n');
  };

  // ==============================================
  // ORDERS
  // ==============================================

  const loadOrders = async () => {
    if (!ordersListEl) return;
    
    ordersListEl.innerHTML = '<p class="placeholder">Carregando pedidos...</p>';
    
    try {
      let snapshot;
      
      try {
        snapshot = await db.collection('orders')
          .orderBy('createdAtISO', 'desc')
          .get();
      } catch (err) {
        console.warn('Falha ao ordenar por createdAtISO, tentando createdAtServer...');
        snapshot = await db.collection('orders')
          .orderBy('createdAtServer', 'desc')
          .get();
      }
      
      ordersData = snapshot.docs.map((doc) => {
        const data = doc.data() || {};
        return { 
          id: doc.id, 
          ...data,
          paymentStatus: data.paymentStatus || 'pending',
          status: data.status || 'pendente'
        };
      });
      
      renderOrders();
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      ordersListEl.innerHTML = '<p class="placeholder">Falha ao carregar pedidos.</p>';
      showNotification('Erro ao carregar pedidos.', 'error');
    }
  };

  const renderOrders = () => {
    if (!ordersListEl) return;
    
    const filter = statusFilterEl?.value || 'todos';
    const filtered = filter === 'todos'
      ? ordersData
      : ordersData.filter((order) => (order.status || 'pendente') === filter);

    if (!filtered.length) {
      ordersListEl.innerHTML = '<p class="placeholder">Nenhum pedido encontrado.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach((order) => {
      const tpl = orderTemplate.content.cloneNode(true);
      const card = tpl.querySelector('.order-card');
      card.dataset.status = order.status || 'pendente';

      const cart = order.cart || {};
      const customer = order.customer || {};
      const address = order.address || {};
      const delivery = order.delivery || {};
      const paymentStatus = order.paymentStatus || 'pending';

      // Preencher dados básicos
      tpl.querySelector('.order-id').textContent = `Pedido #${String(order.id).slice(0, 7)}`;
      tpl.querySelector('.order-date').textContent = formatDateTime(order);
      tpl.querySelector('.order-package').textContent = cart.packageName || '—';
      tpl.querySelector('.order-total').textContent = `Total: R$ ${Number(cart.totalPrice || 0).toFixed(2).replace('.', ',')}`;
      tpl.querySelector('.order-customer').textContent = customer.name || 'Cliente';
      tpl.querySelector('.order-contact').textContent = `${customer.phone || '—'} | ${customer.email || '—'}`;
      tpl.querySelector('.order-address').textContent = `${address.endereco || ''}, ${address.numero || ''} - ${address.bairro || ''}`.trim();
      tpl.querySelector('.order-schedule').textContent = delivery.slotLabel || 'Horário a combinar';

      // Lista de itens
      const itemsList = tpl.querySelector('.order-items');
      itemsList.innerHTML = '';
      (cart.items || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `${item.quantity || 0}x ${item.name || ''}`;
        itemsList.appendChild(li);
      });

      // Select de status
      const statusSelect = tpl.querySelector('.order-status');
      const statusOptions = ['pendente', 'confirmado', 'em_preparo', 'enviado', 'entregue', 'cancelado'];
      
      statusOptions.forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());
        if (status === (order.status || 'pendente')) {
          option.selected = true;
        }
        statusSelect.appendChild(option);
      });
      
      statusSelect.dataset.status = statusSelect.value;
      statusSelect.addEventListener('change', (event) => 
        updateOrderStatus(order, event.target, card)
      );

      // Status de pagamento
      const paymentBtn = tpl.querySelector('.payment-status-btn');
      const indicator = tpl.querySelector('.payment-indicator');
      const paymentText = tpl.querySelector('.payment-text');
      
      updatePaymentButton(indicator, paymentText, paymentStatus);
      paymentBtn.addEventListener('click', () => 
        cyclePaymentStatus(order, indicator, paymentText)
      );

      // Botão WhatsApp
      const whatsappBtn = tpl.querySelector('.whatsapp-btn');
      const phone = sanitizePhone(customer.phone);
      const message = encodeURIComponent(buildWhatsAppMessage(order));
      whatsappBtn.href = `https://wa.me/${phone}?text=${message}`;
      whatsappBtn.title = 'Abrir conversa no WhatsApp';

      fragment.appendChild(tpl);
    });

    ordersListEl.innerHTML = '';
    ordersListEl.appendChild(fragment);

    setTimeout(cleanProblematicElements, 100);
  };

  const updateOrderStatus = async (order, selectEl, cardEl) => {
    const newStatus = selectEl.value;
    const previousStatus = order.status || 'pendente';
    
    selectEl.dataset.status = newStatus;
    selectEl.disabled = true;
    
    try {
      await db.collection('orders').doc(String(order.id)).update({ 
        status: newStatus,
        statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      order.status = newStatus;
      if (cardEl) cardEl.dataset.status = newStatus;
      showNotification('Status do pedido atualizado com sucesso.', 'success');
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      selectEl.value = previousStatus;
      selectEl.dataset.status = previousStatus;
      order.status = previousStatus;
      showNotification('Não foi possível atualizar o status.', 'error');
    } finally {
      selectEl.disabled = false;
    }
  };

  const cyclePaymentStatus = async (order, indicatorEl, textEl) => {
    const orderRef = db.collection('orders').doc(String(order.id));
    const current = order.paymentStatus || 'pending';
    const next = current === 'pending' ? 'paid' : current === 'paid' ? 'cancelled' : 'pending';
    
    try {
      await orderRef.update({
        paymentStatus: next,
        paymentStatusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      
      order.paymentStatus = next;
      updatePaymentButton(indicatorEl, textEl, next);
      showNotification(`Pagamento marcado como ${getPaymentMeta(next).label.toLowerCase()}.`);
    } catch (err) {
      console.error('Erro ao atualizar pagamento:', err);
      showNotification('Não foi possível atualizar o status de pagamento.', 'error');
    }
  };

  // ==============================================
  // MENU
  // ==============================================

  const loadMenuItems = async (notifySuccess = false) => {
    if (!menuItemsListEl) return;
    
    menuItemsListEl.innerHTML = '<p class="placeholder">Carregando itens do cardápio...</p>';
    
    try {
      const snapshot = await db.collection('menuItems').orderBy('name').get();
      menuItemsData = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      renderMenuItems();
      
      if (notifySuccess) {
        showNotification('Cardápio atualizado com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao carregar cardápio:', err);
      menuItemsListEl.innerHTML = '<p class="placeholder">Falha ao carregar itens do cardápio.</p>';
      showNotification('Erro ao carregar cardápio.', 'error');
    }
  };

  const renderMenuItems = () => {
    if (!menuItemsListEl) return;
    
    if (!menuItemsData.length) {
      menuItemsListEl.innerHTML = '<p class="placeholder">Nenhum item cadastrado.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    
    menuItemsData.forEach((item) => {
      const tpl = menuTemplate.content.cloneNode(true);
      const card = tpl.querySelector('.menu-card');
      const title = tpl.querySelector('.menu-card__title');
      const image = tpl.querySelector('.menu-card__image');
      const toggleBtn = tpl.querySelector('.toggle-active-btn');
      const deleteBtn = tpl.querySelector('.delete-btn');

      card.dataset.id = item.id;
      card.dataset.active = item.isActive === false ? 'false' : 'true';
      
      image.src = item.imageUrl || 'https://via.placeholder.com/360x220/4CAF50/white?text=Marmita';
      image.alt = item.name || 'Item do cardápio';
      title.textContent = item.name || 'Novo prato';

      toggleBtn.innerHTML = item.isActive === false
        ? '<i class="fas fa-eye"></i>'
        : '<i class="fas fa-eye-slash"></i>';
      toggleBtn.title = item.isActive === false ? 'Reativar item' : 'Desativar item';
      toggleBtn.classList.add(item.isActive === false ? 'inactive' : 'active');
      toggleBtn.addEventListener('click', () => toggleMenuItem(item));

      deleteBtn.addEventListener('click', () => deleteMenuItem(item));

      fragment.appendChild(tpl);
    });

    menuItemsListEl.innerHTML = '';
    menuItemsListEl.appendChild(fragment);
  };

  const toggleMenuItem = async (item) => {
    try {
      const nextState = item.isActive === false ? true : false;
      
      await db.collection('menuItems')
        .doc(String(item.id))
        .update({ 
          isActive: nextState,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      item.isActive = nextState;
      renderMenuItems();
      
      showNotification(
        nextState ? 'Item ativado no cardápio.' : 'Item desativado do cardápio.'
      );
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
      showNotification('Não foi possível atualizar o item.', 'error');
    }
  };

  const deleteMenuItem = async (item) => {
    const confirmed = confirm(
      `Tem certeza que deseja remover "${item.name}" do cardápio?\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;
    
    try {
      await db.collection('menuItems').doc(String(item.id)).delete();
      
      menuItemsData = menuItemsData.filter((entry) => entry.id !== item.id);
      renderMenuItems();
      
      showNotification('Item removido do cardápio com sucesso.');
    } catch (err) {
      console.error('Erro ao remover item:', err);
      showNotification('Não foi possível remover o item.', 'error');
    }
  };

  const handleNewMenuItem = async (event) => {
    event.preventDefault();
    if (!newMenuItemForm) return;

    const name = newMenuItemForm.itemName.value.trim();
    const description = newMenuItemForm.itemDescription.value.trim();
    const imageFile = newMenuItemForm.itemImage.files[0];

    if (!name || !description) {
      showNotification('Por favor, preencha o nome e a descrição do prato.', 'error');
      return;
    }

    if (name.length < 3) {
      showNotification('O nome do prato deve ter pelo menos 3 caracteres.', 'error');
      return;
    }

    setFormLoading(true);

    try {
      let imageUrl = '';
      
      if (imageFile) {
        if (!imageFile.type.startsWith('image/')) {
          throw new Error('Por favor, selecione um arquivo de imagem válido.');
        }

        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error('A imagem deve ter no máximo 5MB.');
        }

        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`menu-items/${Date.now()}-${imageFile.name}`);
        const snapshot = await fileRef.put(imageFile);
        imageUrl = await snapshot.ref.getDownloadURL();
      }

      await db.collection('menuItems').add({
        name,
        description,
        imageUrl,
        isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      newMenuItemForm.reset();
      if (fileChosenSpan) fileChosenSpan.textContent = 'Escolher ficheiro...';
      
      showNotification('Item adicionado ao cardápio com sucesso!');
      
      await loadMenuItems();
      
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      showNotification(
        err.message || 'Não foi possível adicionar o item ao cardápio.', 
        'error'
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ==============================================
  // INIT
  // ==============================================

  const initializePanel = () => {
    console.log('🚀 Inicializando painel administrativo...');
    
    hideLoading();
    cleanProblematicElements();
    
    loadOrders();
    loadMenuItems();

    logoutBtn?.addEventListener('click', () => {
      const confirmed = confirm('Deseja realmente sair do painel administrativo?');
      if (confirmed) {
        auth.signOut().then(() => {
          window.location.href = PATH_LOGIN;
        });
      }
    });
    
    statusFilterEl?.addEventListener('change', renderOrders);
    newMenuItemForm?.addEventListener('submit', handleNewMenuItem);
    refreshMenuBtn?.addEventListener('click', () => loadMenuItems(true));
    
    fileInput?.addEventListener('change', () => {
      if (!fileChosenSpan) return;
      const file = fileInput.files?.[0];
      fileChosenSpan.textContent = file?.name || 'Escolher ficheiro...';
    });

    // Limpeza contínua
    setInterval(cleanProblematicElements, 3000);
  };

  // ==============================================
  // AUTH LISTENER PRINCIPAL
  // ==============================================

  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    console.log('🔐 Estado de autenticação:', user ? `Usuário: ${user.email}` : 'Nenhum usuário');
    
    if (!user) {
      window.location.href = PATH_LOGIN;
      return;
    }

    try {
      const allowed = await checkAdminPrivileges(user);
      
      if (!allowed) {
        alert('Acesso negado. Você não tem permissões de administrador.');
        window.location.href = DASHBOARD_URL;
        return;
      }

      currentUser = user;
      initializePanel();
      
    } catch (error) {
      console.error('🚨 Erro na verificação:', error);
      alert('Erro ao verificar permissões. Tente novamente.');
      window.location.href = PATH_LOGIN;
    }
  });

  window.addEventListener('beforeunload', () => {
    unsubscribe();
  });
});