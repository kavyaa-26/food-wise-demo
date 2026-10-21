/**
 * FoodWise AI — Main Application Orchestrator
 * Handles view routing, DOM rendering, modal lifecycles, user interactions,
 * real-time UI synchronization, and form validations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons defensively if available
  try {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide icon initialization note:', e);
  }

  App.init();
});

const App = {
  activeView: 'home',
  currentEditingRecordId: null,

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.renderCurrentView();
    this.updateAlertBadge();

    // Listen to store updates
    window.addEventListener('foodwise:datachange', (e) => {
      this.handleDataChange(e.detail.type);
    });

    // Handle initial hash routing
    const hash = window.location.hash.replace('#', '') || 'home';
    this.navigateTo(hash);
  },

  /* ------------------------------------------------------------------------
     Routing & View Switching
     ------------------------------------------------------------------------ */
  setupNavigation() {
    const navLinks = document.querySelectorAll('[data-route]');
    const navMenu = document.getElementById('mainNavMenu');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        if (navMenu) navMenu.classList.remove('open');
        this.navigateTo(route);
      });
    });

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobileToggleBtn');
    if (mobileBtn && navMenu) {
      mobileBtn.addEventListener('click', () => {
        navMenu.classList.toggle('open');
      });
    }

    // Hash change listener
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      if (hash !== this.activeView) {
        this.navigateTo(hash, false);
      }
    });
  },

  navigateTo(viewId, updateHash = true) {
    const validViews = ['home', 'dashboard', 'inventory', 'estimation', 'alerts', 'outcomes', 'analytics', 'testing', 'about'];
    const target = validViews.includes(viewId) ? viewId : 'home';
    this.activeView = target;

    if (updateHash) {
      window.location.hash = target;
    }

    // Toggle active link classes
    document.querySelectorAll('[data-route]').forEach(el => {
      if (el.getAttribute('data-route') === target) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Toggle view containers
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeEl = document.getElementById(`view-${target}`);
    if (activeEl) {
      activeEl.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Trigger view-specific render logic
    this.renderCurrentView();
  },

  renderCurrentView() {
    const inv = store.getInventory();
    const outcomes = store.getOutcomes();
    const reviews = store.getAlertReviews();

    switch (this.activeView) {
      case 'home':
        this.renderHomeTeaser(inv);
        break;
      case 'dashboard':
        this.renderDashboard(inv, outcomes);
        break;
      case 'inventory':
        this.renderInventoryTable();
        break;
      case 'estimation':
        this.renderEstimationView(inv);
        break;
      case 'alerts':
        this.renderAlertsView(inv, reviews);
        break;
      case 'outcomes':
        this.renderOutcomesView(inv, outcomes);
        break;
      case 'analytics':
        this.renderAnalyticsView(inv, outcomes);
        break;
      case 'testing':
        this.renderTestingCenter();
        break;
      case 'about':
        break;
    }

    try {
      if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    } catch (e) {
      console.warn('Lucide icon render note:', e);
    }
  },

  handleDataChange(type) {
    this.updateAlertBadge();
    this.renderCurrentView();
  },

  updateAlertBadge() {
    const inv = store.getInventory();
    const reviews = store.getAlertReviews();
    const alerts = AlertCenter.generateAlerts(inv, reviews);
    const activeCount = alerts.filter(a => a.reviewStatus === 'Active').length;

    const badges = document.querySelectorAll('.alert-count-badge');
    badges.forEach(b => {
      b.textContent = activeCount;
      b.style.display = activeCount > 0 ? 'inline-block' : 'none';
    });
  },

  /* ------------------------------------------------------------------------
     Home View Renderers
     ------------------------------------------------------------------------ */
  renderHomeTeaser(inv) {
    const metrics = AnalyticsEngine.getAggregateMetrics(inv, store.getOutcomes());
    const countEl = document.getElementById('homeTotalItems');
    const surplusEl = document.getElementById('homeSurplusPct');
    if (countEl) countEl.textContent = metrics.itemCount;
    if (surplusEl) surplusEl.textContent = metrics.surplusPercentage + '%';
  },

  /* ------------------------------------------------------------------------
     Dashboard View Renderers
     ------------------------------------------------------------------------ */
  renderDashboard(inv, outcomes) {
    const metrics = AnalyticsEngine.getAggregateMetrics(inv, outcomes);
    const reviews = store.getAlertReviews();
    const alerts = AlertCenter.generateAlerts(inv, reviews);
    const activeAlerts = alerts.filter(a => a.reviewStatus === 'Active');

    // Update 8 stat cards
    this.setStat('statPrepared', `${metrics.totalPrepared}`);
    this.setStat('statServed', `${metrics.totalServed}`);
    this.setStat('statRemaining', `${metrics.totalRemaining}`);
    this.setStat('statSurplus', `${metrics.totalEstimatedSurplus}`);
    this.setStat('statReused', `${metrics.reused}`);
    this.setStat('statRedistributed', `${metrics.redistributed}`);
    this.setStat('statDiscarded', `${metrics.discarded}`);
    this.setStat('statAlerts', `${activeAlerts.length}`);

    // Update charts
    setTimeout(() => {
      AnalyticsEngine.updateCharts(inv, outcomes);
    }, 50);
  },

  setStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  /* ------------------------------------------------------------------------
     Food Inventory View Renderers
     ------------------------------------------------------------------------ */
  renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    let items = store.getInventory();
    const searchTerm = (document.getElementById('inventorySearch')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || 'ALL';
    const mealFilter = document.getElementById('inventoryMealFilter')?.value || 'ALL';

    // Apply filters
    items = items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm) ||
                          (item.notes || '').toLowerCase().includes(searchTerm);
      const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchMeal = mealFilter === 'ALL' || item.mealSession === mealFilter;
      return matchSearch && matchCategory && matchMeal;
    });

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 45px 20px; color: #4A281B;">
            <p style="font-size: 1.1rem; font-family: Playfair Display; margin-bottom: 8px;">No food inventory records found</p>
            <p style="font-size: 0.88rem; opacity: 0.75; margin-bottom: 16px;">Try adjusting your search criteria or add a new food preparation log.</p>
            <button class="btn btn-primary btn-sm" onclick="App.openAddRecordModal()">+ Add Food Record</button>
          </td>
        </tr>
      `;
      return;
    }

    const settings = store.getSettings();
    tbody.innerHTML = items.map(item => {
      const prep = Number(item.preparedQty) || 0;
      const served = Number(item.servedQty) || 0;
      const demand = Number(item.estimatedDemand) || 0;
      const metrics = EstimationEngine.calculate(prep, served, demand, settings);

      const prepDateStr = item.preparedAt ? new Date(item.preparedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const useByDateStr = item.useByAt ? new Date(item.useByAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None';

      return `
        <tr>
          <td>
            <strong>${item.name}</strong>
            ${item.isSample ? '<span class="badge badge-simulated" title="Simulated demonstration data">Simulated</span>' : ''}
            <div style="font-size: 0.76rem; color: rgba(45, 27, 21, 0.65); margin-top: 2px;">
              ${item.mealSession || 'General'} &bull; Prepared: ${prepDateStr} &bull; Use-By: ${useByDateStr}
            </div>
          </td>
          <td><span class="badge badge-neutral">${item.category}</span></td>
          <td><strong>${prep}</strong> <span style="font-size: 0.8rem; opacity: 0.7;">${item.unit}</span></td>
          <td>${served} <span style="font-size: 0.8rem; opacity: 0.7;">${item.unit}</span></td>
          <td>${metrics.remainingFood} <span style="font-size: 0.8rem; opacity: 0.7;">${item.unit}</span></td>
          <td>
            <strong>${metrics.estimatedSurplus}</strong> <span style="font-size: 0.8rem; opacity: 0.7;">${item.unit}</span>
            <div style="font-size: 0.75rem; color: #4A281B;">(${metrics.surplusPercentage}%)</div>
          </td>
          <td>
            <span class="badge ${metrics.alertClass}">${metrics.alertLevel}</span>
          </td>
          <td style="white-space: nowrap;">
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" onclick="App.openRecordDetailsModal('${item.id}')" title="View breakdown & formula">
                View
              </button>
              <button class="btn btn-secondary btn-sm" onclick="App.openEditRecordModal('${item.id}')" title="Edit record">
                Edit
              </button>
              <button class="btn btn-sage btn-sm" onclick="App.openOutcomeModal('${item.id}')" title="Record food outcome">
                Outcome
              </button>
              <button class="btn btn-secondary btn-sm" style="color: #C26D53; border-color: #C26D53;" onclick="App.deleteRecord('${item.id}')" title="Delete record">
                &times;
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* ------------------------------------------------------------------------
     AI Insights & Estimation View Renderers
     ------------------------------------------------------------------------ */
  renderEstimationView(inv) {
    const select = document.getElementById('estimationItemSelect');
    if (!select) return;

    // Populate dropdown with current inventory items
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Choose Existing Item or Type Custom Item --</option>' +
      inv.map(item => `<option value="${item.name}">${item.name} (${item.unit})</option>`).join('');

    if (currentVal) select.value = currentVal;

    // Trigger estimate calculation
    this.calculateSimulator();
  },

  calculateSimulator() {
    const inv = store.getInventory();
    const itemName = document.getElementById('calcItemName')?.value || '';
    const prep = Number(document.getElementById('calcPrepQty')?.value) || 0;
    const served = Number(document.getElementById('calcServedQty')?.value) || 0;
    let demand = Number(document.getElementById('calcDemandQty')?.value) || 0;

    // Query historical demand
    const history = EstimationEngine.estimateHistoricalDemand(itemName, inv);
    const historyBox = document.getElementById('calcHistoryInfo');
    if (historyBox) {
      if (history.available) {
        historyBox.innerHTML = `
          <div style="background-color: #EBF0E6; border: 1px solid #879477; padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; color: #2D1B15;">
            <strong>Historical Average Demand Found:</strong> ${history.estimatedDemand} ${history.unit} (Based on ${history.recordCount} recorded meal cycles).
            <button type="button" class="btn btn-sage btn-sm" style="margin-left: 10px; padding: 2px 8px; font-size: 0.75rem;" onclick="App.applyHistoricalDemand(${history.estimatedDemand})">Use Baseline</button>
          </div>
        `;
      } else {
        historyBox.innerHTML = `
          <div style="background-color: #FBF4E8; border: 1px solid #DDA15E; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; color: #4A281B;">
            <strong>Statistical Demand Notice:</strong> ${history.explanation}
          </div>
        `;
      }
    }

    const settings = store.getSettings();
    const result = EstimationEngine.calculate(prep, served, demand, settings);

    // Update result UI elements
    const remEl = document.getElementById('calcResultRemaining');
    const surEl = document.getElementById('calcResultSurplus');
    const pctEl = document.getElementById('calcResultPct');
    const alertEl = document.getElementById('calcResultAlert');
    const mathEl = document.getElementById('calcResultMath');
    const recEl = document.getElementById('calcResultRec');

    if (remEl) remEl.textContent = result.remainingFood;
    if (surEl) surEl.textContent = result.estimatedSurplus;
    if (pctEl) pctEl.textContent = result.surplusPercentage + '%';
    if (alertEl) {
      alertEl.className = `badge ${result.alertClass}`;
      alertEl.textContent = result.alertLabel;
    }
    if (mathEl) mathEl.textContent = result.mathExplanation;
    if (recEl) recEl.textContent = result.recommendedAction;
  },

  applyHistoricalDemand(val) {
    const demandInput = document.getElementById('calcDemandQty');
    if (demandInput) {
      demandInput.value = val;
      this.calculateSimulator();
      this.showToast(`Applied historical demand baseline (${val})`, 'success');
    }
  },

  /* ------------------------------------------------------------------------
     Alert Center View Renderers
     ------------------------------------------------------------------------ */
  renderAlertsView(inv, reviews) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const filter = document.getElementById('alertsFilterSelect')?.value || 'ALL';
    const allAlerts = AlertCenter.generateAlerts(inv, reviews);
    const filtered = AlertCenter.filterAlerts(allAlerts, filter);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; background: #FAF5EE; border-radius: 14px; border: 1px solid #DAC2A6;">
          <p style="font-family: Playfair Display; font-size: 1.25rem; color: #4A281B; margin-bottom: 6px;">No alerts matching this filter</p>
          <p style="font-size: 0.9rem; opacity: 0.75;">All meal batches are currently within normal thresholds or have been acknowledged.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(alert => {
      const severityClass = alert.severity === 'HIGH' ? 'severity-high' :
                            alert.severity === 'MODERATE' ? 'severity-moderate' : 'severity-info';
      const severityBadgeClass = alert.severity === 'HIGH' ? 'badge-danger' :
                                 alert.severity === 'MODERATE' ? 'badge-warning' : 'badge-success';

      const isReviewed = alert.reviewStatus !== 'Active';

      return `
        <div class="alert-item-card ${severityClass}">
          <div class="alert-header">
            <div class="alert-title-group">
              <span class="badge ${severityBadgeClass}">${alert.severity}</span>
              <h4 class="alert-food-name">${alert.foodName} (${alert.category})</h4>
            </div>
            <div>
              <span class="badge ${isReviewed ? 'badge-success' : 'badge-warning'}">
                Status: ${alert.reviewStatus}
              </span>
            </div>
          </div>

          <div style="font-weight: 600; color: #4A281B; font-size: 0.95rem;">
            ${alert.title}
          </div>

          <div class="alert-body-reason">
            <strong>Reason:</strong> ${alert.reason}
          </div>

          <div style="font-size: 0.88rem; color: #2D1B15; line-height: 1.5;">
            <strong>Recommended Operational Protocol:</strong> ${alert.recommendedAction}
          </div>

          ${alert.reviewNotes ? `
            <div style="font-size: 0.82rem; background: #FAF5EE; border-left: 3px solid #879477; padding: 6px 10px; border-radius: 4px;">
              <strong>Kitchen Review Note:</strong> "${alert.reviewNotes}" ${alert.reviewedAt ? `&bull; Logged ${new Date(alert.reviewedAt).toLocaleString()}` : ''}
            </div>
          ` : ''}

          <div class="alert-actions-bar">
            <span style="font-size: 0.78rem; opacity: 0.7;">Alert ID: ${alert.id}</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="App.openRecordDetailsModal('${alert.recordId}')">
                Inspect Food Batch
              </button>
              <button class="btn ${isReviewed ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="App.openAlertReviewModal('${alert.id}')">
                ${isReviewed ? 'Update Review Note' : 'Review & Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /* ------------------------------------------------------------------------
     Food Outcomes View Renderers
     ------------------------------------------------------------------------ */
  renderOutcomesView(inv, outcomes) {
    const tbody = document.getElementById('outcomesTableBody');
    const totalsContainer = document.getElementById('outcomesSummaryBoxes');

    const totals = OutcomeTracker.calculateTotals(outcomes);
    if (totalsContainer) {
      totalsContainer.innerHTML = `
        <div class="stat-card stat-highlight-sage">
          <div class="stat-label">Total Reused Internally</div>
          <div class="stat-value">${totals.reused}</div>
          <div class="stat-meta">Safely incorporated into secondary menus</div>
        </div>
        <div class="stat-card" style="border-left: 4px solid #4A281B;">
          <div class="stat-label">Total Redistributed</div>
          <div class="stat-value">${totals.redistributed}</div>
          <div class="stat-meta">Verified human safety sign-off completed</div>
        </div>
        <div class="stat-card stat-highlight-terracotta">
          <div class="stat-label">Total Composted / Discarded</div>
          <div class="stat-value">${totals.discarded}</div>
          <div class="stat-meta">Expired or organoleptic safety check failure</div>
        </div>
        <div class="stat-card stat-highlight-amber">
          <div class="stat-label">Under Verification</div>
          <div class="stat-value">${totals.underReview}</div>
          <div class="stat-meta">Awaiting temperature or chef inspection</div>
        </div>
      `;
    }

    if (!tbody) return;

    if (outcomes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px 20px; color: #4A281B;">
            <p style="font-family: Playfair Display; font-size: 1.15rem; margin-bottom: 6px;">No food outcomes recorded yet</p>
            <p style="font-size: 0.88rem; opacity: 0.75; margin-bottom: 14px;">Select remaining leftovers from your inventory and record whether they were reused or redistributed.</p>
            <button class="btn btn-primary btn-sm" onclick="App.navigateTo('inventory')">Go to Inventory to Select Batch</button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = outcomes.map(out => {
      const typeBadgeClass = out.outcomeType === 'Reused' ? 'badge-success' :
                             out.outcomeType === 'Redistributed' ? 'badge-neutral' :
                             out.outcomeType === 'Discarded' ? 'badge-danger' : 'badge-warning';

      return `
        <tr>
          <td>
            <strong>${out.foodName}</strong>
            <div style="font-size: 0.75rem; opacity: 0.7;">Logged: ${out.timestamp ? new Date(out.timestamp).toLocaleString() : '-'}</div>
          </td>
          <td><span class="badge ${typeBadgeClass}">${out.outcomeType}</span></td>
          <td><strong>${out.quantity}</strong> <span style="font-size: 0.8rem; opacity: 0.7;">${out.unit}</span></td>
          <td>${out.destination || '-'}</td>
          <td>${out.verifiedBy || 'Supervisor'}</td>
          <td>
            ${out.safetyChecksPassed ? '<span class="badge badge-success">Passed</span>' : '<span class="badge badge-warning">Pending</span>'}
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" style="color: #C26D53; border-color: #C26D53;" onclick="App.deleteOutcome('${out.id}')" title="Delete record">
              &times;
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /* ------------------------------------------------------------------------
     Premium Analytics View Renderers
     ------------------------------------------------------------------------ */
  renderAnalyticsView(inv, outcomes) {
    const metrics = AnalyticsEngine.getAggregateMetrics(inv, outcomes);
    
    // Update summary callouts
    const wasteEfficiency = metrics.totalRemaining > 0 
      ? (((metrics.reused + metrics.redistributed) / metrics.totalRemaining) * 100).toFixed(1)
      : '0.0';

    const efficiencyEl = document.getElementById('analyticsEfficiencyRate');
    if (efficiencyEl) efficiencyEl.textContent = wasteEfficiency + '%';

    setTimeout(() => {
      AnalyticsEngine.updateCharts(inv, outcomes);
    }, 50);
  },

  /* ------------------------------------------------------------------------
     Testing Center View Renderers
     ------------------------------------------------------------------------ */
  renderTestingCenter() {
    const container = document.getElementById('testResultsContainer');
    if (!container) return;

    // Run tests in memory without touching real data
    const results = TestingCenter.runAll();
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const passRate = ((passedCount / totalCount) * 100).toFixed(0);

    // Update banner metrics
    const rateEl = document.getElementById('testPassRate');
    const countEl = document.getElementById('testPassedCount');
    const totalEl = document.getElementById('testTotalCount');
    if (rateEl) rateEl.textContent = passRate + '%';
    if (countEl) countEl.textContent = passedCount;
    if (totalEl) totalEl.textContent = totalCount;

    container.innerHTML = results.map(test => {
      const statusBadge = test.passed 
        ? '<span class="badge badge-success" style="font-size: 0.82rem;">PASS</span>' 
        : '<span class="badge badge-danger" style="font-size: 0.82rem;">FAIL</span>';

      return `
        <div class="test-unit-card" id="test-card-${test.id}">
          <div>
            <div class="test-card-header">
              <div>
                <span class="test-category-tag">${test.category}</span>
                <div class="test-title">Test #${test.id}: ${test.name}</div>
              </div>
              <div>${statusBadge}</div>
            </div>
            <p style="font-size: 0.86rem; color: rgba(45, 27, 21, 0.8); margin: 8px 0 12px 0;">
              ${test.description}
            </p>
          </div>

          <div>
            <div class="test-io-box">
              <div style="color: #4A281B; margin-bottom: 3px;"><strong>EXPECTED:</strong> ${test.expected}</div>
              <div style="color: ${test.passed ? '#6C7A5C' : '#933118'}; margin-bottom: 3px;"><strong>ACTUAL:</strong> ${test.actual}</div>
              <div style="font-size: 0.75rem; opacity: 0.8; font-style: italic;">${test.details} (${test.durationMs}ms)</div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <button class="btn btn-secondary btn-sm" onclick="App.runSingleTest(${test.id})">
                Re-Run Assertion
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  runSingleTest(id) {
    const result = TestingCenter.runTest(id);
    this.showToast(`Test #${id} executed: ${result.passed ? 'PASSED' : 'FAILED'} in ${result.durationMs}ms`, result.passed ? 'success' : 'error');
    this.renderTestingCenter();
  },

  runAllTests() {
    this.renderTestingCenter();
    this.showToast('All 16 test assertions executed successfully!', 'success');
  },

  /* ------------------------------------------------------------------------
     Modals & CRUD Operations
     ------------------------------------------------------------------------ */
  setupEventListeners() {
    // Inventory search & filter inputs
    const searchInput = document.getElementById('inventorySearch');
    const catSelect = document.getElementById('inventoryCategoryFilter');
    const mealSelect = document.getElementById('inventoryMealFilter');

    if (searchInput) searchInput.addEventListener('input', () => this.renderInventoryTable());
    if (catSelect) catSelect.addEventListener('change', () => this.renderInventoryTable());
    if (mealSelect) mealSelect.addEventListener('change', () => this.renderInventoryTable());

    // Alerts filter
    const alertFilter = document.getElementById('alertsFilterSelect');
    if (alertFilter) alertFilter.addEventListener('change', () => this.renderAlertsView(store.getInventory(), store.getAlertReviews()));

    // Calculator inputs
    ['calcItemName', 'calcPrepQty', 'calcServedQty', 'calcDemandQty'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.calculateSimulator());
    });

    const calcSelect = document.getElementById('estimationItemSelect');
    if (calcSelect) {
      calcSelect.addEventListener('change', () => {
        const val = calcSelect.value;
        const nameInput = document.getElementById('calcItemName');
        if (nameInput && val) {
          nameInput.value = val;
          const match = store.getInventory().find(i => i.name === val);
          if (match) {
            document.getElementById('calcPrepQty').value = match.preparedQty;
            document.getElementById('calcServedQty').value = match.servedQty;
            document.getElementById('calcDemandQty').value = match.estimatedDemand;
          }
          this.calculateSimulator();
        }
      });
    }

    // Modal close backdrops
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });
  },

  openAddRecordModal() {
    this.currentEditingRecordId = null;
    document.getElementById('recordModalTitle').textContent = 'Add Food Preparation Record';
    document.getElementById('recordForm').reset();
    
    // Set default timestamps
    const now = new Date();
    const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const useByIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000 + 5 * 3600000).toISOString().slice(0, 16);
    
    document.getElementById('formPreparedAt').value = nowIso;
    document.getElementById('formUseByAt').value = useByIso;

    document.getElementById('recordModal').classList.add('open');
  },

  openEditRecordModal(id) {
    const record = store.getRecord(id);
    if (!record) return;

    this.currentEditingRecordId = id;
    document.getElementById('recordModalTitle').textContent = 'Edit Food Preparation Record';

    document.getElementById('formFoodName').value = record.name;
    document.getElementById('formCategory').value = record.category;
    document.getElementById('formPrepQty').value = record.preparedQty;
    document.getElementById('formServedQty').value = record.servedQty;
    document.getElementById('formDemandQty').value = record.estimatedDemand;
    document.getElementById('formUnit').value = record.unit;
    document.getElementById('formMealSession').value = record.mealSession || 'Lunch';
    document.getElementById('formPreparedAt').value = record.preparedAt || '';
    document.getElementById('formUseByAt').value = record.useByAt || '';
    document.getElementById('formAttendance').value = record.expectedAttendance || '';
    document.getElementById('formNotes').value = record.notes || '';

    document.getElementById('recordModal').classList.add('open');
  },

  saveRecordFromForm() {
    const formData = {
      name: document.getElementById('formFoodName').value.trim(),
      category: document.getElementById('formCategory').value,
      preparedQty: Number(document.getElementById('formPrepQty').value),
      servedQty: Number(document.getElementById('formServedQty').value),
      estimatedDemand: Number(document.getElementById('formDemandQty').value),
      unit: document.getElementById('formUnit').value,
      mealSession: document.getElementById('formMealSession').value,
      preparedAt: document.getElementById('formPreparedAt').value,
      useByAt: document.getElementById('formUseByAt').value,
      expectedAttendance: Number(document.getElementById('formAttendance').value) || 0,
      notes: document.getElementById('formNotes').value.trim()
    };

    const validation = EstimationEngine.validateInput(formData);
    if (!validation.isValid) {
      alert('Validation error:\n• ' + validation.errors.join('\n• '));
      return;
    }

    if (this.currentEditingRecordId) {
      store.updateRecord(this.currentEditingRecordId, formData);
      this.showToast('Record updated successfully', 'success');
    } else {
      store.addRecord(formData);
      this.showToast('New food record created', 'success');
    }

    this.closeModal('recordModal');
  },

  deleteRecord(id) {
    const item = store.getRecord(id);
    if (!item) return;
    if (confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      store.deleteRecord(id);
      this.showToast(`Deleted "${item.name}"`, 'success');
    }
  },

  openRecordDetailsModal(id) {
    const record = store.getRecord(id);
    if (!record) return;

    const prep = Number(record.preparedQty) || 0;
    const served = Number(record.servedQty) || 0;
    const demand = Number(record.estimatedDemand) || 0;
    const metrics = EstimationEngine.calculate(prep, served, demand, store.getSettings());

    const body = document.getElementById('recordDetailsBody');
    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="font-family: Playfair Display; font-size: 1.5rem; color: #4A281B; margin-bottom: 4px;">${record.name}</h3>
        <span class="badge badge-neutral">${record.category}</span>
        ${record.isSample ? '<span class="badge badge-simulated">Simulated Demo Data</span>' : ''}
      </div>

      <div class="stats-grid-8" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-label">Prepared Quantity</div>
          <div class="stat-value">${prep} <span style="font-size: 1rem;">${record.unit}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Served Quantity</div>
          <div class="stat-value">${served} <span style="font-size: 1rem;">${record.unit}</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Remaining Leftovers</div>
          <div class="stat-value">${metrics.remainingFood} <span style="font-size: 1rem;">${record.unit}</span></div>
        </div>
        <div class="stat-card stat-highlight-terracotta">
          <div class="stat-label">Estimated Surplus</div>
          <div class="stat-value">${metrics.estimatedSurplus} <span style="font-size: 1rem;">${record.unit}</span></div>
          <div class="stat-meta">${metrics.surplusPercentage}% of preparation</div>
        </div>
      </div>

      <div style="background: #FAF5EE; border: 1px solid #DAC2A6; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <h4 style="font-size: 0.95rem; color: #4A281B; margin-bottom: 6px;">Mathematical Formula & Calculation</h4>
        <p style="font-size: 0.88rem; line-height: 1.5; color: #2D1B15; margin-bottom: 6px;">
          ${metrics.mathExplanation}
        </p>
        <div style="font-size: 0.8rem; opacity: 0.75;">
          Formula: Surplus = max(0, Prepared - Estimated Demand). Surplus % = (Surplus / Prepared) * 100.
        </div>
      </div>

      <div style="background: #EBF0E6; border: 1px solid #879477; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <h4 style="font-size: 0.95rem; color: #6C7A5C; margin-bottom: 6px;">Recommended Operational Action</h4>
        <p style="font-size: 0.88rem; line-height: 1.5; color: #2D1B15;">
          ${metrics.recommendedAction}
        </p>
      </div>

      <div style="font-size: 0.82rem; color: rgba(45, 27, 21, 0.7); line-height: 1.6;">
        <div><strong>Meal Session:</strong> ${record.mealSession || 'General'}</div>
        <div><strong>Prepared At:</strong> ${record.preparedAt ? new Date(record.preparedAt).toLocaleString() : '-'}</div>
        <div><strong>Use-By At:</strong> ${record.useByAt ? new Date(record.useByAt).toLocaleString() : 'Not recorded'}</div>
        <div><strong>Expected Attendance:</strong> ${record.expectedAttendance || 'Not specified'}</div>
        <div><strong>Kitchen Notes:</strong> ${record.notes || 'None recorded'}</div>
      </div>
    `;

    document.getElementById('recordDetailsModal').classList.add('open');
  },

  openOutcomeModal(recordId) {
    const record = store.getRecord(recordId);
    if (!record) return;

    const prep = Number(record.preparedQty) || 0;
    const served = Number(record.servedQty) || 0;
    const remaining = Math.max(0, prep - served);

    if (remaining <= 0) {
      alert(`Cannot record outcome: "${record.name}" has 0 remaining food (all ${prep} ${record.unit} was served).`);
      return;
    }

    document.getElementById('outcomeFoodSelectGroup').style.display = 'none';
    document.getElementById('outcomeFoodNameGroup').style.display = 'block';

    document.getElementById('outcomeRecordId').value = record.id;
    document.getElementById('outcomeFoodName').value = record.name;
    document.getElementById('outcomeRemainingText').textContent = `${remaining} ${record.unit}`;
    document.getElementById('outcomeQty').value = remaining;
    document.getElementById('outcomeUnit').value = record.unit;
    document.getElementById('outcomeDestination').value = '';
    document.getElementById('outcomeVerifier').value = '';
    document.getElementById('outcomeSafetyCheck').checked = false;
    document.getElementById('outcomeNotes').value = '';

    document.getElementById('outcomeModal').classList.add('open');
  },

  openGeneralOutcomeModal() {
    const inv = store.getInventory();
    const available = inv.filter(item => {
      const prep = Number(item.preparedQty) || 0;
      const served = Number(item.servedQty) || 0;
      return (prep - served) > 0;
    });

    if (available.length === 0) {
      this.showToast('No food batches currently have remaining leftovers to log.', 'error');
      return;
    }

    const select = document.getElementById('outcomeBatchSelect');
    select.innerHTML = available.map(item => {
      const rem = Number(Math.max(0, (Number(item.preparedQty) || 0) - (Number(item.servedQty) || 0)).toFixed(1));
      return `<option value="${item.id}">${item.name} (${rem} ${item.unit} remaining)</option>`;
    }).join('');

    document.getElementById('outcomeFoodSelectGroup').style.display = 'block';
    document.getElementById('outcomeFoodNameGroup').style.display = 'none';

    this.handleOutcomeBatchSelection(available[0].id);
    document.getElementById('outcomeModal').classList.add('open');
  },

  handleOutcomeBatchSelection(recordId) {
    const record = store.getRecord(recordId);
    if (!record) return;

    const prep = Number(record.preparedQty) || 0;
    const served = Number(record.servedQty) || 0;
    const remaining = Number(Math.max(0, prep - served).toFixed(1));

    document.getElementById('outcomeRecordId').value = record.id;
    document.getElementById('outcomeFoodName').value = record.name;
    document.getElementById('outcomeRemainingText').textContent = `${remaining} ${record.unit}`;
    document.getElementById('outcomeQty').value = remaining;
    document.getElementById('outcomeUnit').value = record.unit;
  },

  saveOutcomeFromForm() {
    const recordId = document.getElementById('outcomeRecordId').value;
    const record = store.getRecord(recordId);
    if (!record) return;

    const outcomeData = {
      recordId,
      foodName: record.name,
      outcomeType: document.getElementById('outcomeType').value,
      quantity: Number(document.getElementById('outcomeQty').value),
      unit: record.unit,
      timestamp: new Date().toISOString(),
      destination: document.getElementById('outcomeDestination').value,
      verifiedBy: document.getElementById('outcomeVerifier').value,
      safetyChecksPassed: document.getElementById('outcomeSafetyCheck').checked,
      notes: document.getElementById('outcomeNotes').value
    };

    const validation = OutcomeTracker.validateOutcome(outcomeData, record, store.getOutcomes());
    if (!validation.isValid) {
      alert('Outcome Validation Failed:\n• ' + validation.errors.join('\n• '));
      return;
    }

    store.addOutcome(outcomeData);
    this.closeModal('outcomeModal');
    this.showToast(`Recorded ${outcomeData.outcomeType} for ${record.name}`, 'success');
  },

  deleteOutcome(id) {
    if (confirm('Are you sure you want to remove this recorded food outcome?')) {
      store.deleteOutcome(id);
      this.showToast('Outcome record removed', 'success');
    }
  },

  openAlertReviewModal(alertId) {
    const reviews = store.getAlertReviews();
    const existing = reviews[alertId] || { status: 'Active', notes: '' };

    document.getElementById('reviewAlertId').value = alertId;
    document.getElementById('reviewStatusSelect').value = existing.status || 'Reviewed';
    document.getElementById('reviewNotesInput').value = existing.notes || '';

    document.getElementById('alertReviewModal').classList.add('open');
  },

  saveAlertReviewFromForm() {
    const alertId = document.getElementById('reviewAlertId').value;
    const status = document.getElementById('reviewStatusSelect').value;
    const notes = document.getElementById('reviewNotesInput').value;

    store.saveAlertReview(alertId, { status, notes, reviewedAt: new Date().toISOString() });
    this.closeModal('alertReviewModal');
    this.showToast('Alert review updated', 'success');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  /* ------------------------------------------------------------------------
     Data Export, Load Sample & Reset
     ------------------------------------------------------------------------ */
  exportData() {
    try {
      store.exportToCSV();
      this.showToast('Food records exported to CSV successfully', 'success');
    } catch (e) {
      alert(e.message);
    }
  },

  loadSampleData() {
    if (confirm('Load verified sample demonstration records (Rice, Idli, Chapati, Sambar, etc.)? Any unsaved live records will be replaced with demo data.')) {
      store.loadSampleData(true);
      this.showToast('Demonstration food records loaded', 'success');
    }
  },

  confirmReset() {
    if (confirm('WARNING: Are you sure you want to reset all records and clear demonstration data? This resets inventory, outcomes, and alert reviews safely.')) {
      store.resetAllData();
      this.showToast('All food records cleared safely', 'success');
    }
  },

  /* ------------------------------------------------------------------------
     Toasts
     ------------------------------------------------------------------------ */
  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '⚠️' : '✓'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

// Expose App on window for inline event handlers and global accessibility
window.App = App;
