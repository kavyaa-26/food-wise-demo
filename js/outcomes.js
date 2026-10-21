/**
 * FoodWise AI — Food Outcome Tracking Engine
 * Manages tracking of remaining food: Reused, Redistributed, Discarded, and Under Review.
 * Enforces strict quantity verification and human sign-off for redistribution.
 */

const OutcomeTracker = {
  /**
   * Validate outcome data before recording
   */
  validateOutcome(data, inventoryItem, existingOutcomes = []) {
    const errors = [];

    if (!data.recordId) {
      errors.push('Target inventory record ID is required.');
      return { isValid: false, errors };
    }

    if (!inventoryItem) {
      errors.push('Selected food inventory record could not be found.');
      return { isValid: false, errors };
    }

    const prep = Number(inventoryItem.preparedQty) || 0;
    const served = Number(inventoryItem.servedQty) || 0;
    const remaining = Math.max(0, prep - served);

    const qty = Number(data.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push('Outcome quantity must be a positive number greater than 0.');
    }

    // Calculate how much outcome has ALREADY been recorded for this item
    const priorOutcomes = existingOutcomes.filter(o => o.recordId === data.recordId && (!data.id || o.id !== data.id));
    const totalPriorQty = priorOutcomes.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    if ((qty + totalPriorQty) - remaining > 0.0001) {
      errors.push(`Total outcome quantity (${qty + totalPriorQty} ${inventoryItem.unit}) exceeds available remaining food (${remaining} ${inventoryItem.unit}).`);
    }

    // Check for exact duplicate outcome entries
    const isDuplicate = priorOutcomes.some(o => 
      o.outcomeType === data.outcomeType &&
      Number(o.quantity) === qty &&
      o.destination === data.destination
    );
    if (isDuplicate) {
      errors.push('An identical outcome record already exists for this food batch.');
    }

    // Destination and verifiedBy
    if (!data.destination || !data.destination.trim()) {
      errors.push('Destination / Storage Location / Partner Name is required.');
    }

    if (!data.verifiedBy || !data.verifiedBy.trim()) {
      errors.push('Supervisor / Verifier signature name is required.');
    }

    // Redistribution requires explicit human safety checks confirmation
    if (data.outcomeType === 'Redistributed' && !data.safetyChecksPassed) {
      errors.push('Food safety verification checklist must be confirmed prior to food redistribution.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Calculate aggregated outcome totals across all logged outcomes
   * Strictly counts only recorded outcomes!
   */
  calculateTotals(outcomes = []) {
    let totalReused = 0;
    let totalRedistributed = 0;
    let totalDiscarded = 0;
    let totalUnderReview = 0;

    outcomes.forEach(o => {
      const q = Number(o.quantity) || 0;
      if (o.outcomeType === 'Reused') totalReused += q;
      else if (o.outcomeType === 'Redistributed') totalRedistributed += q;
      else if (o.outcomeType === 'Discarded') totalDiscarded += q;
      else if (o.outcomeType === 'Under Review') totalUnderReview += q;
    });

    return {
      reused: Number(totalReused.toFixed(1)),
      redistributed: Number(totalRedistributed.toFixed(1)),
      discarded: Number(totalDiscarded.toFixed(1)),
      underReview: Number(totalUnderReview.toFixed(1)),
      totalResolved: Number((totalReused + totalRedistributed + totalDiscarded).toFixed(1))
    };
  }
};

window.OutcomeTracker = OutcomeTracker;
