// main.js - Minimal vanilla JS for the Cryptodira landing page

document.addEventListener('DOMContentLoaded', () => {
  // Set current year in footer (already has <span id="year"></span>)
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Fade-in sections on scroll (subtle entrance animation)
  const fadeElements = document.querySelectorAll('.fade-in');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  fadeElements.forEach(el => observer.observe(el));

  // Smooth scrolling for any internal anchors (if added later)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Placeholder for future Solana integration (commented out)
  // Example: Connect wallet button stub
  // const connectBtn = document.getElementById('connect-wallet');
  // if (connectBtn) {
  //   connectBtn.addEventListener('click', async () => {
  //     // Future: window.solana.connect() or @solana/web3.js logic
  //     alert('Wallet connect coming in a future slow & steady phase 🐢');
  //   });
  // }
});