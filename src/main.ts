import './styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './auth';

function setupSearch(): void {
  const input = document.getElementById('search-input') as HTMLInputElement;
  const btn = document.getElementById('search-btn');
  if (!input || !btn) return;

  const search = () => {
    const q = input.value.trim();
    if (q) console.log('Searching for:', q);
  };

  btn.addEventListener('click', search);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search();
  });
}

function setupHamburger(): void {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close when a menu link is tapped
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target as Node) && e.target !== btn && !btn.contains(e.target as Node)) {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
  setupHamburger();
});
