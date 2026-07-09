import { supabase } from './supabase';
import { setupBookDrawer } from './shared';

async function init() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = '/';
    return;
  }

  document.getElementById('loading')!.style.display = 'none';
  document.getElementById('app')!.style.display = 'flex';

  const user = session.user;
  const fullName: string = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  document.getElementById('user-name')!.textContent = fullName;
  document.getElementById('user-email')!.textContent = user.email ?? '';
  document.getElementById('user-avatar')!.textContent = initials;

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  // Tabs
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Reading checklist — persist per-user in localStorage
  const checklistKey = `bk_checklist_${user.id}`;
  const saved: Record<string, boolean> = JSON.parse(localStorage.getItem(checklistKey) || '{}');

  document.querySelectorAll<HTMLInputElement>('.checklist-item input[type="checkbox"]').forEach(cb => {
    if (saved[cb.id]) {
      cb.checked = true;
      cb.closest('.checklist-item')?.classList.add('checked');
    }
    cb.addEventListener('change', () => {
      const state: Record<string, boolean> = JSON.parse(localStorage.getItem(checklistKey) || '{}');
      state[cb.id] = cb.checked;
      localStorage.setItem(checklistKey, JSON.stringify(state));
      cb.closest('.checklist-item')?.classList.toggle('checked', cb.checked);
    });
  });

  supabase.auth.onAuthStateChange((_event, s) => {
    if (!s) window.location.href = '/';
  });

  setupBookDrawer();
}

init();
