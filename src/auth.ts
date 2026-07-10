import { supabase } from './supabase';

const INTERESTS = [
  'Self-improvement', 'Novel', 'Literary fiction', 'Adventure fiction',
  'Historical fiction', 'Thriller', 'Psychology', 'Finance',
  'Romance', 'Science Fiction', 'Fantasy', 'Biography',
  'Mystery', 'Non-fiction',
];

// ── Modal refs ──
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
  (document.getElementById('panel-interests') as HTMLElement).style.display = 'none';
  tabSignup.classList.toggle('active', isSignup);
  tabLogin.classList.toggle('active', !isSignup);
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

function showConfirmEmail() {
  panelSignup.style.display = 'none';
  panelLogin.style.display = 'none';
  (document.getElementById('panel-interests') as HTMLElement).style.display = 'none';
  (document.querySelector('.modal-tabs') as HTMLElement).style.display = 'none';
  document.getElementById('panel-confirm')!.style.display = '';
}

// ── Interests panel ──
function openInterestsModal() {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  panelSignup.style.display = 'none';
  panelLogin.style.display = 'none';
  document.getElementById('panel-confirm')!.style.display = 'none';
  (document.querySelector('.modal-tabs') as HTMLElement).style.display = 'none';
  buildInterestChips();
  (document.getElementById('panel-interests') as HTMLElement).style.display = '';
}

function buildInterestChips() {
  const grid = document.getElementById('interests-grid')!;
  if (grid.children.length > 0) return;
  grid.innerHTML = INTERESTS.map(g => `
    <label class="interest-chip">
      <input type="checkbox" value="${g}" />
      <span class="interest-chip-label">${g}</span>
    </label>
  `).join('');
  grid.querySelectorAll<HTMLLabelElement>('.interest-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cb = chip.querySelector('input')!;
      cb.checked = !cb.checked;
      chip.classList.toggle('selected', cb.checked);
    });
  });
}

async function saveInterestsAndRedirect() {
  const selected = Array.from(
    document.querySelectorAll<HTMLInputElement>('#interests-grid input:checked')
  ).map(cb => cb.value);

  const btn = document.getElementById('interests-btn') as HTMLButtonElement;
  const orig = btn.textContent;
  btn.classList.add('loading');
  btn.textContent = '';

  const { error } = await supabase.auth.updateUser({ data: { interests: selected } });

  btn.classList.remove('loading');
  btn.textContent = orig;

  if (error) console.error('Could not save interests:', error.message);

  closeModal();
  window.location.href = '/dashboard.html';
}

async function skipInterests() {
  await supabase.auth.updateUser({ data: { interests: [] } });
  closeModal();
  window.location.href = '/dashboard.html';
}

// ── Nav auth state ──
function updateNavAuth(session: { user: { email?: string; user_metadata?: { full_name?: string } } } | null) {
  const loggedIn = !!session;

  (['btn-signup-desk', 'btn-login-desk', 'btn-signup-mob', 'btn-login-mob'] as const).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = loggedIn ? 'none' : '';
  });
  (['btn-logout-desk', 'btn-logout-mob'] as const).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = loggedIn ? '' : 'none';
  });

  const chipDesk = document.getElementById('nav-user-chip') as HTMLElement | null;
  const chipMob  = document.getElementById('mobile-user-row') as HTMLElement | null;
  if (chipDesk) chipDesk.style.display = loggedIn ? 'flex' : 'none';
  if (chipMob)  chipMob.style.display  = loggedIn ? 'flex' : 'none';

  if (loggedIn && session) {
    const user     = session.user;
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const initials = fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
    const email    = user.email ?? '';

    const setText = (id: string, text: string) => {
      const e = document.getElementById(id);
      if (e) e.textContent = text;
    };
    setText('nav-user-avatar',    initials);
    setText('nav-user-name',      fullName.split(' ')[0]);
    setText('mobile-user-avatar', initials);
    setText('mobile-user-name',   fullName);
    setText('mobile-user-email',  email);
  }
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
    if (error) { showError('su-error', error.message); return; }

    if (data.session) {
      // Session returned immediately (no email confirmation required).
      // onAuthStateChange SIGNED_IN will fire and show interests modal.
    } else {
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
    if (error) { showError('li-error', error.message); return; }
    // onAuthStateChange SIGNED_IN handles redirect / interests check.
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

// ── Password visibility toggles ──
const EYE_OPEN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

document.querySelectorAll<HTMLButtonElement>('.pass-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target!) as HTMLInputElement;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? EYE_OFF : EYE_OPEN;
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
});

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

// ── Interests panel buttons ──
document.getElementById('interests-btn')!.addEventListener('click', saveInterestsAndRedirect);
document.getElementById('skip-interests')!.addEventListener('click', skipInterests);

// ── Auth state ──
supabase.auth.onAuthStateChange((event, session) => {
  updateNavAuth(session);

  if (event === 'SIGNED_IN' && session) {
    const interests = session.user.user_metadata?.interests;
    const hasInterests = interests !== null && interests !== undefined;
    if (!hasInterests) {
      openInterestsModal();
    } else {
      window.location.href = '/dashboard.html';
    }
  }
});

supabase.auth.getSession().then(({ data: { session } }) => {
  updateNavAuth(session);
});
