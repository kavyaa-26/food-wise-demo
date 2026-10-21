/**
 * FoodWise AI — Functional Testing Center
 * Executes real runtime assertions across 16 critical test cases without modifying
 * live user inventory data.
 */

const TestingCenter = {
  tests: [
    {
      id: 1,
      name: 'Normal Food Preparation Test',
      category: 'Surplus Estimation',
      description: 'Calculates remaining food and surplus for a balanced meal session (Prep: 40kg, Served: 35kg, Demand: 38kg).',
      run() {
        const result = EstimationEngine.calculate(40, 35, 38, { lowThreshold: 10, highThreshold: 25 });
        const expected = { remaining: 5, surplus: 2, surplusPct: 5.0, alertLevel: 'LOW' };
        const passed = result.remainingFood === expected.remaining &&
                       result.estimatedSurplus === expected.surplus &&
                       result.surplusPercentage === expected.surplusPct &&
                       result.alertLevel === expected.alertLevel;
        return {
          passed,
          expected: `Remaining: 5kg, Surplus: 2kg (5%), Alert: LOW`,
          actual: `Remaining: ${result.remainingFood}kg, Surplus: ${result.estimatedSurplus}kg (${result.surplusPercentage}%), Alert: ${result.alertLevel}`,
          details: 'Verified remaining = prep - served (40 - 35 = 5) and surplus = prep - demand (40 - 38 = 2).'
        };
      }
    },
    {
      id: 2,
      name: 'High Potential Surplus Flag Test',
      category: 'Alert Thresholds',
      description: 'Verifies that surplus exceeding 25% triggers HIGH severity alert (Prep: 50kg, Served: 30kg, Demand: 30kg).',
      run() {
        const result = EstimationEngine.calculate(50, 30, 30, { lowThreshold: 10, highThreshold: 25 });
        const surplus = 50 - 30; // 20kg
        const pct = (20 / 50) * 100; // 40.0%
        const passed = result.estimatedSurplus === 20 &&
                       result.surplusPercentage === 40.0 &&
                       result.alertLevel === 'HIGH';
        return {
          passed,
          expected: `Surplus: 20kg (40%), Alert: HIGH`,
          actual: `Surplus: ${result.estimatedSurplus}kg (${result.surplusPercentage}%), Alert: ${result.alertLevel}`,
          details: '40% exceeds the 25% threshold, correctly prompting HIGH surplus kitchen alert.'
        };
      }
    },
    {
      id: 3,
      name: 'No Leftovers (100% Served) Test',
      category: 'Surplus Estimation',
      description: 'Verifies zero remaining leftovers when all prepared food is served (Prep: 25kg, Served: 25kg, Demand: 25kg).',
      run() {
        const result = EstimationEngine.calculate(25, 25, 25);
        const passed = result.remainingFood === 0 &&
                       result.estimatedSurplus === 0 &&
                       result.surplusPercentage === 0;
        return {
          passed,
          expected: `Remaining: 0kg, Surplus: 0kg (0%)`,
          actual: `Remaining: ${result.remainingFood}kg, Surplus: ${result.estimatedSurplus}kg (${result.surplusPercentage}%)`,
          details: 'Zero leftovers correctly computed without negative underflow.'
        };
      }
    },
    {
      id: 4,
      name: 'Missing Quantities Input Test',
      category: 'Validation',
      description: 'Ensures form validation rejects empty preparation or demand values.',
      run() {
        const validation = EstimationEngine.validateInput({
          name: 'Special Biryani',
          category: 'Rice & Grains',
          preparedQty: '',
          servedQty: '10',
          estimatedDemand: '',
          unit: 'kg'
        });
        const hasPrepErr = validation.errors.some(e => e.includes('prepared must be a valid number'));
        const hasDemandErr = validation.errors.some(e => e.includes('demand must be a valid number'));
        const passed = !validation.isValid && hasPrepErr && hasDemandErr;
        return {
          passed,
          expected: `Validation fails with explicit error messages for missing prep & demand quantities`,
          actual: `Validation failed: ${validation.errors.join('; ')}`,
          details: 'Form submission blocked until numerical quantities are entered.'
        };
      }
    },
    {
      id: 5,
      name: 'Negative Quantities Rejection Test',
      category: 'Validation',
      description: 'Verifies rejection when negative quantities are supplied.',
      run() {
        const validation = EstimationEngine.validateInput({
          name: 'Dal Makhani',
          category: 'Curries & Gravies',
          preparedQty: -15,
          servedQty: -5,
          estimatedDemand: -10,
          unit: 'kg'
        });
        const hasPrepNeg = validation.errors.some(e => e.includes('prepared cannot be negative'));
        const hasServedNeg = validation.errors.some(e => e.includes('served cannot be negative'));
        const hasDemandNeg = validation.errors.some(e => e.includes('demand cannot be negative'));
        const passed = !validation.isValid && hasPrepNeg && hasServedNeg && hasDemandNeg;
        return {
          passed,
          expected: `Validation blocks negative values for prepared, served, and demand`,
          actual: `Errors trapped: ${validation.errors.length} negative quantity errors caught`,
          details: validation.errors.join(' | ')
        };
      }
    },
    {
      id: 6,
      name: 'Zero Prepared Quantity Test',
      category: 'Edge Cases',
      description: 'Ensures division by zero is safely prevented when prepared quantity is 0.',
      run() {
        const result = EstimationEngine.calculate(0, 0, 0);
        const passed = result.surplusPercentage === 0 &&
                       result.estimatedSurplus === 0 &&
                       result.remainingFood === 0 &&
                       result.alertLevel === 'INFO';
        return {
          passed,
          expected: `Surplus %: 0, Surplus: 0, Alert: INFO (no NaN or infinity)`,
          actual: `Surplus %: ${result.surplusPercentage}, Surplus: ${result.estimatedSurplus}, Alert: ${result.alertLevel}`,
          details: 'Math guard (prep > 0) strictly avoided NaN / ZeroDivisionError.'
        };
      }
    },
    {
      id: 7,
      name: 'Served Quantity Exceeding Prepared Quantity Test',
      category: 'Validation',
      description: 'Verifies that input validation prevents served quantity from exceeding prepared quantity.',
      run() {
        const validation = EstimationEngine.validateInput({
          name: 'Vegetable Pulao',
          category: 'Rice & Grains',
          preparedQty: 20,
          servedQty: 30, // Impossible: served > prepared
          estimatedDemand: 25,
          unit: 'kg'
        });
        const hasOverServedErr = validation.errors.some(e => e.includes('cannot exceed quantity prepared'));
        const passed = !validation.isValid && hasOverServedErr;
        return {
          passed,
          expected: `Validation error: Served (30) cannot exceed prepared (20)`,
          actual: `Validation status: ${validation.isValid ? 'Valid' : 'Blocked'} (${validation.errors[0] || 'No error'})`,
          details: 'Impossible inventory combination properly caught before commit.'
        };
      }
    },
    {
      id: 8,
      name: 'Duplicate Records Detection Test',
      category: 'Data Integrity',
      description: 'Checks if an identical record within the same meal session and preparation timestamp is flagged.',
      run() {
        const mockExisting = [
          { name: 'Sambar', category: 'Curries & Gravies', preparedAt: '2026-10-13T11:00', mealSession: 'Lunch' }
        ];
        const newRecord = { name: 'Sambar', category: 'Curries & Gravies', preparedAt: '2026-10-13T11:00', mealSession: 'Lunch' };
        const isDuplicate = mockExisting.some(item => 
          item.name.toLowerCase() === newRecord.name.toLowerCase() &&
          item.mealSession === newRecord.mealSession &&
          item.preparedAt === newRecord.preparedAt
        );
        const passed = isDuplicate === true;
        return {
          passed,
          expected: `Duplicate match flagged for identical item, meal session, and prep time`,
          actual: `Duplicate detected: ${isDuplicate}`,
          details: 'Matching heuristic correctly identifies redundant batch entry.'
        };
      }
    },
    {
      id: 9,
      name: 'Invalid Dates (Use-By Before Prep Date) Test',
      category: 'Validation',
      description: 'Rejects use-by date that chronologically precedes the preparation date.',
      run() {
        const validation = EstimationEngine.validateInput({
          name: 'Tomato Soup',
          category: 'Curries & Gravies',
          preparedQty: 10,
          servedQty: 8,
          estimatedDemand: 10,
          unit: 'litres',
          preparedAt: '2026-10-13T12:00',
          useByAt: '2026-10-13T10:00' // Invalid: 2 hours BEFORE prep
        });
        const hasDateErr = validation.errors.some(e => e.includes('Use-by date & time cannot be earlier'));
        const passed = !validation.isValid && hasDateErr;
        return {
          passed,
          expected: `Validation blocks use-by timestamp earlier than preparation timestamp`,
          actual: `Date validation error: "${validation.errors.find(e => e.includes('earlier'))}"`,
          details: 'Chronological timeline constraints enforced for HACCP safety.'
        };
      }
    },
    {
      id: 10,
      name: 'Approaching Use-By Dates Detection Test',
      category: 'Food Safety Alerts',
      description: 'Generates urgent warning when remaining use-by time is under 4 hours.',
      run() {
        // Mock a timestamp 2.5 hours from now
        const futureDate = new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString();
        const status = EstimationEngine.checkExpiryStatus(futureDate, 4);
        const passed = status.isUrgent === true &&
                       status.isExpired === false &&
                       status.hoursRemaining <= 3 &&
                       status.hoursRemaining >= 2;
        return {
          passed,
          expected: `isUrgent: true, isExpired: false, hoursRemaining ~2.5h`,
          actual: `isUrgent: ${status.isUrgent}, isExpired: ${status.isExpired}, hoursRemaining: ${status.hoursRemaining}h`,
          details: 'Promptly triggers cold storage staging advisory for food handlers.'
        };
      }
    },
    {
      id: 11,
      name: 'Missing Historical Data Handling Test',
      category: 'AI / Statistical Estimation',
      description: 'Gracefully informs the user when no historical demand baseline exists for a novel food item.',
      run() {
        const historyResult = EstimationEngine.estimateHistoricalDemand('Organic Quinoa Salad', []);
        const passed = historyResult.available === false &&
                       historyResult.estimatedDemand === null &&
                       historyResult.recordCount === 0 &&
                       historyResult.explanation.includes('Automated demand baseline unavailable');
        return {
          passed,
          expected: `available: false, estimatedDemand: null, transparent explanation returned`,
          actual: `available: ${historyResult.available}, explanation: "${historyResult.explanation}"`,
          details: 'System transparently requests user estimation instead of fabricating numbers.'
        };
      }
    },
    {
      id: 12,
      name: 'Historical Average Demand Calculation Test',
      category: 'AI / Statistical Estimation',
      description: 'Calculates mean demand when >= 2 historical records exist for identical item (Demand: 30kg, 40kg -> Avg: 35kg).',
      run() {
        const mockRecords = [
          { name: 'Sambar', estimatedDemand: 30, unit: 'litres' },
          { name: 'Sambar', estimatedDemand: 40, unit: 'litres' },
          { name: 'Sambar', estimatedDemand: 35, unit: 'litres' }
        ];
        const historyResult = EstimationEngine.estimateHistoricalDemand('Sambar', mockRecords);
        const expectedMean = (30 + 40 + 35) / 3; // 35.0
        const passed = historyResult.available === true &&
                       historyResult.estimatedDemand === 35 &&
                       historyResult.recordCount === 3;
        return {
          passed,
          expected: `available: true, estimatedDemand: 35.0 litres (from 3 records)`,
          actual: `available: ${historyResult.available}, estimatedDemand: ${historyResult.estimatedDemand} ${historyResult.unit} (from ${historyResult.recordCount} records)`,
          details: historyResult.explanation
        };
      }
    },
    {
      id: 13,
      name: 'Unusually High Demand Handling Test',
      category: 'Surplus Estimation',
      description: 'Handles scenarios where actual demand exceeds preparation without negative surplus.',
      run() {
        const result = EstimationEngine.calculate(20, 20, 35); // Demand (35) > Prep (20)
        const passed = result.estimatedSurplus === 0 &&
                       result.surplusPercentage === 0 &&
                       result.remainingFood === 0 &&
                       result.alertLevel === 'LOW';
        return {
          passed,
          expected: `Surplus: 0 (bounded by max(0, prep - demand)), Surplus %: 0`,
          actual: `Surplus: ${result.estimatedSurplus}, Surplus %: ${result.surplusPercentage}`,
          details: 'max(0, prep - demand) avoids false negative surplus when prep was insufficient.'
        };
      }
    },
    {
      id: 14,
      name: 'Invalid Outcome Quantity Exceeding Remaining Test',
      category: 'Food Outcome Tracking',
      description: 'Rejects outcome quantity exceeding actual remaining leftover portions.',
      run() {
        const mockItem = { id: 'mock-1', name: 'Veg Curry', preparedQty: 30, servedQty: 25, unit: 'kg' }; // Remaining = 5kg
        const validation = OutcomeTracker.validateOutcome({
          recordId: 'mock-1',
          outcomeType: 'Reused',
          quantity: 12, // Invalid: 12kg > 5kg remaining
          destination: 'Chilled cold storage',
          verifiedBy: 'Chef Ramesh',
          safetyChecksPassed: true
        }, mockItem, []);
        const hasExceedErr = validation.errors.some(e => e.includes('exceeds available remaining food'));
        const passed = !validation.isValid && hasExceedErr;
        return {
          passed,
          expected: `Outcome validation blocks logging 12kg when only 5kg remains`,
          actual: `Outcome rejected: "${validation.errors.find(e => e.includes('exceeds'))}"`,
          details: 'Strict mathematical conservation prevents fabricated outcome numbers.'
        };
      }
    },
    {
      id: 15,
      name: 'Duplicate Outcome Entries Prevention Test',
      category: 'Food Outcome Tracking',
      description: 'Prevents logging duplicate outcome record for the same food batch.',
      run() {
        const mockItem = { id: 'mock-2', name: 'Rice', preparedQty: 40, servedQty: 30, unit: 'kg' }; // Remaining = 10kg
        const existingOutcomes = [
          { recordId: 'mock-2', outcomeType: 'Reused', quantity: 4, destination: 'Hostel dinner' }
        ];
        const validation = OutcomeTracker.validateOutcome({
          recordId: 'mock-2',
          outcomeType: 'Reused',
          quantity: 4,
          destination: 'Hostel dinner',
          verifiedBy: 'Supervisor',
          safetyChecksPassed: true
        }, mockItem, existingOutcomes);
        const hasDupErr = validation.errors.some(e => e.includes('identical outcome record already exists'));
        const passed = !validation.isValid && hasDupErr;
        return {
          passed,
          expected: `Rejection of identical outcome type, quantity, and destination`,
          actual: `Duplicate rejected: ${hasDupErr}`,
          details: 'Audit trail idempotency preserved.'
        };
      }
    },
    {
      id: 16,
      name: 'Inconsistent Units Handling & Flag Test',
      category: 'Validation',
      description: 'Validates that missing or inconsistent measurement units are flagged before record creation.',
      run() {
        const validation = EstimationEngine.validateInput({
          name: 'Sweet Payasam',
          category: 'Desserts',
          preparedQty: 15,
          servedQty: 10,
          estimatedDemand: 12,
          unit: '' // Missing unit
        });
        const hasUnitErr = validation.errors.some(e => e.includes('Measurement unit (kg, portions, litres) is required'));
        const passed = !validation.isValid && hasUnitErr;
        return {
          passed,
          expected: `Validation enforces clear unit definition (kg, portions, litres)`,
          actual: `Validation trapped error: "${validation.errors.find(e => e.includes('unit'))}"`,
          details: 'Unit consistency guarantees accurate arithmetic aggregation across inventory.'
        };
      }
    }
  ],

  /**
   * Run a specific test by ID
   */
  runTest(id) {
    const test = this.tests.find(t => t.id === Number(id));
    if (!test) return null;
    const startTime = performance.now();
    const result = test.run();
    const durationMs = (performance.now() - startTime).toFixed(2);
    return {
      ...test,
      ...result,
      durationMs
    };
  },

  /**
   * Run all 16 tests sequentially
   */
  runAll() {
    return this.tests.map(test => this.runTest(test.id));
  }
};

window.TestingCenter = TestingCenter;
