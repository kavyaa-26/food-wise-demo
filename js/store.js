/**
 * FoodWise AI — Central Data Store & Persistence Layer
 * Manages localStorage, data validation, sample dataset, outcomes, and export.
 */

const STORAGE_KEYS = {
  INVENTORY: 'foodwise_inventory_v1',
  OUTCOMES: 'foodwise_outcomes_v1',
  ALERT_REVIEWS: 'foodwise_alert_reviews_v1',
  SETTINGS: 'foodwise_settings_v1'
};

const DEFAULT_SETTINGS = {
  lowThreshold: 10,     // < 10%
  highThreshold: 25,    // > 25% is high potential surplus
  expiryAlertHours: 4,  // alert if use-by is within 4 hours
  organizationName: 'Heritage Campus Mess & Dining Hall'
};

const SAMPLE_FOOD_DATA = [
  {
    id: 'sample-1',
    name: 'Steamed Sona Masoori Rice',
    category: 'Rice & Grains',
    preparedQty: 45,
    servedQty: 38,
    estimatedDemand: 40,
    unit: 'kg',
    preparedAt: '2026-10-13T11:00',
    useByAt: '2026-10-13T16:30',
    expectedAttendance: 160,
    mealSession: 'Lunch',
    notes: 'Central campus dining hall lunch session. Cooked in automated steam kettles.',
    isSample: true,
    createdAt: '2026-10-13T10:30:00.000Z'
  },
  {
    id: 'sample-2',
    name: 'South Indian Fluffy Idli',
    category: 'Breakfast/Snacks',
    preparedQty: 180,
    servedQty: 175,
    estimatedDemand: 170,
    unit: 'portions',
    preparedAt: '2026-10-13T07:00',
    useByAt: '2026-10-13T11:00',
    expectedAttendance: 90,
    mealSession: 'Breakfast',
    notes: 'Morning hostel breakfast. High attendance observed near exam week.',
    isSample: true,
    createdAt: '2026-10-13T06:30:00.000Z'
  },
  {
    id: 'sample-3',
    name: 'Whole Wheat Chapati',
    category: 'Breads',
    preparedQty: 250,
    servedQty: 190,
    estimatedDemand: 200,
    unit: 'portions',
    preparedAt: '2026-10-13T11:30',
    useByAt: '2026-10-13T17:00',
    expectedAttendance: 140,
    mealSession: 'Lunch',
    notes: 'Hand-rolled tawa chapatis. 50 surplus over demand recorded.',
    isSample: true,
    createdAt: '2026-10-13T11:00:00.000Z'
  },
  {
    id: 'sample-4',
    name: 'Mixed Vegetable Curry',
    category: 'Curries & Gravies',
    preparedQty: 30,
    servedQty: 22,
    estimatedDemand: 24,
    unit: 'kg',
    preparedAt: '2026-10-13T11:15',
    useByAt: '2026-10-13T16:00',
    expectedAttendance: 150,
    mealSession: 'Lunch',
    notes: 'Carrots, beans, peas, potatoes in mild coconut tomato gravy.',
    isSample: true,
    createdAt: '2026-10-13T10:45:00.000Z'
  },
  {
    id: 'sample-5',
    name: 'Toor Dal Drumstick Sambar',
    category: 'Curries & Gravies',
    preparedQty: 35,
    servedQty: 30,
    estimatedDemand: 32,
    unit: 'litres',
    preparedAt: '2026-10-13T11:00',
    useByAt: '2026-10-13T16:00',
    expectedAttendance: 160,
    mealSession: 'Lunch',
    notes: 'Traditional lentil stew with drumstick and shallots.',
    isSample: true,
    createdAt: '2026-10-13T10:30:00.000Z'
  },
  {
    id: 'sample-6',
    name: 'Crispy Evening Vegetable Samosa',
    category: 'Breakfast/Snacks',
    preparedQty: 120,
    servedQty: 85,
    estimatedDemand: 90,
    unit: 'portions',
    preparedAt: '2026-10-13T15:30',
    useByAt: '2026-10-13T19:30',
    expectedAttendance: 80,
    mealSession: 'Snacks',
    notes: 'High surplus detected due to rainy afternoon student lab schedules.',
    isSample: true,
    createdAt: '2026-10-13T15:00:00.000Z'
  },
  {
    id: 'sample-7',
    name: 'Yellow Tadka Dal',
    category: 'Curries & Gravies',
    preparedQty: 28,
    servedQty: 25,
    estimatedDemand: 26,
    unit: 'kg',
    preparedAt: '2026-10-12T19:00',
    useByAt: '2026-10-12T23:00',
    expectedAttendance: 130,
    mealSession: 'Dinner',
    notes: 'Evening dinner service from previous day.',
    isSample: true,
    createdAt: '2026-10-12T18:30:00.000Z'
  },
  {
    id: 'sample-8',
    name: 'Fresh Seasonal Fruit Salad',
    category: 'Desserts',
    preparedQty: 20,
    servedQty: 11,
    estimatedDemand: 13,
    unit: 'kg',
    preparedAt: '2026-10-13T12:00',
    useByAt: '2026-10-13T15:00',
    expectedAttendance: 140,
    mealSession: 'Lunch',
    notes: 'Watermelon, papaya, pineapple. Very short shelf-life at room temp (3h). High potential surplus.',
    isSample: true,
    createdAt: '2026-10-13T11:45:00.000Z'
  }
];

