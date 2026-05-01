function track(event, props) {
  if (window.posthog) window.posthog.capture(event, props);
}

function wheelApp() {
  const PRESETS = {
    vivid:  ['#a78bfa', '#f472b6', '#fb923c', '#fbbf24', '#2dd4bf', '#60a5fa', '#4ade80', '#e879f9'],
    pastel: ['#c4b5fd', '#f9a8d4', '#fdba74', '#fde68a', '#99f6e4', '#bfdbfe', '#bbf7d0', '#f5d0fe'],
    mono:   ['#64748b', '#475569', '#94a3b8', '#334155', '#6b7280', '#4b5563', '#9ca3af', '#374151'],
    neon:   ['#ff0055', '#ff8c00', '#ffee00', '#00e676', '#00b0ff', '#aa00ff', '#d500f9', '#00e5ff'],
    retro:  ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'],
    earth:  ['#c2773a', '#a44a3f', '#7d8c50', '#4a7c59', '#b87333', '#8b6355', '#9aab6f', '#d4956a'],
  };

  // If an entry label matches a known color name, use it as the segment color
  // (e.g. "Team Colors" preset). Otherwise the active style palette is used.
  const NAMED_COLORS = {
    'Red': '#ef4444', 'Orange': '#f97316', 'Yellow': '#eab308', 'Green': '#22c55e',
    'Blue': '#3b82f6', 'Purple': '#a855f7', 'Pink': '#ec4899', 'Teal': '#14b8a6',
    'Cyan': '#06b6d4', 'Lime': '#84cc16', 'Indigo': '#6366f1', 'Violet': '#8b5cf6',
    'Brown': '#a16207', 'Black': '#374151', 'Gray': '#9ca3af', 'Grey': '#9ca3af',
    'Gold': '#f59e0b', 'Silver': '#cbd5e1', 'White': '#e2e8f0',
  };

  const LISTS = {
    'Yes / No':             ['Yes', 'No'],
    'Yes / No / Maybe':     ['Yes', 'No', 'Maybe'],
    'Rock Paper Scissors':  ['Rock', 'Paper', 'Scissors'],
    'Compass Directions':   ['North', 'South', 'East', 'West'],
    'Numbers 1–8':          ['1', '2', '3', '4', '5', '6', '7', '8'],
    'Days of the Week':     ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    'Months':               ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    'Fruits':               ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Orange', 'Pear', 'Strawberry'],
    'Food for Tonight':     ['Pizza', 'Sushi', 'Burger', 'Tacos', 'Pasta', 'Ramen', 'Salad', 'Steak'],
    'Team Colors':          ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'],
    'Coin Flip':            ['Heads', 'Tails'],
    'Priority':             ['Do it now', 'Schedule it', 'Delegate it', 'Drop it'],
  };

  // slug → entries lookup used by URL-based preset loading
  const SLUG_MAP = Object.fromEntries(
    Object.entries(LISTS).map(([name, entries]) => [
      name.toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      entries
    ])
  );

  return {
    entries: ['Alex', 'Bella', 'Chris', 'David', 'Emma', 'Frank', 'Grace', 'Henry'],
    customColors: [], // sparse parallel array — per-entry hex overrides
    lists: LISTS,
    rotation: 0,
    spinning: false,
    idling: false,      // true while the ambient idle rotation RAF is driving the wheel
    winnerLabel: '',
    spinDuration: 3,
    minRounds: 5,
    maxRounds: 9,
    stylePreset: 'vivid',
    noTransition: false,
    copied: false,

    editingIndex: -1,
    editingValue: '',
    showAddInput: false,
    newEntryValue: '',
    newEntryColor: '',

    // When entries < 4, repeat them to fill the wheel (at least 6 segments).
    // The list panel still shows only the canonical entries.
    get displayEntries() {
      const n = this.entries.length;
      if (n >= 4) return this.entries;
      const times = Math.ceil(6 / n);
      const arr = [];
      for (let i = 0; i < times; i++) arr.push(...this.entries);
      return arr;
    },

    init() {
      const presetSlug = (window.__PRESET__ || new URLSearchParams(location.search).get('preset') || '').trim();

      if (presetSlug && SLUG_MAP[presetSlug]) {
        this.entries = [...SLUG_MAP[presetSlug]];
        this.customColors = [];
        track('preset_page_loaded', { preset: presetSlug });
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem('wheelApp') || 'null');
          if (saved) {
            if (Array.isArray(saved.entries) && saved.entries.length >= 2) this.entries = saved.entries;
            if (Array.isArray(saved.customColors)) this.customColors = saved.customColors;
            if (saved.stylePreset && PRESETS[saved.stylePreset]) this.stylePreset = saved.stylePreset;
            if (saved.spinDuration) this.spinDuration = saved.spinDuration;
            if (saved.minRounds) this.minRounds = saved.minRounds;
            if (saved.maxRounds) this.maxRounds = saved.maxRounds;
          }
        } catch (_) {}
      }

      this.$watch('stylePreset', (val) => {
        this.persist();
        track('style_changed', { preset: val });
      });
      this.$watch('spinDuration', () => this.persist());

      this._startIdleAnimation();
    },

    _startIdleAnimation() {
      let last = null;
      const tick = (ts) => {
        if (!this.spinning) {
          if (last !== null) {
            // 360° per 30 000 ms — one slow revolution every 30 s
            this.rotation += (ts - last) * (360 / 30000);
          }
          last = ts;
          this.idling = true;
        } else {
          last = null;
          this.idling = false;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    persist() {
      if (window.__PRESET__) return;
      try {
        localStorage.setItem('wheelApp', JSON.stringify({
          entries: this.entries,
          customColors: this.customColors,
          stylePreset: this.stylePreset,
          spinDuration: this.spinDuration,
          minRounds: this.minRounds,
          maxRounds: this.maxRounds
        }));
      } catch (_) {}
    },

    // Palette color for an entry index, ignoring any overrides (used as color-picker seed)
    paletteColor(index) {
      const colors = PRESETS[this.stylePreset] || PRESETS.vivid;
      return colors[index % colors.length];
    },

    // Resolved color: named-color > custom override > palette
    entryColor(index) {
      const label = this.entries[index];
      if (NAMED_COLORS[label]) return NAMED_COLORS[label];
      if (this.customColors[index]) return this.customColors[index];
      return this.paletteColor(index);
    },

    setEntryColor(index, hex) {
      const arr = [...this.customColors];
      while (arr.length <= index) arr.push('');
      // If user picks the palette colour, clear the override so style changes still apply
      arr[index] = hex === this.paletteColor(index) ? '' : hex;
      this.customColors = arr;
      this.persist();
    },

    get wheelStyle() {
      const colors = PRESETS[this.stylePreset] || PRESETS.vivid;
      const origLen = this.entries.length;
      const disp = this.displayEntries;
      const count = disp.length;
      const angle = 360 / count;
      const stops = disp
        .map((label, i) => {
          const start = Math.round(i * angle);
          const end = Math.round((i + 1) * angle);
          const origIdx = i % origLen;
          const color = NAMED_COLORS[label] || this.customColors[origIdx] || colors[origIdx % colors.length];
          return `${color} ${start}deg ${end}deg`;
        })
        .join(', ');
      const transition = (this.noTransition || this.idling)
        ? 'none'
        : `transform ${this.spinDuration}s cubic-bezier(.17,.67,.26,1)`;
      return `background: conic-gradient(from -90deg, ${stops}); transform: rotate(${this.rotation}deg); transition: ${transition};`;
    },

    labelStyle(index) {
      const count = this.displayEntries.length;
      const angle = 360 / count;
      const centerAngle = -180 + index * angle + angle / 2;
      const widthPct = Math.min(37, 20 + count * 2.1).toFixed(1);
      return `width: ${widthPct}%; transform: rotate(${centerAngle}deg) translateY(-50%);`;
    },

    // ── Entry CRUD ──────────────────────────────────────────────

    loadPreset(name) {
      const preset = LISTS[name];
      if (!preset) return;
      this.entries = [...preset];
      this.customColors = [];
      this.winnerLabel = '';
      this.persist();
      track('preset_loaded', { preset: name, entries_count: preset.length });
    },

    presetUrl(name) {
      return '/' + name.toLowerCase()
        .replace(/[–—]/g, '-')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '/';
    },

    addEntry() {
      const val = this.newEntryValue.trim();
      if (!val || this.entries.length >= 20) return;
      const colors = [...this.customColors];
      colors.push(this.newEntryColor || '');
      this.customColors = colors;
      this.entries = [...this.entries, val];
      this.newEntryValue = '';
      this.newEntryColor = '';
      this.showAddInput = false;
      this.persist();
      track('entry_added', { entry: val, entries_count: this.entries.length });
    },

    deleteEntry(index) {
      if (this.entries.length <= 2 || this.spinning) return;
      const removed = this.entries[index];
      this.entries = this.entries.filter((_, i) => i !== index);
      this.customColors = this.customColors.filter((_, i) => i !== index);
      this.persist();
      track('entry_deleted', { entry: removed, entries_count: this.entries.length });
    },

    startEdit(index) {
      this.editingIndex = index;
      this.editingValue = this.entries[index];
    },

    saveEdit() {
      const val = this.editingValue.trim();
      if (val && this.editingIndex >= 0) {
        const old = this.entries[this.editingIndex];
        const updated = [...this.entries];
        updated[this.editingIndex] = val;
        this.entries = updated;
        this.persist();
        track('entry_edited', { from: old, to: val });
      }
      this.editingIndex = -1;
      this.editingValue = '';
    },

    cancelEdit() {
      this.editingIndex = -1;
      this.editingValue = '';
    },

    shuffleEntries() {
      if (this.spinning) return;
      const before = [...this.entries];
      const combined = this.entries.map((e, i) => [e, this.customColors[i] || '']);
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }
      this.entries = combined.map(([e]) => e);
      this.customColors = combined.map(([, c]) => c);
      this.persist();
      track('entries_shuffled', { entries_before: before, entries_after: [...this.entries] });
    },

    sortEntries() {
      if (this.spinning) return;
      const combined = this.entries.map((e, i) => [e, this.customColors[i] || '']);
      combined.sort(([a], [b]) => a.localeCompare(b));
      this.entries = combined.map(([e]) => e);
      this.customColors = combined.map(([, c]) => c);
      this.persist();
      track('entries_sorted', {});
    },

    // ── Header actions ──────────────────────────────────────────

    newWheel() {
      if (this.spinning) return;
      this.entries = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
      this.customColors = [];
      this.noTransition = true;
      this.rotation = 0;
      this.winnerLabel = '';
      this.$nextTick(() => { this.noTransition = false; });
      this.persist();
      track('wheel_new', {});
    },

    saveEntries() {
      const blob = new Blob([this.entries.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wheel-entries.txt';
      a.click();
      URL.revokeObjectURL(a.href);
      track('entries_saved', { entries_count: this.entries.length });
    },

    shareWheel() {
      track('wheel_shared', {});
      if (navigator.share) {
        navigator.share({ title: document.title, url: window.location.href }).catch(() => {});
        return;
      }
      navigator.clipboard?.writeText(window.location.href).then(() => {
        this.copied = true;
        setTimeout(() => { this.copied = false; }, 2000);
      });
    },

    // ── Wheel actions ───────────────────────────────────────────

    resetWheel() {
      if (this.spinning) return;
      this.noTransition = true;
      this.rotation = 0;
      this.winnerLabel = '';
      this.$nextTick(() => { this.noTransition = false; });
      track('wheel_reset', {});
    },

    sanitizeRounds() {
      this.minRounds = Math.max(2, Math.min(20, Number(this.minRounds) || 5));
      this.maxRounds = Math.max(3, Math.min(30, Number(this.maxRounds) || 9));
      if (this.maxRounds <= this.minRounds) this.maxRounds = this.minRounds + 1;
    },

    spin() {
      if (this.spinning || this.entries.length < 2) return;
      this.sanitizeRounds();
      this.idling = false;  // restore transition before the rotation jump
      this.spinning = true;
      this.winnerLabel = '';

      const disp = this.displayEntries;
      const count = disp.length;
      const segmentAngle = 360 / count;
      const winnerIndex = Math.floor(Math.random() * count);
      const winnerCenter = winnerIndex * segmentAngle + segmentAngle / 2;
      const desiredAngle = (360 - winnerCenter) % 360;
      const currentAngle = ((this.rotation % 360) + 360) % 360;
      const correction = (desiredAngle - currentAngle + 360) % 360;
      const rounds = Math.floor(Math.random() * (this.maxRounds - this.minRounds + 1)) + this.minRounds;

      this.rotation += rounds * 360 + correction;

      track('wheel_spun', {
        entries: this.entries,
        entries_count: this.entries.length,
        style_preset: this.stylePreset,
        spin_duration: this.spinDuration,
        rounds_actual: rounds
      });

      window.setTimeout(() => {
        this.winnerLabel = disp[winnerIndex];
        this.spinning = false;
        track('winner_revealed', {
          winner: this.winnerLabel,
          winner_index: winnerIndex,
          entries_count: this.entries.length
        });
      }, this.spinDuration * 1000 + 80);
    }
  };
}
