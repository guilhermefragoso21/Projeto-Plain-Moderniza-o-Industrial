/* =============================================
   PLAIN — Login Page Scripts
   script.js  (corrigido)
   ============================================= */

(function () {
  'use strict';

  /* ---- DOM References ---- */
  const form          = document.getElementById('loginForm');
  const emailInput    = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const cnpjInput     = document.getElementById('cnpj');
  const cnpjGroup     = document.getElementById('cnpjGroup');
  const submitBtn     = document.getElementById('submitBtn');
  const spinner       = document.getElementById('spinner');
  const btnText       = submitBtn.querySelector('.btn-primary__text');
  const toggleEye     = document.getElementById('togglePassword');
  const eyeIcon       = document.getElementById('eyeIcon');
  const toast         = document.getElementById('toast');
  const tabs          = document.querySelectorAll('.tab');

  /* ---- State ---- */
  let activeTab  = 'empresa';
  let toastTimer = null;
  // FIX 8: flag para suprimir blur durante troca de aba
  let switchingTab = false;

  /* =============================================
     TABS
     ============================================= */
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchingTab = true; // FIX 8

      tabs.forEach(t => t.classList.remove('tab--active'));
      tab.classList.add('tab--active');
      activeTab = tab.dataset.tab;

      if (activeTab === 'empresa') {
        cnpjGroup.style.display = 'block';
        emailInput.placeholder  = 'E-mail corporativo';
      } else {
        cnpjGroup.style.display = 'none';
        cnpjInput.value         = '';
        clearError(cnpjInput, 'cnpjError');
        emailInput.placeholder  = 'Seu e-mail';
      }

      clearAllErrors();

      // FIX 8: libera o flag após os eventos de blur serem disparados
      requestAnimationFrame(() => { switchingTab = false; });
    });
  });

  /* =============================================
     CNPJ MASK  →  00.000.000/0000-00
     ============================================= */
  cnpjInput.addEventListener('input', () => {
    let v = cnpjInput.value.replace(/\D/g, '').slice(0, 14);
    if      (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
    else if (v.length >  8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/,          '$1.$2.$3/$4');
    else if (v.length >  5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/,                 '$1.$2.$3');
    else if (v.length >  2) v = v.replace(/^(\d{2})(\d{0,3})/,                         '$1.$2');
    cnpjInput.value = v;
  });

  /* =============================================
     PASSWORD TOGGLE
     ============================================= */
  toggleEye.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

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

  // FIX 5: algoritmo de validação de CNPJ corrigido
  function isValidCNPJ(cnpj) {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return false;
    if (/^(\d)\1+$/.test(digits)) return false; // todos dígitos iguais

    const calcDigit = (digits, length) => {
      let sum = 0;
      let pos = length - 7;
      for (let i = length; i >= 1; i--) {
        sum += parseInt(digits.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const first  = calcDigit(digits, 12);
    const second = calcDigit(digits, 13);

    return first === parseInt(digits[12]) && second === parseInt(digits[13]);
  }

  function validate() {
    let valid = true;
    clearAllErrors(); // FIX 7: garante que erros residuais do fakeLogin sejam limpos antes

    if (activeTab === 'empresa') {
      if (!cnpjInput.value.trim()) {
        showError(cnpjInput, 'cnpjError', 'Informe o CNPJ da empresa.');
        valid = false;
      } else if (!isValidCNPJ(cnpjInput.value)) {
        showError(cnpjInput, 'cnpjError', 'CNPJ inválido.');
        valid = false;
      }
    }

    if (!emailInput.value.trim()) {
      showError(emailInput, 'emailError', 'Informe seu e-mail.');
      valid = false;
    } else if (!isValidEmail(emailInput.value)) {
      showError(emailInput, 'emailError', 'E-mail inválido.');
      valid = false;
    }

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
    toast.className   = `toast toast--visible toast--${type}`;
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

    /* FIX 6: garante reset completo do estado antes de chamar fakeLogin */
    submitBtn.disabled    = true;
    btnText.textContent   = 'Entrando...';
    spinner.hidden        = false;

    try {
      await fakeLogin();
    } finally {
      // FIX 6: sempre restaura o botão, mesmo em caso de exceção futura
      submitBtn.disabled  = false;
      btnText.textContent = 'Entrar';
      spinner.hidden      = true;
    }
  });

  function fakeLogin() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const email = emailInput.value.trim().toLowerCase();

        if (email.endsWith('@plain.com.br') || email === 'demo@teste.com') {
          showToast('✓ Login realizado com sucesso!', 'success');
        } else {
          // FIX 6: showError após fakeLogin não conflita mais com clearAllErrors do próximo submit
          showError(passwordInput, 'passwordError', 'E-mail ou senha incorretos.');
          showToast('Credenciais inválidas. Tente novamente.', 'error');
        }
        resolve();
      }, 1400);
    });
  }

  /* =============================================
     SOCIAL BUTTONS
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
    if (switchingTab) return; // FIX 8
    if (emailInput.value && !isValidEmail(emailInput.value)) {
      showError(emailInput, 'emailError', 'E-mail inválido.');
    } else {
      clearError(emailInput, 'emailError');
    }
  });

  passwordInput.addEventListener('blur', () => {
    if (switchingTab) return; // FIX 8
    if (passwordInput.value && passwordInput.value.length < 6) {
      showError(passwordInput, 'passwordError', 'Mínimo de 6 caracteres.');
    } else {
      clearError(passwordInput, 'passwordError');
    }
  });

  cnpjInput.addEventListener('blur', () => {
    if (switchingTab) return; // FIX 8
    if (cnpjInput.value && !isValidCNPJ(cnpjInput.value)) {
      showError(cnpjInput, 'cnpjError', 'CNPJ inválido.');
    } else {
      clearError(cnpjInput, 'cnpjError');
    }
  });

})();