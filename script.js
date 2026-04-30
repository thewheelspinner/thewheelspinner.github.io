function track(event, props) {
  if (window.posthog) window.posthog.capture(event, props);
}

function wheelApp() {
  const PRESETS = {
    vivid:  ['#a78bfa', '#f472b6', '#fb923c', '#fbbf24', '#2dd4bf', '#60a5fa', '#4ade80', '#e879f9'],
    pastel: ['#c4b5fd', '#f9a8d4', '#fdba74', '#fde68a', '#99f6e4', '#bfdbfe', '#bbf7d0', '#f5d0fe'],
    mono:   ['#64748b', '#475569', '#94a3b8', '#334155', '#6b7280', '#4b5563', '#9ca3af', '#374151']
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

  return {
    entries: ['Alex', 'Bella', 'Chris', 'David', 'Emma', 'Frank', 'Grace', 'Henry'],
    lists: LISTS,
    rotation: 0,
    spinning: false,
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

    init() {
      try {
        const saved = JSON.parse(localStorage.getItem('wheelApp') || 'null');
        if (saved) {
          if (Array.isArray(saved.entries) && saved.entries.length >= 2) this.entries = saved.entries;
          if (saved.stylePreset && PRESETS[saved.stylePreset]) this.stylePreset = saved.stylePreset;
          if (saved.spinDuration) this.spinDuration = saved.spinDuration;
          if (saved.minRounds) this.minRounds = saved.minRounds;
          if (saved.maxRounds) this.maxRounds = saved.maxRounds;
        }
      } catch (_) {}

      this.$watch('stylePreset', (val) => {
        this.persist();
        track('style_changed', { preset: val });
      });
      this.$watch('spinDuration', () => this.persist());
    },

    persist() {
      try {
        localStorage.setItem('wheelApp', JSON.stringify({
          entries: this.entries,
          stylePreset: this.stylePreset,
          spinDuration: this.spinDuration,
          minRounds: this.minRounds,
          maxRounds: this.maxRounds
        }));
      } catch (_) {}
    },

    entryColor(index) {
      const colors = PRESETS[this.stylePreset] || PRESETS.vivid;
      return colors[index % colors.length];
    },

    get wheelStyle() {
      const colors = PRESETS[this.stylePreset] || PRESETS.vivid;
      const count = this.entries.length;
      const angle = 360 / count;
      const stops = this.entries
        .map((_, i) => {
          const start = Math.round(i * angle);
          const end = Math.round((i + 1) * angle);
          return `${colors[i % colors.length]} ${start}deg ${end}deg`;
        })
        .join(', ');
      const transition = this.noTransition
        ? 'none'
        : `transform ${this.spinDuration}s cubic-bezier(.17,.67,.26,1)`;
      return `background: conic-gradient(from -90deg, ${stops}); transform: rotate(${this.rotation}deg); transition: ${transition};`;
    },

    labelStyle(index) {
      const count = this.entries.length;
      const angle = 360 / count;
      const centerAngle = -90 + index * angle + angle / 2;
      return `transform: rotate(${centerAngle}deg) translateY(-50%);`;
    },

    // ── Entry CRUD ──────────────────────────────────────────────

    loadPreset(name) {
      const preset = LISTS[name];
      if (!preset) return;
      this.entries = [...preset];
      this.winnerLabel = '';
      this.persist();
      track('preset_loaded', { preset: name, entries_count: preset.length });
    },

    addEntry() {
      const val = this.newEntryValue.trim();
      if (!val || this.entries.length >= 20) return;
      this.entries = [...this.entries, val];
      this.newEntryValue = '';
      this.showAddInput = false;
      this.persist();
      track('entry_added', { entry: val, entries_count: this.entries.length });
    },

    deleteEntry(index) {
      if (this.entries.length <= 2 || this.spinning) return;
      const removed = this.entries[index];
      this.entries = this.entries.filter((_, i) => i !== index);
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
      for (let i = this.entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.entries[i], this.entries[j]] = [this.entries[j], this.entries[i]];
      }
      this.persist();
      track('entries_shuffled', { entries_before: before, entries_after: [...this.entries] });
    },

    sortEntries() {
      if (this.spinning) return;
      this.entries = [...this.entries].sort((a, b) => a.localeCompare(b));
      this.persist();
      track('entries_sorted', {});
    },

    // ── Header actions ──────────────────────────────────────────

    newWheel() {
      if (this.spinning) return;
      this.entries = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
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
      navigator.clipboard?.writeText(window.location.href).then(() => {
        this.copied = true;
        setTimeout(() => { this.copied = false; }, 2000);
      });
      track('wheel_shared', {});
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
      this.spinning = true;
      this.winnerLabel = '';

      const count = this.entries.length;
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
        entries_count: count,
        style_preset: this.stylePreset,
        spin_duration: this.spinDuration,
        rounds_actual: rounds
      });

      window.setTimeout(() => {
        this.winnerLabel = this.entries[winnerIndex];
        this.spinning = false;
        track('winner_revealed', {
          winner: this.winnerLabel,
          winner_index: winnerIndex,
          entries_count: count
        });
      }, this.spinDuration * 1000 + 80);
    }
  };
}
