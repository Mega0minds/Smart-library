import { supabase } from './supabase';

// ── Modal ──
const overlay     = document.getElementById('modal-overlay') as HTMLDivElement;
const panelSignup = document.getElementById('panel-signup') as HTMLDivElement;
const panelLogin  = document.getElementById('panel-login') as HTMLDivElement;
const tabSignup   = document.getElementById('tab-signup') as HTMLDivElement;
const tabLogin    = document.getElementById('tab-login') as HTMLDivElement;

function openModal(panel: 'signup' | 'login') {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  switchPanel(panel);
  document.getElementById('hamburger')?.classList.remove('open');
  document.getElementById('mobile-menu')?.classList.remove('open');
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function switchPanel(panel: 'signup' | 'login') {
  const isSignup = panel === 'signup';
  panelSignup.style.display = isSignup ? '' : 'none';
  panelLogin.style.display  = isSignup ? 'none' : '';
  tabSignup.classList.toggle('active', isSignup);
  tabLogin.classList.toggle('active', !isSignup);
  // Reset confirm panel
  document.getElementById('panel-confirm')!.style.display = 'none';
  (document.querySelector('.modal-tabs') as HTMLElement).style.display = '';
  clearError('su-error');
  clearError('li-error');
}

function showError(id: string, msg: string) {
  const el = document.getElementById(id)!;
  el.textContent = msg;
  el.classList.add('show');
}

function clearError(id: string) {
  const el = document.getElementById(id)!;
  el.textContent = '';
  el.classList.remove('show');
}

function setLoading(btnId: string, on: boolean, label: string) {
  const btn = document.getElementById(btnId) as HTMLButtonElement;
  btn.classList.toggle('loading', on);
  if (!on) btn.textContent = label;
}

// ── Email confirmation state ──
function showConfirmEmail() {
  panelSignup.style.display = 'none';
  panelLogin.style.display = 'none';
  (document.querySelector('.modal-tabs') as HTMLElement).style.display = 'none';
  document.getElementById('panel-confirm')!.style.display = '';
}

// ── Nav auth state ──
function updateNavAuth(loggedIn: boolean) {
  (['btn-signup-desk', 'btn-login-desk', 'btn-signup-mob', 'btn-login-mob'] as const).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = loggedIn ? 'none' : '';
  });
  (['btn-logout-desk', 'btn-logout-mob'] as const).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = loggedIn ? '' : 'none';
  });
}

// ── Sign Up ──
document.getElementById('form-signup')!.addEventListener('submit', async e => {
  e.preventDefault();
  clearError('su-error');

  const fullName = (document.getElementById('su-name') as HTMLInputElement).value.trim();
  const email    = (document.getElementById('su-email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('su-pass') as HTMLInputElement).value;

  setLoading('su-btn', true, 'Create account');
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      showError('su-error', error.message);
      return;
    }
    if (data.session) {
      window.location.href = '/dashboard.html';
    } else {
      // Email confirmation required
      showConfirmEmail();
      (document.getElementById('form-signup') as HTMLFormElement).reset();
    }
  } finally {
    setLoading('su-btn', false, 'Create account');
  }
});

// ── Login ──
document.getElementById('form-login')!.addEventListener('submit', async e => {
  e.preventDefault();
  clearError('li-error');

  const email    = (document.getElementById('li-email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('li-pass') as HTMLInputElement).value;

  setLoading('li-btn', true, 'Log in');
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showError('li-error', error.message);
      return;
    }
    window.location.href = '/dashboard.html';
  } finally {
    setLoading('li-btn', false, 'Log in');
  }
});

// ── Logout ──
async function handleLogout() {
  await supabase.auth.signOut();
}
document.getElementById('btn-logout-desk')?.addEventListener('click', handleLogout);
document.getElementById('btn-logout-mob')?.addEventListener('click', handleLogout);

// ── Modal triggers ──
document.getElementById('btn-signup-desk')!.addEventListener('click', () => openModal('signup'));
document.getElementById('btn-login-desk')!.addEventListener('click',  () => openModal('login'));
document.getElementById('btn-signup-mob')!.addEventListener('click',  () => openModal('signup'));
document.getElementById('btn-login-mob')!.addEventListener('click',   () => openModal('login'));

tabSignup.addEventListener('click', () => switchPanel('signup'));
tabLogin.addEventListener('click',  () => switchPanel('login'));

document.getElementById('switch-to-login')!.addEventListener('click',  () => switchPanel('login'));
document.getElementById('switch-to-signup')!.addEventListener('click', () => switchPanel('signup'));

document.getElementById('modal-close')!.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Session state ──
supabase.auth.onAuthStateChange((_event, session) => {
  updateNavAuth(!!session);
});

supabase.auth.getSession().then(({ data: { session } }) => {
  updateNavAuth(!!session);
});
