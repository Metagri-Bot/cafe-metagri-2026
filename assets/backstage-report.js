(() => {
  const PASSWORD_HASH = '6b6b253a4499b41d2ff4445a2857e811269a256c51f2bfac88a862cacf32c84e';
  const STORAGE_KEY = 'cafeMetagriBackstageUnlocked';

  const form = document.querySelector('[data-gate-form]');
  const gate = document.querySelector('[data-gate]');
  const content = document.querySelector('[data-report-content]');
  const error = document.querySelector('[data-gate-error]');

  const toHex = (buffer) => Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const hashText = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return toHex(digest);
  };

  const showContent = () => {
    gate.hidden = true;
    content.hidden = false;
  };

  const showGate = () => {
    gate.hidden = false;
    content.hidden = true;
  };

  if (localStorage.getItem(STORAGE_KEY) === 'true') {
    showContent();
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = new FormData(form).get('password')?.toString() || '';
    const hash = await hashText(password.trim());

    if (hash === PASSWORD_HASH) {
      localStorage.setItem(STORAGE_KEY, 'true');
      if (error) error.hidden = true;
      showContent();
      return;
    }

    if (error) error.hidden = false;
  });

})();
