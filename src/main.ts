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

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();
});
