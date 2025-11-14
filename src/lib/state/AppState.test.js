/**
 * Unit Tests for AppState
 * 
 * Basic test suite for verifying AppState functionality
 * Run these tests manually in the browser console via window.__DEV__.test.runAppStateTests()
 */

'use strict';

import { AppState } from './AppState.js';

/**
 * Simple test runner
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
  }

  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`${message}\nExpected truthy value, got: ${value}`);
    }
  }

  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`${message}\nExpected falsy value, got: ${value}`);
    }
  }

  async run() {
    console.log('%c🧪 Running AppState Tests...', 'color: #3b82f6; font-size: 16px; font-weight: bold');
    console.log('');

    this.results = { passed: 0, failed: 0, total: this.tests.length };

    for (const test of this.tests) {
      try {
        await test.fn(this);
        this.results.passed++;
        console.log(`%c✅ PASS%c ${test.name}`, 'color: #10b981; font-weight: bold', 'color: inherit');
      } catch (error) {
        this.results.failed++;
        console.error(`%c❌ FAIL%c ${test.name}`, 'color: #ef4444; font-weight: bold', 'color: inherit');
        console.error(`   ${error.message}`);
      }
    }

    console.log('');
    console.log('%c' + '='.repeat(50), 'color: #94a3b8');
    console.log(
      `%cResults: ${this.results.passed}/${this.results.total} passed`,
      `color: ${this.results.failed === 0 ? '#10b981' : '#ef4444'}; font-weight: bold; font-size: 14px`
    );
    
    if (this.results.failed === 0) {
      console.log('%c🎉 All tests passed!', 'color: #10b981; font-size: 14px');
    } else {
      console.log(`%c⚠️ ${this.results.failed} test(s) failed`, 'color: #ef4444; font-size: 14px');
    }

    return this.results;
  }
}

/**
 * Create test suite
 */
