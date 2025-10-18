document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede o envio padrão do formulário

        // Aqui você pode adicionar validações de login e senha, se necessário

        // Redireciona para o painel de controle
        window.location.href = 'dashboard.html';
    });
});