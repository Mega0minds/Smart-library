import { supabase } from './supabase';
import { initPage, setupBookDrawer, renderBookCard, showToast, Book } from './shared';

async function init() {
  const user = await initPage();
  if (!user) return;

  const grid = document.querySelector<HTMLElement>('.book-grid')!;

  async function loadWishlist() {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'Wishlist')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    const books = (data as Book[]) || [];

    if (books.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:3rem 0;text-align:center;color:#aaa;font-size:0.85rem;">
        Your wishlist is empty. Open any book in your library and click <strong>Add to Wishlist</strong>.
      </div>`;
      return;
    }

    grid.innerHTML = books.map(b => renderBookCard(b, 'Remove')).join('');
  }

  // Handle Remove buttons via event delegation (stopPropagation so drawer doesn't open)
  grid.addEventListener('click', async e => {
    const target = e.target as HTMLElement;
    if (!target.dataset.bookAction) return;
    e.stopPropagation();

    const card = target.closest<HTMLElement>('.book-card');
    const bookId = card?.dataset.id;
    if (!bookId || !card) return;

    target.textContent = '…';
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) { showToast('Error: ' + error.message); target.textContent = 'Remove'; return; }
    card.remove();
    showToast('Removed from wishlist');
  });

  // Add book button goes to add-book page
  document.querySelector<HTMLButtonElement>('.btn-add')?.addEventListener('click', () => {
    window.location.href = '/add-book.html';
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

  await loadWishlist();
  setupBookDrawer(loadWishlist);
}

init();
