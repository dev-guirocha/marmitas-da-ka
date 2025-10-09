document.addEventListener('DOMContentLoaded', () => {
  // ===== Helpers =====
  const qs  = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
  const saveUser = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const redirect = (url) => { window.location.href = url; };

  const showNotification = (message, type = 'success') => {
    qs('.notification')?.remove();
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;

    Object.assign(n.style, {
      position: 'fixed', top: '20px', right: '20px',
      padding: '15px 20px', borderRadius: '5px', color: '#fff',
      zIndex: '10000', opacity: '0', transform: 'translateX(100%)',
      transition: 'all .3s ease',
      backgroundColor: type === 'success' ? 'var(--primary-green, #2ecc71)'
                                          : (type === 'error' ? '#e74c3c' : '#f39c12')
    });

    document.body.appendChild(n);
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
    live.textContent = message;

    requestAnimationFrame(() => {
      n.style.opacity = '1';
      n.style.transform = 'translateX(0)';
      n.classList.add('show');
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

  // --- NOVO: LÓGICA PARA GUARDAR PACOTE ESCOLHIDO ANTES DO LOGIN ---
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get('package');
  if (selectedPackage) {
    localStorage.setItem('selectedPackage', selectedPackage);
  }
  // --- FIM DO NOVO BLOCO ---

  // ===== Elements =====
  const signUpButton  = qs('#signUp');
  const signInButton  = qs('#signIn');
  const container     = qs('#container');
  const signInForm    = qs('#signInForm');
  const signUpForm    = qs('#signUpForm');
  const passwordInput = qs('#signUpPassword');
  const strengthBar   = qs('.strength-bar');
  const strengthText  = qs('.strength-text');

  // ===== Toggle painéis =====
  signUpButton?.addEventListener('click', () => container?.classList.add('right-panel-active'));
  signInButton?.addEventListener('click', () => container?.classList.remove('right-panel-active'));

  // ===== Força da senha =====
  if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener('input', function () {
      const password = this.value ?? '';
      let strength = 0;
      let message = 'Força da senha';
      let barColor = '#eee';
      if (password.length > 0) {
        if (password.length >= 8) strength++;
        if (/\d/.test(password)) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
      }
      switch (strength) {
        case 1: message = 'Fraca'; barColor = '#e74c3c'; break;
        case 2: message = 'Moderada'; barColor = '#f39c12'; break;
        case 3: message = 'Forte'; barColor = '#2ecc71'; break;
        case 4: message = 'Muito Forte'; barColor = '#27ae60'; break;
        default: message = 'Força da senha'; barColor = '#eee';
      }
      strengthBar.style.width = (strength * 25) + '%';
      strengthBar.style.backgroundColor = barColor;
      strengthText.textContent = message;
      strengthText.style.color = barColor;
    });
  }

  // ===== Login =====
  if (signInForm) {
    signInForm.setAttribute('novalidate', 'novalidate');
    signInForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const email    = qs('input[type="email"]', signInForm)?.value.trim() || '';
      const password = qs('input[type="password"]', signInForm)?.value || '';

      if (!email || !password) {
        showNotification('Por favor, preencha todos os campos.', 'error');
        return;
      }
      if (!isEmail(email)) {
        showNotification('Informe um e-mail válido.', 'error');
        return;
      }

      const userName = email.split('@')[0] || 'Usuário';
      saveUser('loggedInUser', userName);

      showNotification(`Bem-vindo(a) de volta, ${userName}!`, 'success');
      setTimeout(() => redirect('dashboard/dashboard.html'), 1200);
    });
  }

  // ===== Cadastro =====
  if (signUpForm) {
    signUpForm.setAttribute('novalidate', 'novalidate');
    signUpForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const requiredInputs = qsa('input[required]', signUpForm);
      const inputs = requiredInputs.length ? requiredInputs : qsa('input', signUpForm);
      let isValid = true;

      inputs.forEach((input) => {
        const value = input.value?.trim();
        if (!value) {
          isValid = false;
          input.style.borderColor = 'red';
          setTimeout(() => { input.style.borderColor = ''; }, 3000);
        }
      });

      if (!isValid) {
        showNotification('Por favor, preencha todos os campos.', 'error');
        return;
      }

      const emailInput = qs('input[type="email"], input[name="email"]', signUpForm);
      if (emailInput) {
        const email = emailInput.value.trim();
        if (!isEmail(email)) {
          showNotification('Informe um e-mail válido.', 'error');
          emailInput.style.borderColor = 'red';
          setTimeout(() => { emailInput.style.borderColor = ''; }, 3000);
          return;
        }
      }

      const pwdInput = qs('input[type="password"][name="password"], input[type="password"]', signUpForm);
      const password = pwdInput?.value || '';
      if (password.length < 8) {
        showNotification('A senha deve ter pelo menos 8 caracteres.', 'error');
        pwdInput && (pwdInput.style.borderColor = 'red', setTimeout(() => { pwdInput.style.borderColor = ''; }, 3000));
        return;
      }

      const confirmInput = qs('input[name="confirmPassword"]', signUpForm);
      if (confirmInput && confirmInput.value !== password) {
        showNotification('As senhas não coincidem.', 'error');
        confirmInput.style.borderColor = 'red';
        setTimeout(() => { confirmInput.style.borderColor = ''; }, 3000);
        return;
      }

      const nameInput = qs('input[name="name"]', signUpForm);
      const userName = (nameInput?.value || '').trim() || 'Usuário';
      saveUser('loggedInUser', userName);

      showNotification(`Cadastro de ${userName} realizado com sucesso!`, 'success');
      setTimeout(() => redirect('dashboard/dashboard.html'), 1200);
    });
  }
});