const captchaForm = document.querySelector('form[data-captcha-action]');
if (captchaForm) {
  let verified = false;
  let running = false;
  const message = captchaForm.querySelector('[data-captcha-message]');
  captchaForm.addEventListener('submit', async event => {
    if (verified) return;
    event.preventDefault();
    if (running) return;
    running = true;
    message.textContent = '';
    try {
      const captcha = window.grecaptcha;
      if (!captcha?.execute) throw new Error();
      const token = await new Promise((resolve, reject) => {
        const timeout = setTimeout(reject, 10000);
        captcha.ready(() => captcha.execute(captchaForm.dataset.captchaKey, {
          action: captchaForm.dataset.captchaAction
        }).then(resolve, reject).finally(() => clearTimeout(timeout)));
      });
      captchaForm.elements.captcha_token.value = token;
      verified = true;
      captchaForm.requestSubmit();
      verified = false;
    } catch {
      message.textContent = 'La verificación de seguridad no está disponible. Inténtalo de nuevo.';
    } finally {
      running = false;
    }
  });
}
