import { supabase } from './supabase';
import { initPage, setupBookDrawer, renderBookCard, Book } from './shared';

const TAB_STATUS: Record<string, string | null> = {
  pinned:   'Pinned',
  reading:  'Reading',
  'to-read': 'To read',
  read:     'Read',
  wishlist: 'Wishlist',
  all:      null,
};

async function init() {
  const user = await initPage();
  if (!user) return;

  // Mobile sidebar
  const sidebar        = document.getElementById('sidebar')!;
  const sidebarOverlay = document.getElementById('sidebar-overlay')!;
  const sidebarToggle  = document.getElementById('sidebar-toggle')!;
  function openSidebar()  { sidebar.classList.add('open');    sidebarOverlay.classList.add('open');    document.body.style.overflow = 'hidden'; }
  function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('open'); document.body.style.overflow = ''; }
  sidebarToggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  sidebarOverlay.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));

  const grid = document.getElementById('book-grid')!;
  let books: Book[] = [];
  let activeTab = 'all';

  async function loadBooks() {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    books = (data as Book[]) || [];
    renderGrid();
    updateTabCounts();
  }

  function renderGrid() {
    const statusFilter = TAB_STATUS[activeTab];
    const filtered = statusFilter === null
      ? books
      : books.filter(b => b.status === statusFilter);

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:3rem 0;text-align:center;color:#aaa;font-size:0.85rem;">
        ${activeTab === 'all'
          ? 'No books yet. <a href="/add-book.html" style="color:#3d6cfa;text-decoration:none;font-weight:600;">Add your first book →</a>'
          : 'No books in this category.'}
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(b => renderBookCard(b)).join('');
  }

  function updateTabCounts() {
    document.querySelectorAll<HTMLElement>('.tab-btn').forEach(btn => {
      const tab = btn.dataset.tab || '';
      const statusFilter = TAB_STATUS[tab];
      const count = statusFilter === null
        ? books.length
        : books.filter(b => b.status === statusFilter).length;
      const countEl = btn.querySelector('.tab-count');
      if (countEl) countEl.textContent = String(count);
    });
  }

  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab || 'all';
      renderGrid();
    });
  });

  const searchInput = document.querySelector<HTMLInputElement>('.search-wrap input');
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    grid.querySelectorAll<HTMLElement>('.book-card').forEach(card => {
      const match = (card.dataset.title  || '').toLowerCase().includes(q)
                 || (card.dataset.author || '').toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
    });
  });

  await loadBooks();
  setupBookDrawer(loadBooks);

  const confirmOverlay = document.getElementById('confirm-overlay')!;
  document.getElementById('btn-delete-all')?.addEventListener('click', () => {
    confirmOverlay.classList.add('open');
  });
  document.getElementById('confirm-cancel')?.addEventListener('click', () => {
    confirmOverlay.classList.remove('open');
  });
  confirmOverlay.addEventListener('click', e => {
    if (e.target === confirmOverlay) confirmOverlay.classList.remove('open');
  });

  document.getElementById('confirm-delete')?.addEventListener('click', async () => {
    const btn = document.getElementById('confirm-delete') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Deleting…';
    const { error } = await supabase.from('books').delete().eq('user_id', user!.id);
    btn.disabled = false;
    btn.textContent = 'Yes, delete all';
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    confirmOverlay.classList.remove('open');
    await loadBooks();
  });

  supabase.auth.onAuthStateChange((_e, s) => { if (!s) window.location.href = '/'; });
}

init();
