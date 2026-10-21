/**
 * FoodWise AI — Dynamic Analytics & Visualization Engine
 * Renders Chart.js visual models styled in the premium specialty coffee aesthetic:
 * Cream (#F5EBDD), Chocolate Brown (#4A281B), Sage Green (#879477), Soft Olive (#B4B99A).
 */

const AnalyticsEngine = {
  charts: {
    prepVsServed: null,
    surplusByItem: null,
    outcomesBreakdown: null,
    surplusByCategory: null,
    trendsTimeline: null
  },

  // Color palette constants
  colors: {
    cream: '#F5EBDD',
    softBeige: '#E8D5BE',
    chocolateBrown: '#4A281B',
    deepBrown: '#2D1B15',
    sageGreen: '#879477',
    softOlive: '#B4B99A',
    terracotta: '#C26D53',
    amber: '#DDA15E',
    white: '#FFFFFF',
    borderBeige: '#D6C3AA'
  },

  /**
   * Aggregate statistics for dashboard and analytics views
   */
  getAggregateMetrics(inventory = [], outcomes = []) {
    let totalPrepared = 0;
    let totalServed = 0;
    let totalRemaining = 0;
    let totalEstimatedSurplus = 0;

    inventory.forEach(item => {
      const prep = Number(item.preparedQty) || 0;
      const served = Number(item.servedQty) || 0;
      const demand = Number(item.estimatedDemand) || 0;
      totalPrepared += prep;
      totalServed += served;
      totalRemaining += Math.max(0, prep - served);
      totalEstimatedSurplus += Math.max(0, prep - demand);
    });

    const outcomeTotals = OutcomeTracker.calculateTotals(outcomes);
    const overallSurplusPct = totalPrepared > 0 
      ? Number(((totalEstimatedSurplus / totalPrepared) * 100).toFixed(1)) 
      : 0;
    const overallServedPct = totalPrepared > 0 
      ? Number(((totalServed / totalPrepared) * 100).toFixed(1)) 
      : 0;

    return {
      totalPrepared: Number(totalPrepared.toFixed(1)),
      totalServed: Number(totalServed.toFixed(1)),
      totalRemaining: Number(totalRemaining.toFixed(1)),
      totalEstimatedSurplus: Number(totalEstimatedSurplus.toFixed(1)),
      surplusPercentage: overallSurplusPct,
      servedPercentage: overallServedPct,
      reused: outcomeTotals.reused,
      redistributed: outcomeTotals.redistributed,
      discarded: outcomeTotals.discarded,
      underReview: outcomeTotals.underReview,
      totalOutcomesResolved: outcomeTotals.totalResolved,
      itemCount: inventory.length
    };
  },

  /**
   * Initialize or update all dashboard & analytics charts
   */
  updateCharts(inventory = [], outcomes = []) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is loading or unavailable.');
      return;
    }

    this.renderPrepVsServedChart(inventory);
    this.renderSurplusByItemChart(inventory);
    this.renderOutcomesBreakdownChart(outcomes);
    this.renderSurplusByCategoryChart(inventory);
    this.renderTrendsTimelineChart(inventory);
  },

  /**
   * Clear empty state and restore canvas visibility
   */
  clearEmptyState(canvas) {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      const emptyDiv = parent.querySelector('.chart-empty-state');
      if (emptyDiv) emptyDiv.remove();
    }
    canvas.style.display = 'block';
  },

  /**
   * Chart 1: Prepared vs Served Quantities
   */
  renderPrepVsServedChart(inventory) {
    const ctx = document.getElementById('chartPrepVsServed');
    if (!ctx) return;

    if (this.charts.prepVsServed) {
      this.charts.prepVsServed.destroy();
    }

    if (inventory.length === 0) {
      this.renderEmptyState(ctx, 'No food records available.');
      return;
    }

    this.clearEmptyState(ctx);

    const labels = inventory.map(item => item.name.length > 18 ? item.name.substring(0, 16) + '...' : item.name);
    const prepData = inventory.map(item => Number(item.preparedQty) || 0);
    const servedData = inventory.map(item => Number(item.servedQty) || 0);

    this.charts.prepVsServed = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Prepared Quantity',
            data: prepData,
            backgroundColor: this.colors.chocolateBrown,
            borderColor: this.colors.deepBrown,
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Served Quantity',
            data: servedData,
            backgroundColor: this.colors.sageGreen,
            borderColor: this.colors.softOlive,
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.colors.deepBrown,
              font: { family: 'Plus Jakarta Sans', weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: this.colors.deepBrown,
            titleFont: { family: 'Playfair Display' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.colors.chocolateBrown, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(74, 40, 27, 0.08)' },
            ticks: { color: this.colors.chocolateBrown },
            title: { display: true, text: 'Quantity (mixed units)', color: this.colors.chocolateBrown }
          }
        }
      }
    });
  },

  /**
   * Chart 2: Potential Surplus by Food Item (Horizontal ranking)
   */
  renderSurplusByItemChart(inventory) {
    const ctx = document.getElementById('chartSurplusByItem');
    if (!ctx) return;

    if (this.charts.surplusByItem) {
      this.charts.surplusByItem.destroy();
    }

    if (inventory.length === 0) {
      this.renderEmptyState(ctx, 'No food records available.');
      return;
    }

    this.clearEmptyState(ctx);

    // Sort items by surplus descending
    const itemsWithSurplus = inventory
      .map(item => {
        const prep = Number(item.preparedQty) || 0;
        const demand = Number(item.estimatedDemand) || 0;
        const surplus = Math.max(0, prep - demand);
        const surplusPct = prep > 0 ? (surplus / prep) * 100 : 0;
        return { name: item.name, surplus, surplusPct, unit: item.unit };
      })
      .sort((a, b) => b.surplus - a.surplus)
      .slice(0, 6);

    const labels = itemsWithSurplus.map(i => i.name.length > 18 ? i.name.substring(0, 16) + '...' : i.name);
    const data = itemsWithSurplus.map(i => i.surplus);
    const backgroundColors = itemsWithSurplus.map(i => i.surplusPct > 25 ? this.colors.terracotta : this.colors.amber);

    this.charts.surplusByItem = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Estimated Potential Surplus',
          data,
          backgroundColor: backgroundColors,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: this.colors.deepBrown
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = itemsWithSurplus[context.dataIndex];
                return `Surplus: ${context.parsed.x} ${item.unit} (${item.surplusPct.toFixed(1)}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(74, 40, 27, 0.08)' },
            ticks: { color: this.colors.chocolateBrown },
            title: { display: true, text: 'Surplus Quantity', color: this.colors.chocolateBrown }
          },
          y: {
            grid: { display: false },
            ticks: { color: this.colors.chocolateBrown, font: { family: 'Plus Jakarta Sans', size: 11 } }
          }
        }
      }
    });
  },

  /**
   * Chart 3: Food Outcomes Breakdown (Doughnut)
   */
  renderOutcomesBreakdownChart(outcomes) {
    const ctx = document.getElementById('chartOutcomesBreakdown');
    if (!ctx) return;

    if (this.charts.outcomesBreakdown) {
      this.charts.outcomesBreakdown.destroy();
    }

    const totals = OutcomeTracker.calculateTotals(outcomes);
    const hasData = totals.totalResolved > 0 || totals.underReview > 0;

    if (!hasData) {
      this.renderEmptyState(ctx, 'No outcomes recorded yet. Record food outcomes to see redistribution metrics.');
      return;
    }

    this.clearEmptyState(ctx);

    this.charts.outcomesBreakdown = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Reused Internally', 'Redistributed to Partners', 'Composted / Discarded', 'Under Review'],
        datasets: [{
          data: [totals.reused, totals.redistributed, totals.discarded, totals.underReview],
          backgroundColor: [
            this.colors.sageGreen,
            this.colors.chocolateBrown,
            this.colors.terracotta,
            this.colors.softOlive
          ],
          borderColor: this.colors.cream,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.colors.deepBrown,
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
            }
          },
          tooltip: {
            backgroundColor: this.colors.deepBrown
          }
        },
        cutout: '62%'
      }
    });
  },

  /**
   * Chart 4: Surplus by Food Category
   */
  renderSurplusByCategoryChart(inventory) {
    const ctx = document.getElementById('chartSurplusByCategory');
    if (!ctx) return;

    if (this.charts.surplusByCategory) {
      this.charts.surplusByCategory.destroy();
    }

    if (inventory.length === 0) {
      this.renderEmptyState(ctx, 'No food records available.');
      return;
    }

    this.clearEmptyState(ctx);

    const categoryMap = {};
    inventory.forEach(item => {
      const cat = item.category || 'Uncategorized';
      const prep = Number(item.preparedQty) || 0;
      const demand = Number(item.estimatedDemand) || 0;
      const surplus = Math.max(0, prep - demand);
      categoryMap[cat] = (categoryMap[cat] || 0) + surplus;
    });

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);

    this.charts.surplusByCategory = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            this.colors.chocolateBrown,
            this.colors.sageGreen,
            this.colors.softOlive,
            this.colors.amber,
            this.colors.terracotta,
            this.colors.softBeige
          ],
          borderColor: this.colors.cream,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: this.colors.deepBrown,
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          }
        }
      }
    });
  },

  /**
   * Chart 5: Historical Trends Timeline
   */
  renderTrendsTimelineChart(inventory) {
    const ctx = document.getElementById('chartTrendsTimeline');
    if (!ctx) return;

    if (this.charts.trendsTimeline) {
      this.charts.trendsTimeline.destroy();
    }

    if (inventory.length < 3) {
      this.renderEmptyState(ctx, 'At least 3 meal records are needed to plot historical trends.');
      return;
    }

    this.clearEmptyState(ctx);

    // Sort by preparation time
    const sorted = [...inventory].sort((a, b) => new Date(a.preparedAt || a.createdAt) - new Date(b.preparedAt || b.createdAt));
    const labels = sorted.map(item => {
      const d = item.preparedAt ? new Date(item.preparedAt) : new Date(item.createdAt);
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} (${item.mealSession || 'Meal'})`;
    });
    const prepData = sorted.map(item => Number(item.preparedQty) || 0);
    const surplusData = sorted.map(item => {
      const prep = Number(item.preparedQty) || 0;
      const demand = Number(item.estimatedDemand) || 0;
      return Math.max(0, prep - demand);
    });

    this.charts.trendsTimeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Preparation Quantity',
            data: prepData,
            borderColor: this.colors.chocolateBrown,
            backgroundColor: 'rgba(74, 40, 27, 0.12)',
            tension: 0.35,
            fill: true,
            pointBackgroundColor: this.colors.chocolateBrown
          },
          {
            label: 'Potential Surplus',
            data: surplusData,
            borderColor: this.colors.sageGreen,
            backgroundColor: 'rgba(135, 148, 119, 0.15)',
            tension: 0.35,
            fill: true,
            pointBackgroundColor: this.colors.sageGreen
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: this.colors.deepBrown, font: { family: 'Plus Jakarta Sans', weight: '600' } }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.colors.chocolateBrown }
          },
          y: {
            grid: { color: 'rgba(74, 40, 27, 0.08)' },
            ticks: { color: this.colors.chocolateBrown },
            title: { display: true, text: 'Quantity', color: this.colors.chocolateBrown }
          }
        }
      }
    });
  },

  renderEmptyState(canvas, message) {
    const parent = canvas.parentElement;
    let emptyDiv = parent.querySelector('.chart-empty-state');
    if (!emptyDiv) {
      emptyDiv = document.createElement('div');
      emptyDiv.className = 'chart-empty-state';
      parent.appendChild(emptyDiv);
    }
    emptyDiv.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #4A281B;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#879477" stroke-width="1.5" style="margin-bottom: 12px; display: inline-block;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style="font-size: 0.95rem; font-weight: 500; margin: 0; opacity: 0.85;">${message}</p>
      </div>
    `;
    canvas.style.display = 'none';
  }
};

window.AnalyticsEngine = AnalyticsEngine;
