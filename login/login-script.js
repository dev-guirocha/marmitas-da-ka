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
        inputEl.classList.add('has-error');
        inputEl.setAttribute('aria-invalid', 'true');
    };
    const clearFieldError = (inputEl) => {
        if (!inputEl) return;
        const span = document.getElementById(`${inputEl.id}-error`);
        if (span) {
            span.textContent = '';
            span.classList.remove('active');
        }
        inputEl.classList.remove('has-error');
        inputEl.removeAttribute('aria-invalid');
    };

    const sanitizePhone = (value = '') => String(value).replace(/\D/g, '').slice(0, 11);
    const formatPhone = (value = '') => {
        const digits = sanitizePhone(value);
        if (digits.length <= 10) {
            return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4})$/, (_, a, b, c) => {
                let result = '';
                if (a) result += `(${a}`;
                if (a && a.length === 2) result += ') ';
                if (b) result += b;
                if (b && b.length === 4) result += '-';
                if (c) result += c;
                return result;
            });
        }
        return digits.replace(/^(\d{0,2})(\d{0,5})(\d{0,4})$/, (_, a, b, c) => {
            let result = '';
            if (a) result += `(${a}`;
            if (a && a.length === 2) result += ') ';
            if (b) result += b;
            if (b && b.length === 5) result += '-';
            if (c) result += c;
            return result;
        });
    };

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

    const setLinkLoading = (link, isLoading, loadingText) => {
        if (!link) return;
        if (isLoading) {
            if (!link.dataset.originalText) {
                link.dataset.originalText = link.textContent;
            }
            if (loadingText) {
                link.textContent = loadingText;
            }
            link.classList.add('is-loading');
            link.setAttribute('aria-disabled', 'true');
        } else {
            link.classList.remove('is-loading');
            link.removeAttribute('aria-disabled');
            if (link.dataset.originalText) {
                link.textContent = link.dataset.originalText;
            }
        }
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
    const signInSubmitBtn = signInForm?.querySelector('button[type="submit"]');
    const signUpSubmitBtn = signUpForm?.querySelector('button[type="submit"]');

    [signInEmailEl, signInPasswordEl, signUpNameEl, signUpEmailEl, signUpPhoneEl, signUpPasswordEl]
    .filter(Boolean)
    .forEach((el) => {
        el.addEventListener('input', () => clearFieldError(el));
    });

    signUpPhoneEl?.addEventListener('input', (event) => {
        event.target.value = formatPhone(event.target.value);
    });

    signUpButton?.addEventListener('click', () => container?.classList.add('right-panel-active'));
    signInButton?.addEventListener('click', () => container?.classList.remove('right-panel-active'));

    document.querySelectorAll('.switch-button').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target === 'signup') {
                container?.classList.add('right-panel-active');
            } else {
                container?.classList.remove('right-panel-active');
            }
        });
    });

    // ===== Login com Firebase =====
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = (signInEmailEl?.value || '').trim();
            const password = signInPasswordEl?.value || '';

            clearFieldError(signInEmailEl);
            clearFieldError(signInPasswordEl);

            let hasError = false;

            if (!email) {
                showFieldError(signInEmailEl, 'Informe seu e-mail.');
                hasError = true;
            } else if (!isEmail(email)) {
                showFieldError(signInEmailEl, 'Digite um e-mail válido.');
                hasError = true;
            }

            if (!password) {
                showFieldError(signInPasswordEl, 'Informe sua senha.');
                hasError = true;
            } else if (password.length < 6) {
                showFieldError(signInPasswordEl, 'A senha deve ter pelo menos 6 caracteres.');
                hasError = true;
            }

            if (hasError) {
                showNotification('Por favor, corrija os campos destacados.', 'error');
                return;
            }

            setButtonLoading(signInSubmitBtn, true, 'Entrando...');
            let shouldUnlockButton = true;

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    shouldUnlockButton = false;
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
                })
                .finally(() => {
                    if (shouldUnlockButton) {
                        setButtonLoading(signInSubmitBtn, false);
                    }
                });
        });
    }

    const forgotPasswordLink = qs('.forgot-password-link');
    let resetInProgress = false;
    forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        if (resetInProgress) return;
        const email = (signInEmailEl?.value || '').trim();

        clearFieldError(signInEmailEl);
        if (!email) {
            showFieldError(signInEmailEl, 'Informe o e-mail cadastrado.');
            showNotification('Informe o e-mail cadastrado para recuperar a senha.', 'error');
            signInEmailEl?.focus();
            return;
        }

        if (!isEmail(email)) {
            showFieldError(signInEmailEl, 'Digite um e-mail válido.');
            showNotification('O email informado é inválido.', 'error');
            signInEmailEl?.focus();
            return;
        }

        showNotification('Enviando email de redefinição...', 'info');

        resetInProgress = true;
        setLinkLoading(forgotPasswordLink, true, 'Enviando...');

        auth.sendPasswordResetEmail(email)
            .then(() => {
                showNotification('Email de redefinição enviado com sucesso!', 'success');
            })
            .catch((error) => {
                console.error('Erro ao enviar redefinição de senha:', error.code, error.message);
                if (error.code === 'auth/user-not-found') {
                    showNotification('Não encontramos uma conta com esse email.', 'error');
                } else {
                    showNotification('Não foi possível enviar o email de redefinição.', 'error');
                }
            })
            .finally(() => {
                resetInProgress = false;
                setLinkLoading(forgotPasswordLink, false);
            });
    });

    // ===== Registo com Firebase =====
    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameVal = (signUpNameEl?.value || '').trim();
            const emailVal = (signUpEmailEl?.value || '').trim();
            const phoneVal = (signUpPhoneEl?.value || '').trim();
            const pwdVal = signUpPasswordEl?.value || '';

            clearFieldError(signUpNameEl);
            clearFieldError(signUpEmailEl);
            clearFieldError(signUpPhoneEl);
            clearFieldError(signUpPasswordEl);

            let hasError = false;
            const phoneDigits = sanitizePhone(phoneVal);
            const formattedPhone = formatPhone(phoneDigits);

            if (!nameVal) {
                showFieldError(signUpNameEl, 'Informe seu nome completo.');
                hasError = true;
            } else if (nameVal.length < 3) {
                showFieldError(signUpNameEl, 'O nome deve ter pelo menos 3 caracteres.');
                hasError = true;
            }

            if (!emailVal) {
                showFieldError(signUpEmailEl, 'Informe um e-mail.');
                hasError = true;
            } else if (!isEmail(emailVal)) {
                showFieldError(signUpEmailEl, 'Digite um e-mail válido.');
                hasError = true;
            }

            if (!phoneDigits) {
                showFieldError(signUpPhoneEl, 'Informe o seu WhatsApp com DDD.');
                hasError = true;
            } else if (phoneDigits.length < 10) {
                showFieldError(signUpPhoneEl, 'O WhatsApp deve ter DDD e número completo.');
                hasError = true;
            } else {
                if (signUpPhoneEl) signUpPhoneEl.value = formattedPhone;
            }

            if (!pwdVal) {
                showFieldError(signUpPasswordEl, 'Crie uma senha.');
                hasError = true;
            } else if (pwdVal.length < 8) {
                showFieldError(signUpPasswordEl, 'A senha deve ter pelo menos 8 caracteres.');
                hasError = true;
            }

            if (hasError) {
                showNotification('Por favor, corrija os campos destacados antes de continuar.', 'error');
                return;
            }

            setButtonLoading(signUpSubmitBtn, true, 'Criando conta...');
            let shouldUnlockButton = true;

            auth.createUserWithEmailAndPassword(emailVal, pwdVal)
                .then((userCredential) => {
                    const user = userCredential.user;
                    showNotification(`Conta para ${nameVal.split(' ')[0]} criada com sucesso!`, 'success');
                    return db.collection('users').doc(user.uid).set({
                        name: nameVal,
                        email: emailVal,
                        phone: formattedPhone,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    shouldUnlockButton = false;
                    setTimeout(() => redirect('dashboard/dashboard.html'), 1500);
                })
                .catch((error) => {
                    console.error("Erro de registo:", error.code, error.message);
                    if (error.code === 'auth/email-already-in-use') {
                        showNotification('Este email já está a ser utilizado.', 'error');
                    } else {
                        showNotification('Ocorreu um erro ao criar a conta.', 'error');
                    }
                })
                .finally(() => {
                    if (shouldUnlockButton) {
                        setButtonLoading(signUpSubmitBtn, false);
                    }
                });
        });
    }
});