const SAMPLE_OUTCOMES = [
  {
    id: 'out-1',
    recordId: 'sample-1',
    foodName: 'Steamed Sona Masoori Rice',
    outcomeType: 'Reused',
    quantity: 5,
    unit: 'kg',
    timestamp: '2026-10-13T14:30',
    destination: 'Chilled cold storage (4°C) for evening vegetable fried rice batch',
    verifiedBy: 'Chef Ramesh (Head Mess Supervisor)',
    safetyChecksPassed: true,
    notes: 'Temperature verified at 3.8°C. Transferred in food-grade covered SS pans.'
  },
  {
    id: 'out-2',
    recordId: 'sample-3',
    foodName: 'Whole Wheat Chapati',
    outcomeType: 'Redistributed',
    quantity: 45,
    unit: 'portions',
    timestamp: '2026-10-13T14:45',
    destination: 'Annapoorna Community Feeding Partner (NGO ID: TN-CHE-441)',
    verifiedBy: 'Suresh Kumar (Redistribution Liaison)',
    safetyChecksPassed: true,
    notes: 'Dispatched in thermal insulated crates within 2 hours of meal wrap.'
  },
  {
    id: 'out-3',
    recordId: 'sample-8',
    foodName: 'Fresh Seasonal Fruit Salad',
    outcomeType: 'Discarded',
    quantity: 3,
    unit: 'kg',
    timestamp: '2026-10-13T15:15',
    destination: 'Campus Organic Bio-Composting Unit (Bin #3)',
    verifiedBy: 'Deepa V (Quality Control)',
    safetyChecksPassed: true,
    notes: 'Exceeded safe 3-hour ambient holding threshold; composted responsibly.'
  }
];

const SAMPLE_ALERT_REVIEWS = {
  'alert-sample-8-surplus': {
    reviewed: true,
    reviewedAt: '2026-10-13T13:00',
    reviewerNotes: 'Alert acknowledged. Scheduled urgent chilling for remainder before expiry.',
    status: 'Reviewed'
  }
};

