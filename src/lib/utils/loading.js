/**
 * Loading state utilities
 */

export function showLoading(translationKey = 'loading') {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  if (loadingOverlay && loadingText) {
    loadingText.setAttribute('data-i18n', translationKey);
    loadingText.textContent = getLoadingText(translationKey);
    loadingOverlay.classList.add('active');
  }
}

export function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('active');
  }
}

function getLoadingText(key) {
  const texts = {
    loading: 'Loading...',
    creatingDatabase: 'Creating database...',
    downloadingImage: 'Downloading Docker image...',
    connectingDatabase: 'Connecting to database...',
    executingQuery: 'Executing query...',
  };
  return texts[key] || texts.loading;
}
