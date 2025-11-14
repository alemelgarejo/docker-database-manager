/**
 * Debounce utility
 * Delays function execution until after a specified wait time has elapsed
 * since the last time it was invoked
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay (default: 300ms)
 * @param {Object} options - Optional configuration
 * @param {boolean} options.leading - Invoke on the leading edge (default: false)
 * @param {boolean} options.trailing - Invoke on the trailing edge (default: true)
 * @returns {Function} The debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => {
 *   console.log('Searching for:', query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 */
export function debounce(func, wait = 300, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeoutId = null;
  let lastCallTime = 0;

  return function debounced(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    lastCallTime = now;

    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Leading edge invocation
    if (leading && timeSinceLastCall >= wait) {
      func.apply(this, args);
    }

    // Trailing edge invocation
    if (trailing) {
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        timeoutId = null;
      }, wait);
    }
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 *
 * @param {Function} func - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle (default: 300ms)
 * @param {Object} options - Optional configuration
 * @param {boolean} options.leading - Invoke on the leading edge (default: true)
 * @param {boolean} options.trailing - Invoke on the trailing edge (default: true)
 * @returns {Function} The throttled function
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event handled');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(func, wait = 300, options = {}) {
  const { leading = true, trailing = true } = options;
  let timeoutId = null;
  let lastInvokeTime = 0;
  let lastArgs = null;
  let lastThis = null;

  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;

    return func.apply(thisArg, args);
  }

  function shouldInvoke(time) {
    const timeSinceLastInvoke = time - lastInvokeTime;
    return timeSinceLastInvoke >= wait;
  }

  function trailingEdge() {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(Date.now());
    }
    lastArgs = null;
    lastThis = null;
    return undefined;
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge();
    }

    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastInvoke;
    timeoutId = setTimeout(timerExpired, timeWaiting);
  }

  return function throttled(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timeoutId === null && leading) {
        lastInvokeTime = time;
        timeoutId = setTimeout(timerExpired, wait);
        return invokeFunc(time);
      }
      if (timeoutId === null) {
        timeoutId = setTimeout(timerExpired, wait);
      }
    }

    if (timeoutId === null && trailing) {
      timeoutId = setTimeout(timerExpired, wait);
    }

    return undefined;
  };
}
