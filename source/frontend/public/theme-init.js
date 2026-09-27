// US-36: applies the saved or system theme before Angular starts, so a dark page never flashes white.
// An external file because the Content Security Policy forbids inline scripts. Same key as ThemeService.
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('visitwise-theme');
  } catch (e) {
    // Storage refused: fall back to the system setting.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();
