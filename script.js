document.addEventListener('DOMContentLoaded', function() {
    const WHATSAPP_NUMBER = '5579991428025';

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
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

    const getInputErrorEl = (input) => {
        if (!input?.id) return null;
        return document.getElementById(`${input.id}-error`);
    };

    const setInputError = (input, message) => {
        const errorEl = getInputErrorEl(input);
        if (errorEl) errorEl.textContent = message || '';
        if (input) {
            input.classList.add('has-error');
            input.setAttribute('aria-invalid', 'true');
        }
    };

    const clearInputError = (input) => {
        const errorEl = getInputErrorEl(input);
        if (errorEl) errorEl.textContent = '';
        if (input) {
            input.classList.remove('has-error');
            input.removeAttribute('aria-invalid');
        }
    };

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

    // Menu hamburger para mobile
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        const updateNavAccessibility = () => {
            const isActive = navLinks.classList.contains('active');
            const isMobile = window.matchMedia('(max-width: 992px)').matches;
            const ariaHidden = isMobile ? String(!isActive) : 'false';
            navLinks.setAttribute('aria-hidden', ariaHidden);

            if (!isActive) {
                hamburger.setAttribute('aria-expanded', 'false');
            }

            if (!isMobile || !isActive) {
                document.body.style.overflow = '';
            } else if (isMobile && isActive) {
                document.body.style.overflow = 'hidden';
            }
        };

        updateNavAccessibility();
        window.addEventListener('resize', updateNavAccessibility);

        hamburger.addEventListener('click', function() {
            const isActive = this.classList.toggle('active');
            navLinks.classList.toggle('active', isActive);
            const isMobile = window.matchMedia('(max-width: 992px)').matches;
            this.setAttribute('aria-expanded', String(isActive));
            navLinks.setAttribute('aria-hidden', String(isMobile ? !isActive : false));
            
            // Alternar a rolagem do body quando o menu está aberto
            document.body.style.overflow = isActive && isMobile ? 'hidden' : '';
        });
        
        // Fechar menu ao clicar em um link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                updateNavAccessibility();
                document.body.style.overflow = '';
            });
        });
    }

    // Navegação suave
    const navLinksAll = document.querySelectorAll('.nav-links a');
    
    navLinksAll.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href.startsWith('#')) {
                e.preventDefault(); 
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Formulário de contato
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        const nameInput = contactForm.querySelector('#contactName');
        const emailInput = contactForm.querySelector('#contactEmail');
        const phoneInput = contactForm.querySelector('#contactPhone');
        const messageInput = contactForm.querySelector('#contactMessage');

        phoneInput?.addEventListener('input', (event) => {
            event.target.value = formatPhone(event.target.value);
        });

        [nameInput, emailInput, phoneInput, messageInput]
            .filter(Boolean)
            .forEach((input) => {
                input.addEventListener('input', () => clearInputError(input));
            });

        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validação básica
            let isValid = true;
            const submitBtn = this.querySelector('button[type="submit"]');

            const name = nameInput?.value.trim() || '';
            const email = emailInput?.value.trim() || '';
            const phone = phoneInput?.value.trim() || '';
            const message = messageInput?.value.trim() || '';

            clearInputError(nameInput);
            clearInputError(emailInput);
            clearInputError(phoneInput);
            clearInputError(messageInput);

            if (!name) {
                setInputError(nameInput, 'Informe seu nome.');
                isValid = false;
            } else if (name.length < 3) {
                setInputError(nameInput, 'O nome deve ter pelo menos 3 caracteres.');
                isValid = false;
            }

            if (!email) {
                setInputError(emailInput, 'Informe um e-mail.');
                isValid = false;
            } else if (!emailRegex.test(email)) {
                setInputError(emailInput, 'Digite um e-mail válido.');
                isValid = false;
            }

            const phoneDigits = phone.replace(/\D/g, '');
            if (!phoneDigits) {
                setInputError(phoneInput, 'Informe seu WhatsApp.');
                isValid = false;
            } else if (phoneDigits.length < 10) {
                setInputError(phoneInput, 'Digite um WhatsApp válido com DDD.');
                isValid = false;
            }

            if (!message) {
                setInputError(messageInput, 'Escreva uma mensagem.');
                isValid = false;
            } else if (message.length < 10) {
                setInputError(messageInput, 'Conte-nos um pouco mais para podermos ajudar :)');
                isValid = false;
            }

            if (!isValid) {
                alert('Por favor, corrija os campos destacados.');
                return;
            }

            const whatsappMessage = [
                `Olá, Marmitas da Ka!`,
                ``,
                `Meu nome é ${name}.`,
                `Email: ${email}`,
                `WhatsApp: ${phone || 'Não informado'}`,
                ``,
                `Mensagem:`,
                `${message}`
            ].join('\n');

            const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
            setButtonLoading(submitBtn, true, 'Abrindo WhatsApp...');
            const windowRef = window.open(whatsappUrl, '_blank', 'noopener');
            if (!windowRef) {
                window.location.href = whatsappUrl;
            }
            this.reset();
            setTimeout(() => setButtonLoading(submitBtn, false), 800);
        });
    }

    // Animação de elementos ao rolar a página
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.pacote-card, .sobre-content, .contato-form, .contato-info');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Configurar elementos para animação
    const elementsToAnimate = document.querySelectorAll('.pacote-card, .sobre-content, .contato-form, .contato-info');
    elementsToAnimate.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Disparar animação ao carregar e ao rolar
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
});
