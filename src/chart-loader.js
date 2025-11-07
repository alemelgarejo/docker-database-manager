// chart-loader.js - Carga Chart.js de forma segura
let chartInstance = null;

export async function loadChart() {
  if (chartInstance) {
    return chartInstance;
  }

  try {
    // Cargar desde CDN para evitar problemas con Vite
    return new Promise((resolve, reject) => {
      if (window.Chart) {
        chartInstance = window.Chart;
        resolve(chartInstance);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
      script.onload = () => {
        chartInstance = window.Chart;
        resolve(chartInstance);
      };
      script.onerror = () => reject(new Error('Failed to load Chart.js'));
      document.head.appendChild(script);
    });
  } catch (e) {
    console.error('Error loading Chart.js:', e);
    throw e;
  }
}
