document.addEventListener('DOMContentLoaded', () => {
  // ===== Helpers =====
  const qs  = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
  const saveUser = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const redirect = (url) => { window.location.href = url; };

  // Erros por campo
  const showFieldError = (inputEl, message) => {
    if (!inputEl) return;
    const span = document.getElementById(`${inputEl.id}-error`);
    if (span) {
      span.textContent = message || '';
      span.classList.add('active');
    }
    inputEl.setAttribute('aria-invalid', 'true');
    inputEl.style.borderColor = 'red';
  };
  const clearFieldError = (inputEl) => {
    if (!inputEl) return;
    const span = document.getElementById(`${inputEl.id}-error`);
    if (span) {
      span.textContent = '';
      span.classList.remove('active');
    }
    inputEl.removeAttribute('aria-invalid');
    inputEl.style.borderColor = '';
  };

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

  // --- NOVO: GUARDAR PACOTE PRÉ-SELECIONADO ANTES DO LOGIN ---
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPackage = urlParams.get('package');
  if (selectedPackage) {
    try { localStorage.setItem('selectedPackage', selectedPackage); } catch (_) {}
  }
  // --- FIM DO BLOCO ---

  // ===== Elements =====
  const signUpButton  = qs('#signUp');
  const signInButton  = qs('#signIn');
  const container     = qs('#container');
  const signInForm    = qs('#signInForm');
  const signUpForm    = qs('#signUpForm');
  const passwordInput = qs('#signUpPassword');
  const strengthBar   = qs('.strength-bar');
  const strengthText  = qs('.strength-text');

  // Inputs por ID (para mensagens por campo)
  const signInEmailEl    = qs('#signInEmail') || qs('#signin-email') || qs('input[type="email"]', signInForm);
  const signInPasswordEl = qs('#signInPassword') || qs('#signin-password') || qs('input[type="password"]', signInForm);
  const signUpNameEl     = qs('#signUpName') || qs('input[name="name"]', signUpForm);
  const signUpEmailEl    = qs('#signUpEmail') || qs('input[name="email"]', signUpForm);
  const signUpPasswordEl = passwordInput || qs('input[name="password"]', signUpForm);
  const signUpConfirmEl  = qs('#signUpConfirm') || qs('input[name="confirmPassword"]', signUpForm);

  // Limpa erro ao digitar
  [signInEmailEl, signInPasswordEl, signUpNameEl, signUpEmailEl, signUpPasswordEl, signUpConfirmEl]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener('input', () => clearFieldError(el));
      el.addEventListener('blur',  () => {
        // validações rápidas por campo (inline)
        if (el === signInEmailEl || el === signUpEmailEl) {
          if (el.value && !isEmail(el.value)) showFieldError(el, 'Insira um e-mail válido.');
        }
        if (el === signUpPasswordEl && el.value && el.value.length < 8) {
          showFieldError(el, 'A senha deve ter pelo menos 8 caracteres.');
        }
        if (el === signUpConfirmEl && signUpPasswordEl) {
          if (el.value && el.value !== signUpPasswordEl.value) {
            showFieldError(el, 'As senhas não coincidem.');
          }
        }
      });
    });

  // ===== Toggle painéis =====
  signUpButton?.addEventListener('click', () => container?.classList.add('right-panel-active'));
  signInButton?.addEventListener('click', () => container?.classList.remove('right-panel-active'));

  // ===== Força da senha =====
  if (signUpPasswordEl && strengthBar && strengthText) {
    signUpPasswordEl.addEventListener('input', function () {
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
        case 1: message = 'Fraca';        barColor = '#e74c3c'; break;
        case 2: message = 'Moderada';     barColor = '#f39c12'; break;
        case 3: message = 'Forte';        barColor = '#2ecc71'; break;
        case 4: message = 'Muito Forte';  barColor = '#27ae60'; break;
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

      // limpa erros prévios
      clearFieldError(signInEmailEl);
      clearFieldError(signInPasswordEl);

      const email    = (signInEmailEl?.value || '').trim();
      const password = signInPasswordEl?.value || '';

      let valid = true;

      if (!email) {
        showFieldError(signInEmailEl, 'Este campo é obrigatório.');
        valid = false;
      } else if (!isEmail(email)) {
        showFieldError(signInEmailEl, 'Insira um e-mail válido.');
        valid = false;
      }

      if (!password) {
        showFieldError(signInPasswordEl, 'Este campo é obrigatório.');
        valid = false;
      } else if (password.length < 8) {
        // opcionalmente aplique a mesma regra de 8 caracteres no login
        showFieldError(signInPasswordEl, 'A senha deve ter pelo menos 8 caracteres.');
        valid = false;
      }

      if (!valid) {
        showNotification('Por favor, corrija os campos destacados.', 'error');
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

      // limpa erros prévios
      [signUpNameEl, signUpEmailEl, signUpPasswordEl, signUpConfirmEl].forEach(clearFieldError);

      const nameVal  = (signUpNameEl?.value || '').trim();
      const emailVal = (signUpEmailEl?.value || '').trim();
      const pwdVal   = signUpPasswordEl?.value || '';
      const confVal  = signUpConfirmEl?.value || '';

      let valid = true;

      if (signUpNameEl && !nameVal) {
        showFieldError(signUpNameEl, 'Este campo é obrigatório.');
        valid = false;
      }

      if (signUpEmailEl && !emailVal) {
        showFieldError(signUpEmailEl, 'Este campo é obrigatório.');
        valid = false;
      } else if (signUpEmailEl && !isEmail(emailVal)) {
        showFieldError(signUpEmailEl, 'Insira um e-mail válido.');
        valid = false;
      }

      if (signUpPasswordEl && !pwdVal) {
        showFieldError(signUpPasswordEl, 'Este campo é obrigatório.');
        valid = false;
      } else if (signUpPasswordEl && pwdVal.length < 8) {
        showFieldError(signUpPasswordEl, 'A senha deve ter pelo menos 8 caracteres.');
        valid = false;
      }

      if (signUpConfirmEl && !confVal) {
        showFieldError(signUpConfirmEl, 'Confirme a sua senha.');
        valid = false;
      } else if (signUpConfirmEl && confVal !== pwdVal) {
        showFieldError(signUpConfirmEl, 'As senhas não coincidem.');
        valid = false;
      }

      if (!valid) {
        showNotification('Por favor, corrija os campos destacados.', 'error');
        return;
      }

      const userName = nameVal || (emailVal.split('@')[0]) || 'Usuário';
      saveUser('loggedInUser', userName);

      showNotification(`Cadastro de ${userName} realizado com sucesso!`, 'success');
      setTimeout(() => redirect('dashboard/dashboard.html'), 1200);
    });
  }
});