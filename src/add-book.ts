import { initPage } from './shared';
import { supabase } from './supabase';

/*
  Supabase setup required:

  -- Add columns to existing books table:
  alter table books
    add column if not exists pdf_url          text,
    add column if not exists cover_image_url  text;

  -- Storage buckets (create in Supabase dashboard → Storage):
  --   book-pdfs   (private, with RLS)
  --   book-covers (public)

  -- RLS policies for storage (repeat for each bucket):
  create policy "Users manage own files" on storage.objects
    for all using (auth.uid()::text = (storage.foldername(name))[1]);
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
let pdfFile: File | null = null;
let coverImageFile: File | null = null;
let coverImageObjectUrl: string | null = null;

async function init() {
  const user = await initPage();
  if (!user) return;

  setupSidebarToggle();
  buildGenreChips();
  buildThemeSwatches();
  setupLivePreview();
  setupPdfUpload();
  setupCoverImageUpload();
  setupForm(user.id);
}

function setupSidebarToggle() {
  const sidebar  = document.getElementById('sidebar')!;
  const overlay  = document.getElementById('sidebar-overlay')!;
  const toggle   = document.getElementById('sidebar-toggle')!;
  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };
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
      if (!coverImageFile) applyThemeToPreview();
    });
  });
}

function applyThemeToPreview() {
  const theme  = THEMES[activeThemeIndex];
  const bg     = document.getElementById('cover-preview-bg')!;
  const title  = document.getElementById('cover-preview-title')!;
  const author = document.getElementById('cover-preview-author')!;
  bg.style.background = theme.gradient;
  bg.style.backgroundImage = '';
  bg.style.backgroundSize = '';
  bg.style.backgroundPosition = '';
  title.className  = 'cover-preview-title'  + (theme.dark ? ' dark' : '');
  author.className = 'cover-preview-author' + (theme.dark ? ' dark' : '');
}

function setupLivePreview() {
  const titleInput  = document.getElementById('f-title')  as HTMLInputElement;
  const authorInput = document.getElementById('f-author') as HTMLInputElement;

  applyThemeToPreview();

  titleInput.addEventListener('input', () => {
    document.getElementById('cover-preview-title')!.textContent = titleInput.value.trim() || 'Title';
  });
  authorInput.addEventListener('input', () => {
    document.getElementById('cover-preview-author')!.textContent = authorInput.value.trim() || 'Author';
  });
}

function setupPdfUpload() {
  const input = document.getElementById('f-pdf') as HTMLInputElement;
  const drop  = document.getElementById('pdf-drop')!;
  const label = document.getElementById('pdf-filename')!;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    pdfFile = file;
    label.textContent = file.name;
    drop.classList.add('has-file');
  });

  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file && file.type === 'application/pdf') {
      pdfFile = file;
      label.textContent = file.name;
      drop.classList.add('has-file');
    }
  });
}

function setupCoverImageUpload() {
  const input      = document.getElementById('f-cover-image') as HTMLInputElement;
  const btn        = document.getElementById('cover-upload-btn')!;
  const lbl        = document.getElementById('cover-upload-label')!;
  const removeBtn  = document.getElementById('btn-remove-cover') as HTMLButtonElement;
  const themeLabel = document.getElementById('theme-label')!;
  const themeGrid  = document.getElementById('theme-grid')!;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    coverImageFile = file;
    if (coverImageObjectUrl) URL.revokeObjectURL(coverImageObjectUrl);
    coverImageObjectUrl = URL.createObjectURL(file);

    const bg = document.getElementById('cover-preview-bg')!;
    bg.style.background = 'none';
    bg.style.backgroundImage = `url(${coverImageObjectUrl})`;
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';

    lbl.textContent = file.name;
    btn.classList.add('has-image');
    removeBtn.style.display = '';
    themeLabel.style.opacity = '0.4';
    themeGrid.style.opacity  = '0.4';
    themeGrid.style.pointerEvents = 'none';
  });

  removeBtn.addEventListener('click', () => {
    coverImageFile = null;
    if (coverImageObjectUrl) { URL.revokeObjectURL(coverImageObjectUrl); coverImageObjectUrl = null; }
    input.value = '';
    lbl.textContent = 'Upload cover image';
    btn.classList.remove('has-image');
    removeBtn.style.display = 'none';
    themeLabel.style.opacity = '';
    themeGrid.style.opacity  = '';
    themeGrid.style.pointerEvents = '';
    applyThemeToPreview();
  });
}

async function uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) {
    console.warn(`Upload to ${bucket} failed:`, error.message);
    return null;
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
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
  const btn  = document.getElementById('submit-btn') as HTMLButtonElement;

  form.addEventListener('submit', async e => {
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

    const stamp = `${userId}/${Date.now()}`;

    let pdfUrl: string | null = null;
    if (pdfFile) {
      pdfUrl = await uploadFile('book-pdfs', `${stamp}-${pdfFile.name}`, pdfFile);
      if (!pdfUrl) {
        btn.classList.remove('loading');
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Library`;
        showError('PDF upload failed. Check that the "book-pdfs" storage bucket exists in your Supabase project and has the correct RLS policy, then try again.');
        return;
      }
    }

    let coverImageUrl: string | null = null;
    if (coverImageFile) {
      coverImageUrl = await uploadFile('book-covers', `${stamp}-${coverImageFile.name}`, coverImageFile);
      if (!coverImageUrl) showToast('Cover image upload failed — using gradient theme instead.');
    }

    const { error } = await supabase.from('books').insert({
      user_id:         userId,
      title,
      author,
      genres,
      status,
      description:     desc || null,
      cover_gradient:  theme.gradient,
      cover_dark:      theme.dark,
      pdf_url:         pdfUrl,
      cover_image_url: coverImageUrl,
    });

    btn.classList.remove('loading');
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add to Library`;

    if (error) { showError(error.message); return; }

    showToast('Book added to your library!');
    setTimeout(() => { window.location.href = '/dashboard.html'; }, 1200);
  });
}

init();