class Store {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      this.loadSampleData(false);
    }
  }

  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(data);
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? { ...DEFAULT_SETTINGS, ...parsed }
        : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Error reading settings:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      this.notifyChange('settings');
    } catch (e) {
      console.error('Storage write error (settings):', e);
    }
  }

  getInventory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading inventory:', e);
      return [];
    }
  }

  saveInventory(items) {
    try {
      const safeItems = Array.isArray(items) ? items : [];
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(safeItems));
      this.notifyChange('inventory');
    } catch (e) {
      console.error('Storage write error (inventory):', e);
    }
  }

  getRecord(id) {
    const items = this.getInventory();
    return items.find(item => item.id === id) || null;
  }

  addRecord(record) {
    const items = this.getInventory();
    const newRecord = {
      ...record,
      id: record.id || 'rec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      isSample: false
    };
    items.unshift(newRecord);
    this.saveInventory(items);
    return newRecord;
  }

  updateRecord(id, updatedFields) {
    const items = this.getInventory();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    this.saveInventory(items);
    return items[index];
  }

  deleteRecord(id) {
    let items = this.getInventory();
    items = items.filter(item => item.id !== id);
    this.saveInventory(items);

    // Also clean up associated outcomes
    let outcomes = this.getOutcomes();
    outcomes = outcomes.filter(o => o.recordId !== id);
    this.saveOutcomes(outcomes);
    return true;
  }

  getOutcomes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OUTCOMES);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading outcomes:', e);
      return [];
    }
  }

  saveOutcomes(outcomes) {
    try {
      const safeOutcomes = Array.isArray(outcomes) ? outcomes : [];
      localStorage.setItem(STORAGE_KEYS.OUTCOMES, JSON.stringify(safeOutcomes));
      this.notifyChange('outcomes');
    } catch (e) {
      console.error('Storage write error (outcomes):', e);
    }
  }

  addOutcome(outcome) {
    const outcomes = this.getOutcomes();
    const newOutcome = {
      ...outcome,
      id: outcome.id || 'out-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    outcomes.unshift(newOutcome);
    this.saveOutcomes(outcomes);
    return newOutcome;
  }

  deleteOutcome(id) {
    let outcomes = this.getOutcomes();
    outcomes = outcomes.filter(o => o.id !== id);
    this.saveOutcomes(outcomes);
    return true;
  }

  getAlertReviews() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALERT_REVIEWS);
      if (!data) return {};
      const parsed = JSON.parse(data);
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
      console.error('Error reading alert reviews:', e);
      return {};
    }
  }

  saveAlertReview(alertId, reviewData) {
    if (!alertId) return;
    const reviews = this.getAlertReviews();
    reviews[alertId] = {
      ...reviewData,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEYS.ALERT_REVIEWS, JSON.stringify(reviews));
      this.notifyChange('alerts');
    } catch (e) {
      console.error('Storage write error (alert reviews):', e);
    }
  }

  loadSampleData(notify = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(SAMPLE_FOOD_DATA));
      localStorage.setItem(STORAGE_KEYS.OUTCOMES, JSON.stringify(SAMPLE_OUTCOMES));
      localStorage.setItem(STORAGE_KEYS.ALERT_REVIEWS, JSON.stringify(SAMPLE_ALERT_REVIEWS));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.error('Storage write error (sample data):', e);
    }
    if (notify) this.notifyChange('all');
  }

  resetAllData() {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.OUTCOMES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ALERT_REVIEWS, JSON.stringify({}));
    } catch (e) {
      console.error('Storage write error (reset):', e);
    }
    this.notifyChange('all');
  }

  notifyChange(type) {
    window.dispatchEvent(new CustomEvent('foodwise:datachange', { detail: { type } }));
  }

  /**
   * Escape and wrap CSV values handling quotes, commas, and newlines safely
   */
  escapeCSVValue(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Export all inventory & outcomes to CSV format
   */
  exportToCSV() {
    const items = this.getInventory();

    if (items.length === 0) {
      throw new Error('No food records available to export.');
    }

    const headers = [
      'Record ID',
      'Food Item',
      'Category',
      'Quantity Prepared',
      'Quantity Served',
      'Estimated Demand',
      'Remaining Leftover',
      'Estimated Surplus',
      'Surplus %',
      'Unit',
      'Meal Session',
      'Prepared Date/Time',
      'Use-By Date/Time',
      'Expected Attendance',
      'Notes',
      'Sample Data'
    ];

    const rows = items.map(item => {
      const prep = Number(item.preparedQty) || 0;
      const served = Number(item.servedQty) || 0;
      const demand = Number(item.estimatedDemand) || 0;
      const remaining = Number(Math.max(0, prep - served).toFixed(1));
      const surplus = Number(Math.max(0, prep - demand).toFixed(1));
      const surplusPct = prep > 0 ? ((surplus / prep) * 100).toFixed(1) : '0.0';

      return [
        this.escapeCSVValue(item.id),
        this.escapeCSVValue(item.name || ''),
        this.escapeCSVValue(item.category || ''),
        prep,
        served,
        demand,
        remaining,
        surplus,
        this.escapeCSVValue(surplusPct + '%'),
        this.escapeCSVValue(item.unit || 'kg'),
        this.escapeCSVValue(item.mealSession || ''),
        this.escapeCSVValue(item.preparedAt || ''),
        this.escapeCSVValue(item.useByAt || ''),
        this.escapeCSVValue(item.expectedAttendance || ''),
        this.escapeCSVValue(item.notes || ''),
        this.escapeCSVValue(item.isSample ? 'SIMULATED' : 'LIVE')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(h => this.escapeCSVValue(h)).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `foodwise_inventory_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Global store singleton
const store = new Store();
window.store = store;
