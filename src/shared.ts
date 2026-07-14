import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  genres: string[] | null;
  status: string | null;
  description: string | null;
  cover_gradient: string | null;
  cover_dark: boolean | null;
  pdf_url: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export async function initPage(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/'; return null; }

  document.getElementById('loading')!.style.display = 'none';
  document.getElementById('app')!.style.display = 'flex';

  const user = session.user;
  const fullName: string = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  (document.getElementById('user-name') as HTMLElement).textContent = fullName;
  (document.getElementById('user-email') as HTMLElement).textContent = user.email ?? '';
  (document.getElementById('user-avatar') as HTMLElement).textContent = initials;

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  const checklistKey = `bk_checklist_${user.id}`;
  const saved: Record<string, boolean> = JSON.parse(localStorage.getItem(checklistKey) || '{}');
  document.querySelectorAll<HTMLInputElement>('.checklist-item input[type="checkbox"]').forEach(cb => {
    if (saved[cb.id]) { cb.checked = true; cb.closest('.checklist-item')?.classList.add('checked'); }
    cb.addEventListener('change', () => {
      const state: Record<string, boolean> = JSON.parse(localStorage.getItem(checklistKey) || '{}');
      state[cb.id] = cb.checked;
      localStorage.setItem(checklistKey, JSON.stringify(state));
      cb.closest('.checklist-item')?.classList.toggle('checked', cb.checked);
    });
  });

  supabase.auth.onAuthStateChange((_event, s) => { if (!s) window.location.href = '/'; });
  return user;
}

export function showToast(msg: string) {
  const existing = document.getElementById('bk-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'bk-toast';
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:0.6rem 1.25rem;border-radius:8px;font-size:0.82rem;font-weight:500;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.18);pointer-events:none;opacity:1;transition:opacity 0.3s;white-space:nowrap;';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2500);
}

