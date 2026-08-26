/**
 * Theme pre-hydration bootstrap (issue #169).
 *
 * Runs before React hydrates so the first paint already reflects the user's
 * stored theme preference (falling back to the OS `prefers-color-scheme`).
 * The ThemeProvider reads the same storage key and takes over afterwards.
 *
 * This file is intentionally dependency-free and must stay valid ES5 so it
 * executes in every supported browser, including older WebViews.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'verinode-theme';
  var VALID_MODES = ['system', 'light', 'dark', 'hc-dark', 'hc-light'];

  try {
    var stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stored = null;
    }

    var mode = VALID_MODES.indexOf(stored) !== -1 ? stored : 'system';
    var prefersDark = false;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      prefersDark = true;
    }

    var isHc = mode === 'hc-dark' || mode === 'hc-light';
    var resolved = isHc ? (mode === 'hc-dark' ? 'dark' : 'light') : prefersDark ? 'dark' : 'light';
    if (mode === 'light' || mode === 'dark') {
      resolved = mode;
    }

    var root = document.documentElement;
    root.dataset.theme = isHc ? mode : resolved;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = resolved;
  } catch (e) {
    // Never block first paint on theme bootstrapping.
  }
})();
