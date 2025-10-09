document.addEventListener('DOMContentLoaded', () => {
    // ===== Helpers =====
    const qs = (sel, el = document) => el.querySelector(sel);
    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
    const redirect = (url) => { window.location.href = url; };

    // Funções para mostrar/limpar erros e notificações
    const showFieldError = (inputEl, message) => {
        if (!inputEl) return;
        const span = document.getElementById(`${inputEl.id}-error`);
        if (span) {
            span.textContent = message || '';
            span.classList.add('active');
        }
        inputEl.style.borderColor = 'red';
    };
    const clearFieldError = (inputEl) => {
        if (!inputEl) return;
        const span = document.getElementById(`${inputEl.id}-error`);
        if (span) {
            span.textContent = '';
            span.classList.remove('active');
        }
        inputEl.style.borderColor = '';
    };

    const showNotification = (message, type = 'success') => {
        qs('.notification')?.remove();
        const n = document.createElement('div');
        n.className = `notification ${type}`;
        n.textContent = message;
        Object.assign(n.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '15px 20px',
            borderRadius: '5px', color: '#fff', zIndex: '10000', opacity: '0',
            transform: 'translateX(100%)', transition: 'all .3s ease',
            backgroundColor: type === 'success' ? 'var(--primary-green, #2ecc71)' : (type === 'error' ? '#e74c3c' : '#f39c12')
        });
        document.body.appendChild(n);
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

    // ===== Lógica da Página =====
    const urlParams = new URLSearchParams(window.location.search);
    const selectedPackage = urlParams.get('package');
    if (selectedPackage) {
        try { localStorage.setItem('selectedPackage', selectedPackage); } catch (_) {}
    }

    const signUpButton = qs('#signUp');
    const signInButton = qs('#signIn');
    const container = qs('#container');
    const signInForm = qs('#signInForm');
    const signUpForm = qs('#signUpForm');

    const signInEmailEl = qs('#signInEmail', signInForm);
    const signInPasswordEl = qs('#signInPassword', signInForm);
    const signUpNameEl = qs('#signUpName', signUpForm);
    const signUpEmailEl = qs('#signUpEmail', signUpForm);
    const signUpPhoneEl = qs('#signUpPhone', signUpForm);
    const signUpPasswordEl = qs('#signUpPassword', signUpForm);

    [signInEmailEl, signInPasswordEl, signUpNameEl, signUpEmailEl, signUpPhoneEl, signUpPasswordEl]
    .filter(Boolean)
    .forEach((el) => {
        el.addEventListener('input', () => clearFieldError(el));
    });

    signUpButton?.addEventListener('click', () => container?.classList.add('right-panel-active'));
    signInButton?.addEventListener('click', () => container?.classList.remove('right-panel-active'));

    // ===== Login com Firebase =====
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = (signInEmailEl?.value || '').trim();
            const password = signInPasswordEl?.value || '';

            if (!email || !password) {
                showNotification('Por favor, preencha todos os campos.', 'error');
                return;
            }

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    showNotification(`Bem-vindo(a) de volta!`, 'success');
                    setTimeout(() => redirect('dashboard/dashboard.html'), 1500);
                })
                .catch((error) => {
                    console.error("Erro de login:", error.code, error.message);
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                        showNotification('Email ou senha inválidos.', 'error');
                    } else {
                        showNotification('Ocorreu um erro ao tentar fazer login.', 'error');
                    }
                });
        });
    }

    // ===== Registo com Firebase =====
    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameVal = (signUpNameEl?.value || '').trim();
            const emailVal = (signUpEmailEl?.value || '').trim();
            const phoneVal = (signUpPhoneEl?.value || '').trim();
            const pwdVal = signUpPasswordEl?.value || '';

            if (!nameVal || !emailVal || !phoneVal || !pwdVal || pwdVal.length < 8) {
                if(pwdVal.length < 8) showNotification('A senha deve ter pelo menos 8 caracteres.', 'error');
                else showNotification('Por favor, preencha todos os campos.', 'error');
                return;
            }

            auth.createUserWithEmailAndPassword(emailVal, pwdVal)
                .then((userCredential) => {
                    const user = userCredential.user;
                    showNotification(`Conta para ${nameVal.split(' ')[0]} criada com sucesso!`, 'success');
                    return db.collection('users').doc(user.uid).set({
                        name: nameVal,
                        email: emailVal,
                        phone: phoneVal,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    setTimeout(() => redirect('dashboard/dashboard.html'), 1500);
                })
                .catch((error) => {
                    console.error("Erro de registo:", error.code, error.message);
                    if (error.code === 'auth/email-already-in-use') {
                        showNotification('Este email já está a ser utilizado.', 'error');
                    } else {
                        showNotification('Ocorreu um erro ao criar a conta.', 'error');
                    }
                });
        });
    }
});