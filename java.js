// Smooth numeric animation
function animateValue(element, start, end, duration = 800) {
    const range = end - start;
    if (range === 0) return;
    let startTime = null;
  
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const value = start + range * progress;
      element.textContent = value.toFixed(2);
      if (progress < 1) requestAnimationFrame(step);
    }
  
    requestAnimationFrame(step);
  }
  
  // Mock fetch WiFi speed (replace with real API)
  async function fetchWifiSpeed() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          download: (Math.random() * 150 + 20),
          upload: (Math.random() * 50 + 10),
          ping: (Math.random() * 50 + 10)
        });
      }, 800);
    });
  }
  
  // Format speed based on unit
  function formatSpeed(value, unit) {
    if (unit === 'Kbps') return (value * 1000).toFixed(0);
    return value.toFixed(2);
  }
  
  class WifiSpeedMonitor {
    constructor(config) {
      this.downloadEl = config.downloadEl;
      this.uploadEl = config.uploadEl;
      this.pingEl = config.pingEl;
      this.errorEl = config.errorEl;
      this.unitToggleBtn = config.unitToggleBtn;
      this.copyBtns = config.copyBtns;
      this.downloadReportBtn = config.downloadReportBtn;
      this.networkStatusEl = config.networkStatusEl;
      this.darkModeToggleBtn = config.darkModeToggleBtn;
  
      this.currentSpeed = { download: 0, upload: 0, ping: 0 };
      this.unit = 'Mbps';
      this.isFetching = false;
      this.interval = null;
      this.updateIntervalMs = 4000;
  
      this.speedHistory = {
        download: [],
        upload: [],
        ping: []
      };
  
      this.init();
    }
  
    init() {
      this.unitToggleBtn.addEventListener('click', () => this.toggleUnit());
      this.copyBtns.forEach(btn => btn.addEventListener('click', e => this.copySpeed(e)));
      this.downloadReportBtn.addEventListener('click', () => this.downloadReport());
      this.darkModeToggleBtn.addEventListener('click', () => this.toggleDarkMode());
      window.addEventListener('online', () => this.updateNetworkStatus(true));
      window.addEventListener('offline', () => this.updateNetworkStatus(false));
      this.updateNetworkStatus(navigator.onLine);
    }
  
    async updateSpeed() {
      if (this.isFetching) return;
      this.isFetching = true;
      this.errorEl.textContent = '';
  
      try {
        const speed = await fetchWifiSpeed();
  
        animateValue(this.downloadEl, this.currentSpeed.download, speed.download, 1000);
        animateValue(this.uploadEl, this.currentSpeed.upload, speed.upload, 1000);
        animateValue(this.pingEl, this.currentSpeed.ping, speed.ping, 1000);
  
        this.currentSpeed = speed;
        this.recordHistory(speed);
  
        this.updateSpeedText();
  
      } catch (err) {
        this.errorEl.textContent = '⚠️ Unable to fetch WiFi speed. Retrying...';
        console.warn(err);
      } finally {
        this.isFetching = false;
      }
    }
  
    recordHistory(speed) {
      const maxHistory = 30; // keep last 30 readings (~2 mins)
      this.speedHistory.download.push(speed.download);
      this.speedHistory.upload.push(speed.upload);
      this.speedHistory.ping.push(speed.ping);
  
      if (this.speedHistory.download.length > maxHistory) {
        this.speedHistory.download.shift();
        this.speedHistory.upload.shift();
        this.speedHistory.ping.shift();
      }
  
      this.renderChart();
    }
  
    renderChart() {
      if (!this.chartCanvas) {
        this.chartCanvas = document.querySelector('#speed-chart');
        if (!this.chartCanvas) return;
        this.chartCtx = this.chartCanvas.getContext('2d');
      }
  
      const ctx = this.chartCtx;
      const width = this.chartCanvas.width;
      const height = this.chartCanvas.height;
  
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
  
      // Draw grid lines
      ctx.strokeStyle = 'rgba(79, 158, 248, 0.15)';
      ctx.lineWidth = 1;
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = (height / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
  
      // Draw lines function
      const drawLine = (data, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const stepX = width / (data.length - 1);
        data.forEach((value, i) => {
          const x = i * stepX;
          const y = height - (value / 200) * height; // assuming max ~200 Mbps/ping
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };
  
      drawLine(this.speedHistory.download, 'rgba(79, 158, 248, 0.9)'); // blue
      drawLine(this.speedHistory.upload, 'rgba(120, 200, 150, 0.8)');   // green
      drawLine(this.speedHistory.ping, 'rgba(240, 90, 90, 0.9)');       // red
    }
  
    updateSpeedText() {
      this.downloadEl.textContent = formatSpeed(this.currentSpeed.download, this.unit);
      this.uploadEl.textContent = formatSpeed(this.currentSpeed.upload, this.unit);
      this.pingEl.textContent = formatSpeed(this.currentSpeed.ping, this.unit);
    }
  
    toggleUnit() {
      this.unit = this.unit === 'Mbps' ? 'Kbps' : 'Mbps';
      this.unitToggleBtn.textContent = this.unit;
      this.updateSpeedText();
    }
  
    copySpeed(e) {
      const target = e.currentTarget;
      let text = '';
      if (target.dataset.type === 'download') {
        text = `${formatSpeed(this.currentSpeed.download, this.unit)} ${this.unit}`;
      } else if (target.dataset.type === 'upload') {
        text = `${formatSpeed(this.currentSpeed.upload, this.unit)} ${this.unit}`;
      } else if (target.dataset.type === 'ping') {
        text = `${formatSpeed(this.currentSpeed.ping, this.unit)} ms`;
      }
  
      navigator.clipboard.writeText(text).then(() => {
        this.showCopyFeedback(target, 'Copied!');
      }).catch(() => {
        this.showCopyFeedback(target, 'Failed to copy');
      });
    }
  
    showCopyFeedback(target, message) {
      const tooltip = document.createElement('span');
      tooltip.className = 'copy-feedback';
      tooltip.textContent = message;
      tooltip.style.position = 'absolute';
      tooltip.style.top = '-28px';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.padding = '4px 8px';
      tooltip.style.borderRadius = '8px';
      tooltip.style.background = 'var(--clr-primary)';
      tooltip.style.color = 'var(--clr-bg-dark)';
      tooltip.style.fontWeight = '700';
      tooltip.style.fontSize = '0.8rem';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.userSelect = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.3s ease';
  
      target.style.position = 'relative';
      target.appendChild(tooltip);
  
      requestAnimationFrame(() => {
        tooltip.style.opacity = '1';
      });
  
      setTimeout(() => {
        tooltip.style.opacity = '0';
        setTimeout(() => {
          tooltip.remove();
        }, 300);
      }, 1200);
    }
  
    downloadReport() {
      const header = 'Timestamp,Download (Mbps),Upload (Mbps),Ping (ms)\n';
      const now = new Date();
      const rows = this.speedHistory.download.map((_, i) => {
        const ts = new Date(now.getTime() - (this.speedHistory.download.length - 1 - i) * this.updateIntervalMs).toISOString();
        return `${ts},${this.speedHistory.download[i].toFixed(2)},${this.speedHistory.upload[i].toFixed(2)},${this.speedHistory.ping[i].toFixed(2)}`;
      }).join('\n');
  
      const csvContent = header + rows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wifi-speed-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  
    toggleDarkMode() {
      const root = document.documentElement;
      root.classList.toggle('dark-mode');
    }
  
    updateNetworkStatus(isOnline) {
      if (isOnline) {
        this.networkStatusEl.textContent = '🟢 Online';
        this.networkStatusEl.style.color = 'var(--clr-primary)';
      } else {
        this.networkStatusEl.textContent = '🔴 Offline';
        this.networkStatusEl.style.color = '#ff5c5c';
      }
    }
  
    start() {
      this.updateSpeed();
      this.interval = setInterval(() => this.updateSpeed(), this.updateIntervalMs);
    }
  
    stop() {
      clearInterval(this.interval);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const wifiMonitor = new WifiSpeedMonitor({
      downloadEl: document.querySelector('#download-speed'),
      uploadEl: document.querySelector('#upload-speed'),
      pingEl: document.querySelector('#ping-speed'),
      errorEl: document.querySelector('#error-msg'),
      unitToggleBtn: document.querySelector('#unit-toggle'),
      copyBtns: document.querySelectorAll('.copy-btn'),
      downloadReportBtn: document.querySelector('#download-report'),
      networkStatusEl: document.querySelector('#network-status'),
      darkModeToggleBtn: document.querySelector('#dark-mode-toggle'),
    });
  
    wifiMonitor.start();
  });
  