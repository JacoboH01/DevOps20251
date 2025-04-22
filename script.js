$(document).ready(function() {
    // LOGIN
    $("#loginForm").submit(function(e) {
        e.preventDefault();
        const email = $("#email").val();
        const password = $("#password").val();

        $.ajax({
            url: 'http://localhost:3000/api/auth/login',
            method: 'POST',
            data: { email, password },
            success: function(response) {
                localStorage.setItem('token', response.token);
                $("#error-message").addClass("hidden");
                $("button[type='submit']").html('<i class="fas fa-spinner fa-spin"></i> Redirigiendo...');
                setTimeout(() => {
                    window.location.href = "tienda.html";
                }, 1500);
            },
            error: function(xhr) {
                $("#error-message")
                    .text("⚠️ " + (xhr.responseJSON?.error || "Error al iniciar sesión"))
                    .removeClass("hidden")
                    .hide()
                    .fadeIn();
            }
        });
    });

    // Mostrar formulario de registro
    $("#showRegisterForm").click(function(e) {
        e.preventDefault();
        $("#loginForm").hide();
        $("#registerForm").fadeIn();
        $("#error-message").addClass("hidden");
    });

    // Volver al login
    $("#backToLogin").click(function(e) {
        e.preventDefault();
        $("#registerForm").hide();
        $("#loginForm").fadeIn();
    });

    // REGISTRO
    $("#registerForm").submit(function(e) {
        e.preventDefault();
        const email = $("#regEmail").val();
        const password = $("#regPassword").val();
        const confirm = $("#regConfirm").val();

        if (password !== confirm) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        $.ajax({
            url: 'http://localhost:3000/api/auth/register',
            method: 'POST',
            data: { email, password },
            success: function(response) {
                alert("Cuenta registrada con éxito. Puedes iniciar sesión.");
                $("#registerForm").hide();
                $("#loginForm").fadeIn();
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.error || "Error al registrar la cuenta");
            }
        });
    });
});