export function createAppStateTests() {
  const runner = new TestRunner();

  // Test 1: Initial state
  runner.test('should initialize with default values', (t) => {
    const state = new AppState();
    t.assertEqual(state.getData('allContainers'), [], 'allContainers should be empty array');
    t.assertEqual(state.getUI('activeTab'), 'dashboard', 'activeTab should be dashboard');
    t.assertTrue(state.getTauriAPI(), 'Tauri API should exist');
  });

  // Test 2: Set and get data
  runner.test('should set and get data correctly', (t) => {
    const state = new AppState();
    const testContainers = [{ id: '1', name: 'test' }];
    
    state.setData('allContainers', testContainers);
    t.assertEqual(state.getData('allContainers'), testContainers, 'Data should be set correctly');
  });

  // Test 3: Set and get UI state
  runner.test('should set and get UI state correctly', (t) => {
    const state = new AppState();
    
    state.setUI('activeTab', 'databases');
    t.assertEqual(state.getUI('activeTab'), 'databases', 'UI state should be set correctly');
  });

  // Test 4: Observers/Listeners
  runner.test('should notify listeners on state change', (t) => {
    const state = new AppState();
    let notified = false;
    let receivedValue = null;

    state.subscribe('data.allContainers', (value) => {
      notified = true;
      receivedValue = value;
    });

    const testData = [{ id: '1' }];
    state.setData('allContainers', testData);

    t.assertTrue(notified, 'Listener should be notified');
    t.assertEqual(receivedValue, testData, 'Listener should receive correct value');
  });

  // Test 5: Unsubscribe
  runner.test('should allow unsubscribing from listeners', (t) => {
    const state = new AppState();
    let callCount = 0;

    const unsubscribe = state.subscribe('data.allContainers', () => {
      callCount++;
    });

    state.setData('allContainers', [{ id: '1' }]);
    t.assertEqual(callCount, 1, 'Listener should be called once');

    unsubscribe();
    state.setData('allContainers', [{ id: '2' }]);
    t.assertEqual(callCount, 1, 'Listener should not be called after unsubscribe');
  });

  // Test 6: History (undo/redo)
  runner.test('should support undo/redo with history', (t) => {
    const state = new AppState();
    state.enableHistory();

    const initial = [{ id: '1' }];
    const updated = [{ id: '2' }];

    state.setData('allContainers', initial, true); // saveHistory = true
    state.setData('allContainers', updated, true);

    const historyInfo = state.getHistoryInfo();
    t.assertTrue(historyInfo.canUndo, 'Should be able to undo');

    const undoResult = state.undo();
    t.assertTrue(undoResult, 'Undo should succeed');
    t.assertEqual(state.getData('allContainers'), initial, 'Should restore previous state');

    t.assertTrue(historyInfo.canRedo, 'Should be able to redo');
  });

  // Test 7: Persistence
  runner.test('should support state persistence (mock)', (t) => {
    const state = new AppState();
    
    // Enable persistence
    state.enablePersistence(['ui.activeTab']);
    
    const persistence = state.getStats().persistence;
    t.assertTrue(persistence.enabled, 'Persistence should be enabled');
    t.assertTrue(persistence.keys.includes('ui.activeTab'), 'Should include persisted key');
  });

  // Test 8: Component management
  runner.test('should manage component references', (t) => {
    const state = new AppState();
    const mockComponent = { test: 'component' };

    state.setComponent('searchFilters', mockComponent);
    t.assertEqual(state.getComponent('searchFilters'), mockComponent, 'Component should be stored');

    state.setComponent('searchFilters', null);
    t.assertEqual(state.getComponent('searchFilters'), null, 'Component should be cleared');
  });

  // Test 9: Modal state
  runner.test('should manage modal state', (t) => {
    const state = new AppState();

    state.setModal('currentRenameContainerId', 'container-123');
    t.assertEqual(state.getModal('currentRenameContainerId'), 'container-123', 'Modal state should be set');
  });

  // Test 10: Monitoring history
  runner.test('should manage monitoring history', (t) => {
    const state = new AppState();

    state.addCPUHistory(50);
    state.addCPUHistory(60);
    state.addCPUHistory(70);

    const cpuHistory = state.getMonitoring('cpuHistory');
    t.assertEqual(cpuHistory.length, 3, 'Should have 3 CPU history points');
    t.assertEqual(cpuHistory[2], 70, 'Last CPU value should be 70');

    state.clearMonitoringHistory();
    t.assertEqual(state.getMonitoring('cpuHistory').length, 0, 'History should be cleared');
  });

  // Test 11: Stats
  runner.test('should provide accurate stats', (t) => {
    const state = new AppState();
    state.setData('allContainers', [{ id: '1' }, { id: '2' }]);
    state.setData('allImages', [{ id: 'img1' }]);

    const stats = state.getStats();
    t.assertEqual(stats.containers, 2, 'Should report correct container count');
    t.assertEqual(stats.images, 1, 'Should report correct image count');
  });

  // Test 12: Reset
  runner.test('should reset state correctly', (t) => {
    const state = new AppState();
    
    state.setData('allContainers', [{ id: '1' }]);
    state.setUI('activeTab', 'images');
    
    state.reset();
    
    t.assertEqual(state.getData('allContainers'), [], 'Containers should be reset');
    t.assertEqual(state.getUI('activeTab'), 'dashboard', 'UI should be reset');
  });

  // Test 13: Monitoring history max limit
  runner.test('should respect monitoring history max limit', (t) => {
    const state = new AppState();
    const maxPoints = state.getMonitoring('maxHistoryPoints');

    // Add more than max points
    for (let i = 0; i < maxPoints + 10; i++) {
      state.addCPUHistory(i);
    }

    const cpuHistory = state.getMonitoring('cpuHistory');
    t.assertEqual(cpuHistory.length, maxPoints, `Should not exceed ${maxPoints} points`);
  });

  // Test 14: Migration state
  runner.test('should manage migration state', (t) => {
    const state = new AppState();
    const config = { host: 'localhost', port: 5432 };

    state.setMigration('localPostgresConfig', config);
    t.assertEqual(state.getMigration('localPostgresConfig'), config, 'Migration config should be set');
  });

  // Test 15: Snapshot
  runner.test('should create state snapshot', (t) => {
    const state = new AppState();
    state.setData('allContainers', [{ id: '1' }]);
    state.setUI('activeTab', 'databases');

    const snapshot = state.getSnapshot();
    
    t.assertTrue(snapshot.data, 'Snapshot should include data');
    t.assertTrue(snapshot.ui, 'Snapshot should include UI state');
    t.assertEqual(snapshot.data.allContainers.length, 1, 'Snapshot data should be correct');
  });

  return runner;
}

/**
 * Run all tests
 */
export async function runAppStateTests() {
  const runner = createAppStateTests();
  return await runner.run();
}

// Export for use in dev tools
export default { createAppStateTests, runAppStateTests };
