/* =============================================
   PLAIN — Login Page Scripts
   script.js
   ============================================= */

(function () {
  'use strict';

  /* ---- DOM References ---- */
  const form         = document.getElementById('loginForm');
  const emailInput   = document.getElementById('email');
  const passwordInput= document.getElementById('password');
  const cnpjInput    = document.getElementById('cnpj');
  const cnpjGroup    = document.getElementById('cnpjGroup');
  const submitBtn    = document.getElementById('submitBtn');
  const spinner      = document.getElementById('spinner');
  const btnText      = submitBtn.querySelector('.btn-primary__text');
  const toggleEye    = document.getElementById('togglePassword');
  const eyeIcon      = document.getElementById('eyeIcon');
  const toast        = document.getElementById('toast');
  const tabs         = document.querySelectorAll('.tab');

  /* ---- State ---- */
  let activeTab = 'empresa';
  let toastTimer = null;

  /* =============================================
     TABS
     ============================================= */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab--active'));
      tab.classList.add('tab--active');
      activeTab = tab.dataset.tab;

      /* Show CNPJ field only for "empresa" tab */
      if (activeTab === 'empresa') {
        cnpjGroup.style.display = 'block';
        emailInput.placeholder = 'E-mail corporativo';
      } else {
        cnpjGroup.style.display = 'none';
        cnpjInput.value = '';
        clearError(cnpjInput, 'cnpjError');
        emailInput.placeholder = 'Seu e-mail';
      }

      clearAllErrors();
    });
  });

  /* =============================================
     CNPJ MASK  →  00.000.000/0000-00
     ============================================= */
  cnpjInput.addEventListener('input', () => {
    let v = cnpjInput.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
    else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
    cnpjInput.value = v;
  });

  /* =============================================
     PASSWORD TOGGLE
     ============================================= */
  toggleEye.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    /* Swap SVG icon */
    eyeIcon.innerHTML = isPassword
      ? /* eye-off */
        '<path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>' +
        '<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>' +
        '<line x1="1" y1="1" x2="23" y2="23"/>'
      : /* eye */
        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
        '<circle cx="12" cy="12" r="3"/>';
  });

  /* =============================================
     VALIDATION HELPERS
     ============================================= */
  function showError(input, errorId, message) {
    input.classList.add('form__input--error');
    document.getElementById(errorId).textContent = message;
  }

  function clearError(input, errorId) {
    input.classList.remove('form__input--error');
    document.getElementById(errorId).textContent = '';
  }

  function clearAllErrors() {
    clearError(emailInput,    'emailError');
    clearError(passwordInput, 'passwordError');
    clearError(cnpjInput,     'cnpjError');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function isValidCNPJ(cnpj) {
    /* Strip formatting */
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return false;
    if (/^(\d)\1+$/.test(digits)) return false; /* all same digit */

    /* Validation algorithm */
    const calc = (d, n) => {
      let sum = 0, pos = n - 7;
      for (let i = n; i >= 1; i--) {
        sum += parseInt(d.charAt(n - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return (
      calc(digits, 12) === parseInt(digits[12]) &&
      calc(digits, 13) === parseInt(digits[13])
    );
  }

  function validate() {
    let valid = true;
    clearAllErrors();

    /* CNPJ (empresa tab only) */
    if (activeTab === 'empresa') {
      if (!cnpjInput.value.trim()) {
        showError(cnpjInput, 'cnpjError', 'Informe o CNPJ da empresa.');
        valid = false;
      } else if (!isValidCNPJ(cnpjInput.value)) {
        showError(cnpjInput, 'cnpjError', 'CNPJ inválido.');
        valid = false;
      }
    }

    /* Email */
    if (!emailInput.value.trim()) {
      showError(emailInput, 'emailError', 'Informe seu e-mail.');
      valid = false;
    } else if (!isValidEmail(emailInput.value)) {
      showError(emailInput, 'emailError', 'E-mail inválido.');
      valid = false;
    }

    /* Password */
    if (!passwordInput.value) {
      showError(passwordInput, 'passwordError', 'Informe sua senha.');
      valid = false;
    } else if (passwordInput.value.length < 6) {
      showError(passwordInput, 'passwordError', 'Mínimo de 6 caracteres.');
      valid = false;
    }

    return valid;
  }

  /* =============================================
     TOAST NOTIFICATION
     ============================================= */
  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast toast--visible toast--${type}`;
    toastTimer = setTimeout(() => {
      toast.className = 'toast';
    }, 3500);
  }

  /* =============================================
     FORM SUBMIT
     ============================================= */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    /* Loading state */
    submitBtn.disabled = true;
    btnText.textContent = 'Entrando...';
    spinner.hidden = false;

    /* Simulate API call */
    await fakeLogin();

    /* Reset loading state */
    submitBtn.disabled = false;
    btnText.textContent = 'Entrar';
    spinner.hidden = true;
  });

  /* Simulates a login request (replace with real fetch call) */
  function fakeLogin() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = emailInput.value.trim().toLowerCase();

        /* Demo: any @plain.com.br address succeeds */
        if (email.endsWith('@plain.com.br') || email === 'demo@teste.com') {
          showToast('✓ Login realizado com sucesso!', 'success');
        } else {
          showError(passwordInput, 'passwordError', 'E-mail ou senha incorretos.');
          showToast('Credenciais inválidas. Tente novamente.', 'error');
        }
        resolve();
      }, 1400);
    });
  }

  /* =============================================
     SOCIAL BUTTONS (placeholder handlers)
     ============================================= */
  document.getElementById('googleBtn').addEventListener('click', () => {
    showToast('Redirecionando para o Google...', 'success');
  });

  document.getElementById('msBtn').addEventListener('click', () => {
    showToast('Redirecionando para a Microsoft...', 'success');
  });

  /* =============================================
     REAL-TIME INLINE VALIDATION (on blur)
     ============================================= */
  emailInput.addEventListener('blur', () => {
    if (emailInput.value && !isValidEmail(emailInput.value)) {
      showError(emailInput, 'emailError', 'E-mail inválido.');
    } else {
      clearError(emailInput, 'emailError');
    }
  });

  passwordInput.addEventListener('blur', () => {
    if (passwordInput.value && passwordInput.value.length < 6) {
      showError(passwordInput, 'passwordError', 'Mínimo de 6 caracteres.');
    } else {
      clearError(passwordInput, 'passwordError');
    }
  });

  cnpjInput.addEventListener('blur', () => {
    if (cnpjInput.value && !isValidCNPJ(cnpjInput.value)) {
      showError(cnpjInput, 'cnpjError', 'CNPJ inválido.');
    } else {
      clearError(cnpjInput, 'cnpjError');
    }
  });

})();
