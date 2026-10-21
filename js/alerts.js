/**
 * FoodWise AI — Alert Center Engine
 * Analyzes kitchen inventory in real-time to generate operational advisories,
 * potential surplus warnings, anomaly flags, and use-by reminders.
 */

const AlertCenter = {
  /**
   * Scan entire inventory to generate active system alerts
   */
  generateAlerts(inventory = [], reviews = {}, settings = null) {
    const activeSettings = settings || (typeof store !== 'undefined' ? store.getSettings() : {
      lowThreshold: 10,
      highThreshold: 25,
      expiryAlertHours: 4
    });

    const alerts = [];

    inventory.forEach(item => {
      const prep = Number(item.preparedQty) || 0;
      const served = Number(item.servedQty) || 0;
      const demand = Number(item.estimatedDemand) || 0;
      const metrics = EstimationEngine.calculate(prep, served, demand, activeSettings);
      const remaining = Math.max(0, prep - served);

      // 1. High Potential Surplus Alert
      if (metrics.alertLevel === 'HIGH' && prep > 0) {
        const alertId = `alert-${item.id}-high-surplus`;
        const review = reviews[alertId] || { status: 'Active', notes: '' };
        alerts.push({
          id: alertId,
          recordId: item.id,
          foodName: item.name,
          category: item.category,
          unit: item.unit || 'kg',
          type: 'HIGH_SURPLUS',
          title: 'High Potential Surplus Flag',
          severity: 'HIGH',
          reason: `Estimated surplus is ${metrics.estimatedSurplus} ${item.unit} (${metrics.surplusPercentage}% of total batch), exceeding the ${activeSettings.highThreshold}% demonstration threshold.`,
          recommendedAction: 'Coordinate with dining floor staff to prevent secondary batch prep. If remaining portion is safe, initiate redistribution review or cold-chain staging.',
          metrics,
          reviewStatus: review.status || 'Active',
          reviewNotes: review.notes || '',
          reviewedAt: review.reviewedAt || null
        });
      }

      // 2. Unusual Quantities / Anomaly Alert
      if (prep > 15 && served === 0) {
        const alertId = `alert-${item.id}-zero-served`;
        const review = reviews[alertId] || { status: 'Active', notes: '' };
        alerts.push({
          id: alertId,
          recordId: item.id,
          foodName: item.name,
          category: item.category,
          unit: item.unit || 'kg',
          type: 'UNUSUAL_QUANTITY',
          title: 'Unusual Quantity: Zero Consumption Logged',
          severity: 'MODERATE',
          reason: `Batch size is ${prep} ${item.unit}, but zero portions are recorded as served. Check if dining log is incomplete or if meal service was delayed.`,
          recommendedAction: 'Verify if dining session is still active or update actual served portions before concluding meal service.',
          metrics,
          reviewStatus: review.status || 'Active',
          reviewNotes: review.notes || '',
          reviewedAt: review.reviewedAt || null
        });
      }

      // 3. Approaching or Expired Best-Before / Use-By Date
      if (item.useByAt) {
        const expiryStatus = EstimationEngine.checkExpiryStatus(item.useByAt, activeSettings.expiryAlertHours);
        if (expiryStatus.isUrgent) {
          const alertId = `alert-${item.id}-expiry`;
          const review = reviews[alertId] || { status: 'Active', notes: '' };
          alerts.push({
            id: alertId,
            recordId: item.id,
            foodName: item.name,
            category: item.category,
            unit: item.unit || 'kg',
            type: 'EXPIRY_WARNING',
            title: expiryStatus.isExpired ? 'Use-By Window Expired' : 'Approaching Use-By Limit',
            severity: expiryStatus.isExpired ? 'HIGH' : 'MODERATE',
            reason: expiryStatus.label,
            recommendedAction: expiryStatus.isExpired
              ? 'Human inspection mandatory: Do not redistribute without rigorous organoleptic and temperature checks. Record outcome as Discarded if spoiled.'
              : 'Immediate kitchen action: Expedite service or stage in 4°C chilled refrigeration.',
            metrics,
            reviewStatus: review.status || 'Active',
            reviewNotes: review.notes || '',
            reviewedAt: review.reviewedAt || null
          });
        }
      } else {
        // 4. Missing Information Alert
        const alertId = `alert-${item.id}-missing-useby`;
        const review = reviews[alertId] || { status: 'Active', notes: '' };
        alerts.push({
          id: alertId,
          recordId: item.id,
          foodName: item.name,
          category: item.category,
          unit: item.unit || 'kg',
          type: 'MISSING_INFO',
          title: 'Missing Perishable Use-By Timestamp',
          severity: 'INFO',
          reason: `No use-by timestamp recorded for batch "${item.name}". Food safety compliance requires clear holding limits.`,
          recommendedAction: 'Edit record to assign a verified use-by deadline based on kitchen HACCP guidelines.',
          metrics,
          reviewStatus: review.status || 'Active',
          reviewNotes: review.notes || '',
          reviewedAt: review.reviewedAt || null
        });
      }
    });

    return alerts;
  },

  /**
   * Filter alerts by status or severity
   */
  filterAlerts(alerts, filter = 'ALL') {
    if (filter === 'ACTIVE') return alerts.filter(a => a.reviewStatus === 'Active');
    if (filter === 'REVIEWED') return alerts.filter(a => a.reviewStatus !== 'Active');
    if (filter === 'HIGH') return alerts.filter(a => a.severity === 'HIGH');
    if (filter === 'EXPIRY') return alerts.filter(a => a.type === 'EXPIRY_WARNING');
    return alerts;
  }
};

window.AlertCenter = AlertCenter;
