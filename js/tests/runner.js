/**
 * Test runner with organized test structure
 */

import { getElementById, clearElement, setTextContent } from '../utils/dom.js';

const testRegistry = [];

export function test(name, testFunction) {
  testRegistry.push({ name, fn: testFunction });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function mountTests() {
  const testList = getElementById('testList');
  clearElement(testList);
  
  let passCount = 0;
  
  for (const testCase of testRegistry) {
    const listItem = createTestListItem(testCase);
    testList.appendChild(listItem);
    
    if (isTestPassed(listItem)) {
      passCount++;
    }
  }
  
  updateTestSummary(passCount, testRegistry.length);
}

function createTestListItem(testCase) {
  const listItem = document.createElement('li');
  listItem.textContent = testCase.name + ' … ';
  
  try {
    testCase.fn();
    markTestAsPassed(listItem);
  } catch (error) {
    markTestAsFailed(listItem, error);
  }
  
  return listItem;
}

function markTestAsPassed(listItem) {
  listItem.className = 'test-ok';
  listItem.textContent += 'PASS';
}

function markTestAsFailed(listItem, error) {
  listItem.className = 'test-fail';
  listItem.textContent += 'FAIL — ' + error.message;
}

function isTestPassed(listItem) {
  return listItem.className === 'test-ok';
}

function updateTestSummary(passCount, totalCount) {
  const summaryElement = getElementById('testSummary');
  setTextContent(summaryElement, `${passCount}/${totalCount} passed`);
}

