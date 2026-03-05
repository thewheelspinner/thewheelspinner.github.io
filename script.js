function wheelApp() {
  return {
    entries: ['Pizza', 'Sushi', 'Burger', 'Tacos', 'Pasta', 'Salad', 'Ramen', 'Steak'],
    entriesInput: '',
    rotation: 0,
    spinning: false,
    winnerLabel: '',
    spinDuration: 6,
    minRounds: 5,
    maxRounds: 9,
    activeTheme: 'neon',
    themes: {
      neon: {
        name: 'Neon Night',
        bg: 'radial-gradient(circle at 20% 20%, #1f2937 0%, #020617 65%)',
        colors: ['#22d3ee', '#34d399', '#f472b6', '#f59e0b', '#818cf8', '#fb7185', '#2dd4bf', '#c084fc']
      },
      sunset: {
        name: 'Sunset Pop',
        bg: 'radial-gradient(circle at 20% 20%, #7c2d12 0%, #1e1b4b 65%)',
        colors: ['#fdba74', '#fb7185', '#facc15', '#fb923c', '#f43f5e', '#a78bfa', '#f97316', '#eab308']
      },
      ocean: {
        name: 'Ocean Pulse',
        bg: 'radial-gradient(circle at 20% 20%, #082f49 0%, #020617 65%)',
        colors: ['#38bdf8', '#14b8a6', '#0ea5e9', '#22c55e', '#06b6d4', '#2dd4bf', '#0f766e', '#60a5fa']
      }
    },

    init() {
      this.entriesInput = this.entries.join('\n');
      this.applyThemeBackground();
      this.$watch('activeTheme', () => this.applyThemeBackground());
    },

    get wheelStyle() {
      const colors = this.themeColors();
      const angle = 360 / this.entries.length;
      const stops = this.entries
        .map((_, index) => {
          const start = (index * angle).toFixed(3);
          const end = ((index + 1) * angle).toFixed(3);
          const color = colors[index % colors.length];
          return `${color} ${start}deg ${end}deg`;
        })
        .join(', ');

      return `background: conic-gradient(from -90deg, ${stops}); transform: rotate(${this.rotation}deg); transition: transform ${this.spinDuration}s cubic-bezier(.17,.67,.26,1);`;
    },

    themeColors() {
      return this.themes[this.activeTheme]?.colors ?? this.themes.neon.colors;
    },

    applyThemeBackground() {
      const bg = this.themes[this.activeTheme]?.bg;
      if (bg) {
        document.body.style.background = bg;
      }
    },

    labelStyle(index) {
      const count = this.entries.length;
      const angle = 360 / count;
      const centerAngle = -90 + index * angle + angle / 2;
      const textRotate = centerAngle + 90;

      return `
        transform: rotate(${centerAngle}deg) translateY(-39%) rotate(${textRotate}deg);
      `;
    },

    syncEntries() {
      const next = this.entriesInput
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20);

      if (next.length >= 2) {
        this.entries = next;
      }
    },

    sanitizeRounds() {
      this.minRounds = Math.max(2, Math.min(20, Number(this.minRounds) || 5));
      this.maxRounds = Math.max(3, Math.min(30, Number(this.maxRounds) || 9));
      if (this.maxRounds <= this.minRounds) {
        this.maxRounds = this.minRounds + 1;
      }
    },

    spin() {
      if (this.spinning || this.entries.length < 2) {
        return;
      }

      this.sanitizeRounds();
      this.spinning = true;
      this.winnerLabel = '';

      const count = this.entries.length;
      const segmentAngle = 360 / count;
      const winnerIndex = Math.floor(Math.random() * count);
      const winnerCenter = winnerIndex * segmentAngle + segmentAngle / 2;

      const rounds = Math.floor(Math.random() * (this.maxRounds - this.minRounds + 1)) + this.minRounds;
      const target = rounds * 360 + (360 - winnerCenter);
      this.rotation += target;

      window.setTimeout(() => {
        this.winnerLabel = this.entries[winnerIndex];
        this.spinning = false;
      }, this.spinDuration * 1000 + 80);
    },

    shuffleEntries() {
      if (this.spinning) {
        return;
      }

      for (let i = this.entries.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.entries[i], this.entries[j]] = [this.entries[j], this.entries[i]];
      }

      this.entriesInput = this.entries.join('\n');
    }
  };
}
