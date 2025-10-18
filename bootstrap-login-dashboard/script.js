document.addEventListener("DOMContentLoaded", function() {
    // Lógica para a tela de Login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault(); // Impede o envio real do formulário
            // Como qualquer login é aceito, apenas redirecionamos
            console.log("Login simulado com sucesso!");
            window.location.href = "dashboard.html";
        });
    }

    // Lógica para o Dashboard
    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) {
        menuToggle.addEventListener("click", function() {
            const wrapper = document.getElementById("wrapper");
            wrapper.classList.toggle("toggled");
        });
    }
});