const GENRE_STYLES: Record<string, { bg: string; color: string }> = {
  'Self-improvement':   { bg: '#e8f5e9', color: '#2e7d32' },
  'Novel':              { bg: '#f3e5f5', color: '#6a1b9a' },
  'Literary fiction':   { bg: '#e8eaf6', color: '#283593' },
  'Adventure fiction':  { bg: '#fff3e0', color: '#e65100' },
  'Historical fiction': { bg: '#fce4ec', color: '#880e4f' },
  'Thriller':           { bg: '#e3f2fd', color: '#1565c0' },
  'Psychology':         { bg: '#e8eaf6', color: '#283593' },
  'Finance':            { bg: '#e8f5e9', color: '#1b5e20' },
};

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escA(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function renderBookCard(book: Book, cardActionLabel = ''): string {
  const initials = book.author.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const coverValue = book.cover_image_url
    ? `url('${escA(book.cover_image_url)}') center/cover no-repeat`
    : (book.cover_gradient || '#333');
  const dark = book.cover_dark;
  const genres = book.genres || [];
  const genresBadges = genres.map(g => {
    const s = GENRE_STYLES[g] || { bg: '#f0f0f0', color: '#555' };
    return `<span class="badge" style="background:${s.bg};color:${s.color};">${esc(g)}</span>`;
  }).join('');
  const authorShort = book.author.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ');
  const actionBtn = cardActionLabel
    ? `<button class="card-action" data-book-action="true">${esc(cardActionLabel)}</button>`
    : '';

  return `
    <div class="book-card"
      data-id="${escA(book.id)}"
      data-title="${escA(book.title)}"
      data-author="${escA(book.author)}"
      data-initials="${escA(initials)}"
      data-cover="${escA(coverValue)}"
      data-dark="${dark ? 'true' : 'false'}"
      data-genres="${escA(genres.join(','))}"
      data-status="${escA(book.status || '')}"
      data-desc="${escA(book.description || '')}"
      data-pdf="${escA(book.pdf_url || '')}">
      <div class="book-cover">
        <div class="cover-bg" style="background:${coverValue}">
          <span class="cover-title${dark ? ' dark' : ''}">${esc(book.title)}</span>
          <span class="cover-author-sm${dark ? ' dark' : ''}">${esc(book.author)}</span>
        </div>
      </div>
      <div class="book-info">
        <div class="book-title">${esc(book.title)}</div>
        <div class="book-genres">${genresBadges}</div>
        <div class="book-meta">
          <div class="author-chip">
            <div class="author-initial">${esc(initials)}</div>
            ${esc(authorShort)}
          </div>
          ${actionBtn}
        </div>
      </div>
    </div>
  `;
}

export function setupBookDrawer(onRefresh?: () => Promise<void> | void) {
  if (document.getElementById('book-drawer-overlay')) return;

  let currentBookId = '';
  let currentBookPdfUrl = '';

  const overlay = document.createElement('div');
  overlay.id = 'book-drawer-overlay';
  overlay.innerHTML = `
    <div id="book-drawer">
      <button id="drawer-close" aria-label="Close">✕</button>
      <div id="drawer-cover">
        <div id="drawer-cover-bg">
          <span id="drawer-cover-title-text"></span>
          <span id="drawer-cover-author-text"></span>
        </div>
      </div>
      <div id="drawer-info">
        <div id="drawer-title"></div>
        <div id="drawer-author-row">
          <div id="drawer-author-initial"></div>
          <span id="drawer-author-name"></span>
        </div>
        <div id="drawer-genres"></div>
        <div class="drawer-status-label">Status</div>
        <div class="drawer-status-badge" id="drawer-status"></div>
        <p id="drawer-desc"></p>
        <div class="drawer-divider"></div>
        <div id="drawer-actions">
          <button class="drawer-btn-primary" id="drawer-btn-start">Start Reading</button>
          <button class="drawer-btn-secondary" id="drawer-btn-wishlist">Add to Wishlist</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.textContent = `
    #book-drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:200;opacity:0;pointer-events:none;transition:opacity 0.2s;}
    #book-drawer-overlay.open{opacity:1;pointer-events:all;}
    #book-drawer{position:absolute;right:0;top:0;bottom:0;width:320px;background:#fff;box-shadow:-6px 0 32px rgba(0,0,0,0.14);display:flex;flex-direction:column;transform:translateX(100%);transition:transform 0.22s cubic-bezier(0.4,0,0.2,1);overflow-y:auto;}
    #book-drawer-overlay.open #book-drawer{transform:translateX(0);}
    #drawer-close{position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.2);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.9);z-index:3;transition:background 0.14s;line-height:1;font-family:inherit;}
    #drawer-close:hover{background:rgba(0,0,0,0.35);}
    #drawer-cover{height:210px;flex-shrink:0;position:relative;overflow:hidden;}
    #drawer-cover-bg{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;position:relative;}
    #drawer-cover-bg::before{content:'';position:absolute;top:0;left:0;width:18px;height:100%;background:linear-gradient(to right,rgba(0,0,0,0.28),transparent);z-index:1;}
    #drawer-cover-title-text{font-size:0.88rem;font-weight:800;color:rgba(255,255,255,0.92);text-align:center;text-transform:uppercase;letter-spacing:0.02em;line-height:1.4;position:relative;z-index:2;}
    #drawer-cover-title-text.dark{color:rgba(30,20,10,0.85);}
    #drawer-cover-author-text{font-size:0.6rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;margin-top:8px;position:relative;z-index:2;}
    #drawer-cover-author-text.dark{color:rgba(30,20,10,0.45);}
    #drawer-info{padding:1.25rem;flex:1;}
    #drawer-title{font-size:1rem;font-weight:800;color:#111;line-height:1.35;margin-bottom:0.45rem;letter-spacing:-0.01em;}
    #drawer-author-row{display:flex;align-items:center;gap:7px;margin-bottom:0.9rem;}
    #drawer-author-initial{width:22px;height:22px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:800;color:#3d6cfa;flex-shrink:0;}
    #drawer-author-name{font-size:0.8rem;color:#555;font-weight:500;}
    #drawer-genres{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:0.9rem;}
    .drawer-status-label{font-size:0.63rem;font-weight:600;color:#c0c0c0;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.3rem;}
    .drawer-status-badge{display:inline-flex;align-items:center;font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:999px;background:#eef2ff;color:#3d6cfa;margin-bottom:1rem;}
    #drawer-desc{font-size:0.79rem;color:#666;line-height:1.7;margin-bottom:1.25rem;}
    .drawer-divider{height:1px;background:#f4f4f4;margin-bottom:1.25rem;}
    #drawer-actions{display:flex;flex-direction:column;gap:8px;}
    .drawer-btn-primary{width:100%;background:#3d6cfa;color:#fff;border:none;border-radius:8px;padding:0.58rem 1rem;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.14s;}
    .drawer-btn-primary:hover{background:#2a56e8;}
    .drawer-btn-primary:disabled{background:#a0b4fc;cursor:not-allowed;}
    .drawer-btn-secondary{width:100%;background:#f7f8fc;color:#555;border:1px solid #ebebeb;border-radius:8px;padding:0.58rem 1rem;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.14s,color 0.14s,border-color 0.14s;}
    .drawer-btn-secondary:hover{background:#eef2ff;border-color:#c5d0ff;color:#3d6cfa;}
    @media(max-width:600px){#book-drawer{width:100%;}}
  `;
  document.head.appendChild(style);

  function openDrawer(card: HTMLElement) {
    const title    = card.dataset.title    || '';
    const author   = card.dataset.author   || '';
    const initials = card.dataset.initials || '';
    const cover    = card.dataset.cover    || '#333';
    const dark     = card.dataset.dark === 'true';
    const genres   = (card.dataset.genres || '').split(',').map(g => g.trim()).filter(Boolean);
    const status   = card.dataset.status   || '';
    const desc     = card.dataset.desc     || '';

    currentBookId     = card.dataset.id  || '';
    currentBookPdfUrl = card.dataset.pdf || '';

    (document.getElementById('drawer-cover-bg') as HTMLElement).style.background = cover;

    const titleEl = document.getElementById('drawer-cover-title-text') as HTMLElement;
    titleEl.textContent = title;
    titleEl.className = dark ? 'dark' : '';

    const authorSmEl = document.getElementById('drawer-cover-author-text') as HTMLElement;
    authorSmEl.textContent = author;
    authorSmEl.className = dark ? 'dark' : '';

    (document.getElementById('drawer-title') as HTMLElement).textContent = title;
    (document.getElementById('drawer-author-initial') as HTMLElement).textContent = initials;
    (document.getElementById('drawer-author-name') as HTMLElement).textContent = author;

    const genresEl = document.getElementById('drawer-genres') as HTMLElement;
    genresEl.innerHTML = genres.map(g => {
      const s = GENRE_STYLES[g] || { bg: '#f0f0f0', color: '#555' };
      return `<span class="badge" style="background:${s.bg};color:${s.color};font-size:0.66rem;font-weight:600;padding:2px 7px;border-radius:999px;">${g}</span>`;
    }).join('');

    (document.getElementById('drawer-status') as HTMLElement).textContent = status;
    (document.getElementById('drawer-desc') as HTMLElement).textContent = desc;

    const startBtn = document.getElementById('drawer-btn-start') as HTMLButtonElement;
    startBtn.textContent = status === 'Reading' ? 'Continue Reading' : 'Start Reading';

    const wishlistBtn = document.getElementById('drawer-btn-wishlist') as HTMLButtonElement;
    wishlistBtn.textContent = status === 'Wishlist' ? 'Remove from Wishlist' : 'Add to Wishlist';

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Event delegation — catches clicks on dynamically rendered cards
  document.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-book-action]')) return;
    if (overlay.classList.contains('open') && target === overlay) { closeDrawer(); return; }
    const card = target.closest('.book-card');
    if (card && !overlay.contains(target)) openDrawer(card as HTMLElement);
  });

  document.getElementById('drawer-close')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  document.getElementById('drawer-btn-start')?.addEventListener('click', async () => {
    if (!currentBookId) return;
    const btn = document.getElementById('drawer-btn-start') as HTMLButtonElement;

    // Open PDF synchronously before any await — browsers block window.open after async calls
    if (currentBookPdfUrl) {
      window.open(currentBookPdfUrl, '_blank');
    } else {
      showToast('No PDF available for this book.');
    }

    const alreadyReading = btn.textContent?.includes('Continue');
    if (!alreadyReading) {
      btn.disabled = true;
      const { error } = await supabase.from('books').update({ status: 'Reading' }).eq('id', currentBookId);
      btn.disabled = false;
      if (error) { showToast('Error updating status: ' + error.message); return; }
    }

    if (currentBookPdfUrl) showToast('Happy reading! 📖');
    closeDrawer();
    if (onRefresh) await onRefresh();
  });

  document.getElementById('drawer-btn-wishlist')?.addEventListener('click', async () => {
    if (!currentBookId) return;
    const btn = document.getElementById('drawer-btn-wishlist') as HTMLButtonElement;
    const removing = btn.textContent?.includes('Remove');
    const newStatus = removing ? 'To read' : 'Wishlist';
    btn.disabled = true;
    const { error } = await supabase.from('books').update({ status: newStatus }).eq('id', currentBookId);
    btn.disabled = false;
    if (error) { showToast('Error: ' + error.message); return; }
    showToast(removing ? 'Removed from wishlist' : 'Added to wishlist!');
    closeDrawer();
    if (onRefresh) await onRefresh();
  });
}
