import { initPage } from './shared';
import { supabase } from './supabase';

/*
  Requires a Supabase table:

  create table books (
    id            uuid default gen_random_uuid() primary key,
    user_id       uuid references auth.users not null,
    title         text not null,
    author        text not null,
    genres        text[] default '{}',
    status        text default 'to-read',
    description   text,
    cover_gradient text,
    cover_dark    boolean default false,
    created_at    timestamptz default now()
  );

  alter table books enable row level security;
  create policy "Users manage own books" on books
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
*/

const THEMES = [
  { label: 'Forest Night', gradient: 'linear-gradient(160deg,#1b2a1b 0%,#2d4a1e 35%,#3d2d0e 65%,#5a3e10 100%)', dark: false },
  { label: 'Ocean Deep',   gradient: 'linear-gradient(160deg,#1a1a2e 0%,#16213e 40%,#0f3460 70%,#533483 100%)', dark: false },
  { label: 'Warm Sand',    gradient: 'linear-gradient(160deg,#f5ede0 0%,#e8d4b0 40%,#d4b88a 70%,#c8a870 100%)', dark: true  },
  { label: 'Sunset Fire',  gradient: 'linear-gradient(160deg,#b34700 0%,#d4620a 35%,#e8820a 60%,#f0a030 85%,#f5c040 100%)', dark: false },
  { label: 'Deep Purple',  gradient: 'linear-gradient(160deg,#1a0533 0%,#2d1b4e 40%,#3d2a6a 70%,#4a3580 100%)', dark: false },
  { label: 'Ocean Teal',   gradient: 'linear-gradient(160deg,#0d2137 0%,#1a3a52 40%,#1f4e6a 65%,#2a6080 100%)', dark: false },
  { label: 'Rose',         gradient: 'linear-gradient(160deg,#4a0a2a 0%,#8b2252 40%,#c2527a 70%,#e8809a 100%)', dark: false },
  { label: 'Midnight',     gradient: 'linear-gradient(160deg,#0a0a14 0%,#14141e 40%,#1e1e2e 70%,#2a2a3e 100%)', dark: false },
];

const GENRES = [
  'Self-improvement', 'Novel', 'Literary fiction', 'Adventure fiction',
  'Historical fiction', 'Thriller', 'Psychology', 'Finance',
  'Romance', 'Science Fiction', 'Fantasy', 'Biography',
  'Mystery', 'Non-fiction',
];

let activeThemeIndex = 0;

async function init() {
  const user = await initPage();
  if (!user) return;

  setupSidebarToggle();
  buildGenreChips();
  buildThemeSwatches();
  setupLivePreview();
  setupForm(user.id);
}

function setupSidebarToggle() {
  const sidebar  = document.getElementById('sidebar')!;
  const overlay  = document.getElementById('sidebar-overlay')!;
  const toggle   = document.getElementById('sidebar-toggle')!;
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; };
  toggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  overlay.addEventListener('click', close);
  sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

function buildGenreChips() {
  const grid = document.getElementById('genre-grid')!;
  grid.innerHTML = GENRES.map(g => `
    <label class="genre-chip" data-genre="${g}">
      <input type="checkbox" value="${g}" />
      <span class="genre-chip-dot"></span>
      <span class="genre-chip-label">${g}</span>
    </label>
  `).join('');

  grid.querySelectorAll<HTMLLabelElement>('.genre-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cb = chip.querySelector('input')!;
      cb.checked = !cb.checked;
      chip.classList.toggle('selected', cb.checked);
    });
  });
}

function buildThemeSwatches() {
  const grid = document.getElementById('theme-grid')!;
  grid.innerHTML = THEMES.map((t, i) => `
    <div class="theme-swatch${i === 0 ? ' active' : ''}"
         style="background:${t.gradient}"
         title="${t.label}"
         data-index="${i}"></div>
  `).join('');

  grid.querySelectorAll<HTMLElement>('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      grid.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      activeThemeIndex = Number(swatch.dataset.index);
      applyThemeToPreview();
    });
  });
}

function applyThemeToPreview() {
  const theme = THEMES[activeThemeIndex];
  const bg    = document.getElementById('cover-preview-bg')!;
  const title = document.getElementById('cover-preview-title')!;
  const author = document.getElementById('cover-preview-author')!;
  bg.style.background = theme.gradient;
  title.className  = 'cover-preview-title'  + (theme.dark ? ' dark' : '');
  author.className = 'cover-preview-author' + (theme.dark ? ' dark' : '');
}

function setupLivePreview() {
  const titleInput  = document.getElementById('f-title')  as HTMLInputElement;
  const authorInput = document.getElementById('f-author') as HTMLInputElement;
  const previewTitle  = document.getElementById('cover-preview-title')!;
  const previewAuthor = document.getElementById('cover-preview-author')!;

  applyThemeToPreview();

  titleInput.addEventListener('input', () => {
    previewTitle.textContent = titleInput.value.trim() || 'Title';
  });
  authorInput.addEventListener('input', () => {
    previewAuthor.textContent = authorInput.value.trim() || 'Author';
  });
}

function getSelectedGenres(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('#genre-grid input:checked')
  ).map(cb => cb.value);
}

function showError(msg: string) {
  const el = document.getElementById('form-error')!;
  el.textContent = msg;
  el.classList.add('show');
}

function clearError() {
  const el = document.getElementById('form-error')!;
  el.textContent = '';
  el.classList.remove('show');
}

function showToast(msg: string) {
  const toast = document.getElementById('toast')!;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function setupForm(userId: string) {
  const form = document.getElementById('add-book-form') as HTMLFormElement;
  const btn  = document.getElementById('submit-btn')  as HTMLButtonElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const title  = (document.getElementById('f-title')  as HTMLInputElement).value.trim();
    const author = (document.getElementById('f-author') as HTMLInputElement).value.trim();
    const status = (document.getElementById('f-status') as HTMLSelectElement).value;
    const desc   = (document.getElementById('f-desc')   as HTMLTextAreaElement).value.trim();
    const genres = getSelectedGenres();
    const theme  = THEMES[activeThemeIndex];

    if (!title)  { showError('Please enter a book title.');  return; }
    if (!author) { showError('Please enter an author name.'); return; }

    btn.classList.add('loading');
    btn.textContent = '';

    const { error } = await supabase.from('books').insert({
      user_id:        userId,
      title,
      author,
      genres,
      status,
      description:    desc || null,
      cover_gradient: theme.gradient,
      cover_dark:     theme.dark,
    });

    btn.classList.remove('loading');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add to Library`;

    if (error) {
      showError(error.message);
      return;
    }

    showToast('Book added to your library!');
    setTimeout(() => { window.location.href = '/dashboard.html'; }, 1200);
  });
}

init();
