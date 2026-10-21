/**
 * FoodWise AI — Estimation & Predictive Intelligence Engine
 * 
 * Implements transparent statistical demand estimation and potential surplus calculations.
 * Adheres strictly to hackathon truthfulness: explicitly distinguishes between
 * empirical statistical averaging and rule-based boundary models without false ML claims.
 */

const EstimationEngine = {
  /**
   * Calculate potential surplus and remaining food using standard formulas
   * 
   * Formulas:
   * Remaining Food = Quantity Prepared - Quantity Served
   * Estimated Surplus = max(0, Quantity Prepared - Estimated Demand)
   * Surplus Percentage = Estimated Surplus / Quantity Prepared * 100
   */
  calculate(preparedQty, servedQty, estimatedDemand, thresholds = null) {
    const prep = Math.max(0, Number(preparedQty) || 0);
    const served = Math.max(0, Number(servedQty) || 0);
    const demand = Math.max(0, Number(estimatedDemand) || 0);

    const activeThresholds = thresholds || (typeof store !== 'undefined' ? store.getSettings() : {
      lowThreshold: 10,
      highThreshold: 25
    });

    // Remaining food after service (rounded to 1 decimal place)
    const remainingFood = Number(Math.max(0, prep - served).toFixed(1));

    // Potential surplus over estimated demand (rounded to 1 decimal place)
    const estimatedSurplus = Number(Math.max(0, prep - demand).toFixed(1));

    // Percentage of prepared food that is surplus
    const surplusPercentage = prep > 0 
      ? Number(((estimatedSurplus / prep) * 100).toFixed(1))
      : 0;

    // Determine alert tier based on configurable demo thresholds
    let alertLevel = 'LOW'; // LOW, MODERATE, HIGH
    let alertClass = 'badge-success';
    let alertLabel = 'Low Potential Surplus';

    if (prep === 0) {
      alertLevel = 'INFO';
      alertClass = 'badge-neutral';
      alertLabel = 'No Preparation Logged';
    } else if (surplusPercentage > activeThresholds.highThreshold) {
      alertLevel = 'HIGH';
      alertClass = 'badge-danger';
      alertLabel = 'High Potential Surplus';
    } else if (surplusPercentage >= activeThresholds.lowThreshold) {
      alertLevel = 'MODERATE';
      alertClass = 'badge-warning';
      alertLabel = 'Moderate Potential Surplus';
    }

    // Mathematical explanation
    const mathExplanation = prep > 0
      ? `Prepared (${prep}) minus Estimated Demand (${demand}) = ${estimatedSurplus} surplus (${surplusPercentage}% of preparation).`
      : 'Preparation quantity is 0; surplus cannot be computed.';

    // Actionable recommendation
    const recommendedAction = this.getSuggestedAction(alertLevel, estimatedSurplus, remainingFood);

    return {
      preparedQty: prep,
      servedQty: served,
      estimatedDemand: demand,
      remainingFood,
      estimatedSurplus,
      surplusPercentage,
      alertLevel,
      alertClass,
      alertLabel,
      mathExplanation,
      recommendedAction,
      thresholds: activeThresholds
    };
  },

  /**
   * Suggest practical operations actions based on calculated surplus
   */
  getSuggestedAction(alertLevel, surplusQty, remainingFood) {
    if (alertLevel === 'HIGH') {
      return 'Immediate Kitchen Action: Review portioning for subsequent batch. Initiate chilled holding protocol and alert verified redistribution partner if surplus cannot be safely held.';
    }
    if (alertLevel === 'MODERATE') {
      return 'Operational Advisory: Monitor attendance closely during remaining service window. Stage secondary prep batch only if demand surges.';
    }
    if (alertLevel === 'INFO') {
      return 'Awaiting input: Record batch preparation quantity to calculate operational metrics.';
    }
    return 'Optimal Planning: Food preparation closely matches demand. Continue standard meal monitoring.';
  },

  /**
   * Historical Demand Estimation
   * Uses historical recorded demand for the same food item if >= 2 records exist.
   * If insufficient data exists, returns transparent explanation requiring explicit input.
   */
  estimateHistoricalDemand(foodItemName, existingRecords = []) {
    if (!foodItemName || !foodItemName.trim()) {
      return {
        available: false,
        estimatedDemand: null,
        recordCount: 0,
        explanation: 'Please enter a food item name to query historical kitchen records.'
      };
    }

    const normalizedTarget = foodItemName.trim().toLowerCase();
    
    // Find matching historical records with valid demand numbers
    const matches = existingRecords.filter(item => {
      const name = (item.name || '').trim().toLowerCase();
      const hasDemand = item.estimatedDemand !== undefined && item.estimatedDemand !== null && Number(item.estimatedDemand) > 0;
      return name === normalizedTarget && hasDemand;
    });

    // We require at least 2 historical observations for statistical mean
    if (matches.length >= 2) {
      const sumDemand = matches.reduce((acc, curr) => acc + Number(curr.estimatedDemand), 0);
      const avgDemand = Math.round((sumDemand / matches.length) * 10) / 10;

      return {
        available: true,
        estimatedDemand: avgDemand,
        recordCount: matches.length,
        unit: matches[0].unit || 'kg',
        explanation: `Calculated from ${matches.length} recorded service sessions for "${foodItemName}" (Historical Average: ${avgDemand} ${matches[0].unit || 'kg'}). Statistical model: Sample Mean.`
      };
    }

    if (matches.length === 1) {
      return {
        available: false,
        estimatedDemand: Number(matches[0].estimatedDemand),
        recordCount: 1,
        unit: matches[0].unit || 'kg',
        explanation: `Only 1 prior record found for "${foodItemName}". At least 2 historical service cycles are required for reliable automated averaging. Please provide an explicit demand estimate.`
      };
    }

    return {
      available: false,
      estimatedDemand: null,
      recordCount: 0,
      explanation: `No prior service history recorded for "${foodItemName}". Automated demand baseline unavailable. Please specify your estimated meal attendance/demand.`
    };
  },

  /**
   * Check for approaching use-by date
   */
  checkExpiryStatus(useByAt, alertHours = 4) {
    if (!useByAt) {
      return { isUrgent: false, isExpired: false, hoursRemaining: null, label: 'No use-by date set' };
    }

    const now = new Date();
    const useBy = new Date(useByAt);
    const diffMs = useBy - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs <= 0) {
      return {
        isUrgent: true,
        isExpired: true,
        hoursRemaining: 0,
        label: 'Best-before / use-by time has passed. Mandatory sensory & safety audit required before redistribution.'
      };
    }

    if (diffHours <= alertHours) {
      return {
        isUrgent: true,
        isExpired: false,
        hoursRemaining: Number(diffHours.toFixed(1)),
        label: `Expiring within ${diffHours.toFixed(1)} hours. Prioritize immediate chilled storage or dispatch.`
      };
    }

    return {
      isUrgent: false,
      isExpired: false,
      hoursRemaining: Number(diffHours.toFixed(1)),
      label: `Safe (${diffHours.toFixed(1)} hours remaining)`
    };
  },

  /**
   * Validation of food inventory inputs
   */
  validateInput(data) {
    const errors = [];

    // Food Name
    if (!data.name || !data.name.trim()) {
      errors.push('Food item name is required.');
    }

    // Category
    if (!data.category || !data.category.trim()) {
      errors.push('Food category is required.');
    }

    // Prepared Qty
    const prep = Number(data.preparedQty);
    if (isNaN(prep) || prep === null || data.preparedQty === '') {
      errors.push('Quantity prepared must be a valid number.');
    } else if (prep < 0) {
      errors.push('Quantity prepared cannot be negative.');
    }

    // Served Qty
    const served = Number(data.servedQty);
    if (isNaN(served) || served === null || data.servedQty === '') {
      errors.push('Quantity served must be a valid number.');
    } else if (served < 0) {
      errors.push('Quantity served cannot be negative.');
    } else if (!isNaN(prep) && served > prep) {
      errors.push(`Quantity served (${served}) cannot exceed quantity prepared (${prep}).`);
    }

    // Estimated Demand
    const demand = Number(data.estimatedDemand);
    if (isNaN(demand) || demand === null || data.estimatedDemand === '') {
      errors.push('Estimated demand must be a valid number.');
    } else if (demand < 0) {
      errors.push('Estimated demand cannot be negative.');
    }

    // Unit
    if (!data.unit || !data.unit.trim()) {
      errors.push('Measurement unit (kg, portions, litres) is required.');
    }

    // Date validation: invalid date strings and timeline check
    const prepValid = data.preparedAt && !isNaN(new Date(data.preparedAt).getTime());
    const useByValid = data.useByAt && !isNaN(new Date(data.useByAt).getTime());

    if (data.preparedAt && !prepValid) {
      errors.push('Preparation date & time is invalid.');
    }
    if (data.useByAt && !useByValid) {
      errors.push('Use-by date & time is invalid.');
    }
    if (prepValid && useByValid) {
      const prepDate = new Date(data.preparedAt);
      const useByDate = new Date(data.useByAt);
      if (useByDate < prepDate) {
        errors.push('Use-by date & time cannot be earlier than preparation date & time.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

window.EstimationEngine = EstimationEngine;
