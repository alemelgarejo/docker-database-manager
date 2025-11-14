/**
 * Unit Tests for AppState
 * Run with: node AppState.test.js
 */

import { AppState } from '../AppState.js';

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n�� Running AppState Tests\n');
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message || 'Assertion failed');
};

const runner = new TestRunner();

runner.test('AppState initializes with default state', () => {
  const state = new AppState();
  assert(state.data.allContainers.length === 0);
  assert(state.ui.activeTab === 'dashboard');
});

runner.test('setData and getData work correctly', () => {
  const state = new AppState();
  state.setData('allContainers', [{ id: 1 }]);
  assert(state.getData('allContainers').length === 1);
});

runner.test('setUI and getUI work correctly', () => {
  const state = new AppState();
  state.setUI('activeTab', 'databases');
  assert(state.getUI('activeTab') === 'databases');
});

runner.test('Modal state management', () => {
  const state = new AppState();
  state.setModal('currentRenameContainerId', 'container-123');
  assert(state.getModal('currentRenameContainerId') === 'container-123');
});

runner.test('Component management', () => {
  const state = new AppState();
  const mockComponent = { id: 'test' };
  state.setComponent('searchFilters', mockComponent);
  assert(state.getComponent('searchFilters') === mockComponent);
});

runner.test('State subscription and notifications', () => {
  const state = new AppState();
  let notified = false;
  
  const unsubscribe = state.subscribe('data.allContainers', () => {
    notified = true;
  });
  
  state.setData('allContainers', [{ id: 1 }]);
  assert(notified);
  unsubscribe();
});

runner.test('getSnapshot returns complete state', () => {
  const state = new AppState();
  state.setData('allContainers', [{ id: 1 }]);
  const snapshot = state.getSnapshot();
  assert(snapshot.data.allContainers.length === 1);
});

runner.test('reset() clears state correctly', () => {
  const state = new AppState();
  state.setData('allContainers', [{ id: 1 }]);
  state.reset();
  assert(state.getData('allContainers').length === 0);
});

runner.test('History can be enabled and disabled', () => {
  const state = new AppState();
  state.enableHistory();
  assert(state.history.enabled === true);
  state.disableHistory();
  assert(state.history.enabled === false);
});

runner.test('History saves and retrieves correctly', () => {
  const state = new AppState();
  state.enableHistory();
  
  // Save initial state
  state.setData('allContainers', [], true);
  assert(state.history.past.length === 1);
});

runner.test('getHistoryInfo returns correct information', () => {
  const state = new AppState();
  state.enableHistory();
  const info = state.getHistoryInfo();
  assert(info.enabled === true);
});

runner.test('CPU history management', () => {
  const state = new AppState();
  state.addCPUHistory(50);
  state.addCPUHistory(60);
  assert(state.getMonitoring('cpuHistory').length === 2);
});

runner.test('Memory history management', () => {
  const state = new AppState();
  state.addMemoryHistory(1024);
  assert(state.getMonitoring('memoryHistory').length === 1);
});

runner.test('Clear monitoring history', () => {
  const state = new AppState();
  state.addCPUHistory(50);
  state.clearMonitoringHistory();
  assert(state.getMonitoring('cpuHistory').length === 0);
});

runner.test('getStats returns correct statistics', () => {
  const state = new AppState();
  state.setData('allContainers', [{ id: 1 }, { id: 2 }]);
  const stats = state.getStats();
  assert(stats.containers === 2);
});

runner.test('Invalid keys handled gracefully', () => {
  const state = new AppState();
  state.setData('invalidKey', 'value');
  state.setUI('invalidKey', 'value');
  assert(true); // Should not throw
});

runner.run();
