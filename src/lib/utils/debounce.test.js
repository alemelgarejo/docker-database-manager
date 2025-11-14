/**
 * Debounce utility tests
 * Simple manual tests to verify debouncing behavior
 */

import { debounce, throttle } from './debounce.js';

/**
 * Test debounce functionality
 */
function testDebounce() {
  console.log('\n=== Testing Debounce ===');
  
  let callCount = 0;
  let lastValue = null;
  
  const debouncedFn = debounce((value) => {
    callCount++;
    lastValue = value;
    console.log(`[Debounced] Called with: ${value} (call #${callCount})`);
  }, 100);
  
  console.log('Calling debounced function 5 times rapidly...');
  debouncedFn('call-1');
  debouncedFn('call-2');
  debouncedFn('call-3');
  debouncedFn('call-4');
  debouncedFn('call-5');
  
  setTimeout(() => {
    console.log(`Result: Function was called ${callCount} time(s) with value: "${lastValue}"`);
    console.log(`Expected: Function should be called 1 time with value: "call-5"`);
    console.log(`✓ Test ${callCount === 1 && lastValue === 'call-5' ? 'PASSED' : 'FAILED'}`);
  }, 200);
}

/**
 * Test throttle functionality
 */
function testThrottle() {
  console.log('\n=== Testing Throttle ===');
  
  let callCount = 0;
  const calls = [];
  
  const throttledFn = throttle((value) => {
    callCount++;
    calls.push(value);
    console.log(`[Throttled] Called with: ${value} (call #${callCount})`);
  }, 100);
  
  console.log('Calling throttled function 5 times rapidly...');
  throttledFn('call-1');
  
  setTimeout(() => throttledFn('call-2'), 20);
  setTimeout(() => throttledFn('call-3'), 40);
  setTimeout(() => throttledFn('call-4'), 60);
  setTimeout(() => throttledFn('call-5'), 80);
  
  setTimeout(() => {
    console.log(`Result: Function was called ${callCount} time(s) with values:`, calls);
    console.log(`Expected: Function should be called 2 times (leading and trailing edge)`);
    console.log(`✓ Test ${callCount === 2 ? 'PASSED' : 'FAILED'}`);
  }, 300);
}

/**
 * Test real-world search scenario
 */
function testSearchScenario() {
  console.log('\n=== Testing Search Scenario ===');
  
  let searchCalls = 0;
  const searchResults = [];
  
  // Simulated search function
  const performSearch = debounce((query) => {
    searchCalls++;
    searchResults.push(query);
    console.log(`[Search] Executing search for: "${query}" (search #${searchCalls})`);
  }, 300);
  
  // Simulate user typing "docker"
  console.log('Simulating user typing "docker"...');
  const word = 'docker';
  for (let i = 0; i < word.length; i++) {
    const partial = word.substring(0, i + 1);
    setTimeout(() => {
      console.log(`  User typed: "${partial}"`);
      performSearch(partial);
    }, i * 50);
  }
  
  setTimeout(() => {
    console.log(`\nResult: Search was executed ${searchCalls} time(s) with queries:`, searchResults);
    console.log(`Expected: Search should be executed 1 time with query: "docker"`);
    console.log(`Benefit: ${6 - searchCalls} unnecessary API calls prevented!`);
    console.log(`✓ Test ${searchCalls === 1 && searchResults[0] === 'docker' ? 'PASSED' : 'FAILED'}`);
  }, 1000);
}

// Run tests
if (typeof window === 'undefined') {
  // Node.js environment
  console.log('Running debounce tests...\n');
  testDebounce();
  setTimeout(testThrottle, 300);
  setTimeout(testSearchScenario, 700);
} else {
  // Browser environment
  window.testDebounce = testDebounce;
  window.testThrottle = testThrottle;
  window.testSearchScenario = testSearchScenario;
  
  console.log('Debounce tests loaded. Run in console:');
  console.log('  testDebounce()');
  console.log('  testThrottle()');
  console.log('  testSearchScenario()');
}
