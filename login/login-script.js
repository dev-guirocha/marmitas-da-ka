document.addEventListener('DOMContentLoaded', function() {
    // Esconder tela de carregamento
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1000);

    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const passwordInput = document.getElementById('signUpPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    if(signUpButton) {
        signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
    }
    
    if(signInButton) {
        signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));
    }

    // Validação de força da senha
    if (passwordInput && strengthBar && strengthText) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            let message = 'Força da senha';
            let barColor = '#eee';
            
            if (password.length > 0) {
                if (password.length >= 8) strength++;
                if (/\d/.test(password)) strength++;
                if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
                if (/[^A-Za-z0-9]/.test(password)) strength++;
            }
            
            switch(strength) {
                case 1: message = 'Fraca'; barColor = '#e74c3c'; break;
                case 2: message = 'Moderada'; barColor = '#f39c12'; break;
                case 3: message = 'Forte'; barColor = '#2ecc71'; break;
                case 4: message = 'Muito Forte'; barColor = '#27ae60'; break;
            }
            
            strengthBar.style.width = (strength * 25) + '%';
            strengthBar.style.backgroundColor = barColor;
            strengthText.textContent = message;
            strengthText.style.color = barColor;
        });
    }

    // Validação dos formulários
    if (signInForm) {
        signInForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = this.querySelector('input[type="email"]').value;
            const password = this.querySelector('input[type="password"]').value;
            
            if (!email || !password) {
                showNotification('Por favor, preencha todos os campos.', 'error');
                return;
            }
            
            showNotification('Login realizado com sucesso!', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard/dashboard.html';
            }, 1500);
        });
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const inputs = this.querySelectorAll('input');
            let isValid = true;
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = 'red';
                    setTimeout(() => { input.style.borderColor = ''; }, 3000);
                }
            });
            
            if (!isValid) {
                showNotification('Por favor, preencha todos os campos.', 'error');
                return;
            }
            
            const password = this.querySelector('input[type="password"]').value;
            if (password.length < 8) {
                showNotification('A senha deve ter pelo menos 8 caracteres.', 'error');
                return;
            }
            
            showNotification('Cadastro realizado com sucesso!', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard/dashboard.html';
            }, 1500);
        });
    }

    // Função para mostrar notificações
    function showNotification(message, type) {
        document.querySelector('.notification')?.remove();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '15px 20px',
            borderRadius: '5px', color: 'white', zIndex: '10000', opacity: '0',
            transform: 'translateX(100%)', transition: 'all 0.3s ease'
        });
        
        const colors = { success: 'var(--primary-green)', error: '#e74c3c' };
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