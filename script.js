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

    // Menu hamburger para mobile
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            
            // Alternar a rolagem do body quando o menu está aberto
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });
        
        // Fechar menu ao clicar em um link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
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
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validação básica
            let isValid = true;
            const inputs = this.querySelectorAll('input, textarea');
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = 'red';
                    
                    // Remover o estilo de erro após um tempo
                    setTimeout(() => {
                        input.style.borderColor = '#ccc';
                    }, 3000);
                }
            });
            
            if (!isValid) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            
            // Simular envio do formulário
            const nameInput = this.querySelector('input[name="name"]');
            if (nameInput) {
                const name = nameInput.value;
                alert(`Obrigado por sua mensagem, ${name}! Entraremos em contato em breve.`);
            }

            this.reset();
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