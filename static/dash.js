// A small stand-in for the claude.ai Dashboard API the page was written against:
// dash.data(id) loads /data/<id>.json on first use, dash.onData(fn) redraws when
// anything arrives or the window resizes. It also checks every few minutes for
// a newer model run and reloads the data when one lands.
(() => {
  const cache = {};
  const listeners = [];
  let lastRun = null;

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function fire() {
    for (const fn of listeners) {
      try { fn(); } catch (err) { console.error(err); }
    }
  }

  function load(id) {
    cache[id] = { status: 'loading', data: [], refreshing: false, meta: [] };
    fetch('data/' + id + '.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((data) => { cache[id] = { status: 'ok', data, refreshing: false, meta: [] }; fire(); })
      .catch((err) => { cache[id] = { status: 'error', data: [], message: String(err), refreshing: false, meta: [] }; fire(); });
  }

  async function checkForNewRun() {
    try {
      const r = await fetch('data/slate.json', { cache: 'no-store' });
      const run = (await r.json())[0]?.generated_at;
      if (lastRun && run && run !== lastRun) {
        Object.keys(cache).forEach(load);
      }
      lastRun = run || lastRun;
    } catch (err) { /* offline for a moment; try again next time */ }
  }

  window.dash = {
    data(id) {
      if (!cache[id]) load(id);
      return cache[id];
    },
    onData(fn) {
      listeners.push(fn);
      try { fn(); } catch (err) { console.error(err); }
    },
    get colors() { return [css('--series-0'), css('--series-1'), css('--series-2')]; },
    setLink(name) { history.replaceState(null, '', '#' + name); },
  };

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fire, 150); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => location.reload());
  checkForNewRun();
  setInterval(checkForNewRun, 5 * 60 * 1000);
})();
