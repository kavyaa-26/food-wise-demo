# FoodWise AI — Intelligent Food Waste Reduction

> **A Complete, Functional Web Application for College Canteens, Hostels, Restaurants & Event Organizers**

---

## ☕ Design Theme & Editorial Inspiration

FoodWise AI takes visual and typographic inspiration from **premium specialty coffee websites** (warm photography, editorial layouts, generous whitespace, and refined typography).

### Color Palette
- **Cream (`#F5EBDD`)** & **Soft Beige (`#E8D5BE`)**: Dominates background surfaces, creating an inviting, organic atmosphere.
- **Chocolate Brown (`#4A281B`)** & **Deep Brown (`#2D1B15`)**: Headings, call-to-action buttons, and high-contrast editorial accents.
- **Sage Green (`#879477`)** & **Soft Olive (`#B4B99A`)**: Sustainability metrics, positive operational alerts, and verified safety badges.
- **Warm Terracotta (`#C26D53`)** & **Amber (`#DDA15E`)**: High potential surplus warnings and urgent use-by flags.
- **Pure White (`#FFFFFF`)**: Input controls and clean focus states.

---

## 🌟 Key Functional Features

### 1. Navigation & Responsive Routing
- Single-page view router (`#home`, `#dashboard`, `#inventory`, `#estimation`, `#alerts`, `#outcomes`, `#analytics`, `#testing`, `#about`).
- Dynamic live alert badge counter synchronized with active kitchen warnings.
- Mobile drawer navigation.

### 2. Full-Width Photographic Hero
- Realistic high-resolution culinary photography with warm dark gradient overlay.
- Headline: *"Make Every Meal Count."*
- Subtitle: *"Smarter food planning. Less waste. A better tomorrow."*
- Interactive CTA buttons linked directly to Dashboard and Food Tracking.

### 3. Four Feature Cards ("Smarter Food Management")
- **Smart Demand Estimation**: Uses historical service observations for automated baseline averaging.
- **Surplus Food Detection**: Flags batches where preparation exceeds expected diner demand.
- **Waste Reduction Insights**: Empirical consumption and surplus tracking across meal sessions.
- **Responsible Food Redistribution**: Controlled tracking with mandatory human temperature and sensory check sign-offs.

### 4. Why Choose FoodWise AI? (Editorial Split Layout)
- Left side: Deep chocolate-brown container with cream serif typography and key pillars.
- Right side: High-resolution food photography with campus standard quote badge.

### 5. Kitchen Operations Dashboard
- **8 Dynamic Statistic Cards**:
  1. Total Food Prepared
  2. Total Food Served
  3. Remaining Food (`Prepared - Served`)
  4. Estimated Surplus (`max(0, Prepared - Demand)`)
  5. Food Reused (from verified outcome logs)
  6. Food Redistributed (from verified outcome logs)
  7. Food Discarded (from verified outcome logs)
  8. Active Kitchen Alerts
- **Interactive Visualizations (Chart.js)**:
  - Prepared vs. Served Quantities (Bar chart)
  - Potential Surplus by Food Item (Horizontal ranking)
  - Food Outcomes Breakdown (Doughnut)
  - Surplus by Food Category (Pie chart)
- Full reactivity: All statistics and charts update instantly when records change.

### 6. Food Inventory Management
- Full CRUD operations with validation.
- Fields: Food Item Name, Category, Quantity Prepared, Quantity Served, Estimated Demand, Unit (`kg`, `portions`, `plates`, `litres`), Meal Session (`Breakfast`, `Lunch`, `Snacks`, `Dinner`, `Event`), Preparation Date/Time, Use-By Date/Time, Expected Attendance, Kitchen Notes.
- Search filter & Category filter & Session filter.
- Individual Record Detail Drawer with detailed mathematical formula breakdown.
- Export all records to RFC-4180 compliant CSV.
- One-click Load Simulated Demonstration Data & Safe Reset Demo.

### 7. AI-Assisted Demand & Surplus Estimation
- **Exact Mathematical Formulas**:
  $$\text{Remaining Food} = \text{Prepared} - \text{Served}$$
  $$\text{Estimated Surplus} = \max(0, \text{Prepared} - \text{Estimated Demand})$$
  $$\text{Surplus Percentage} = \frac{\text{Estimated Surplus}}{\text{Prepared}} \times 100$$
- **Configurable Demonstration Thresholds**:
  - Low Potential Surplus: $< 10\%$
  - Moderate Potential Surplus: $10\% - 25\%$
  - High Potential Surplus: $> 25\%$
- **Historical Demand Averaging**: Calculates arithmetic sample mean for identical items when $\ge 2$ historical service cycles exist. If data is insufficient, it transparently requests supervisor input.
- **No False ML Claims**: Explicitly documents rule-based statistical averaging without pretending a neural network is used where statistical rules apply.

### 8. Kitchen Alert Center
- Real-time generation of alerts for:
  - High Potential Surplus ($> 25\%$)
  - Unusual Quantities (e.g. prepared $> 15$ with 0 served)
  - Approaching or Expired Use-By Limits ($< 4$ hours)
  - Missing Perishable Information
- Supervisors can review, acknowledge, and add timestamped kitchen audit notes.

### 9. Food Outcome Tracking & Human Sign-off
- Classifications: `Reused`, `Redistributed`, `Discarded`, `Under Review`.
- Strict conservation constraint: outcome quantity cannot exceed remaining leftovers.
- Mandatory human safety verification checkbox (sensory inspection, temperature check $\le 4^\circ\text{C}$ or $\ge 60^\circ\text{C}$, clean food-grade transport).
- Strictly counts only recorded outcomes as saved food; does not count hypothetical surplus forecasts.

### 10. Advanced Waste & Efficiency Analytics
- Trend analysis over time (Line chart).
- Food Redistribution Efficiency Percentage.
- Data adequacy notices when fewer than 3 records exist.

### 11. Automated Testing Center (16 Test Assertions)
- Functional testing center with "Run All Tests" and individual test execution.
- 16 isolated assertions covering:
  1. Normal Food Preparation
  2. High Potential Surplus Flag
  3. No Leftovers (100% Served)
  4. Missing Quantities Input
  5. Negative Quantities Rejection
  6. Zero Prepared Quantity Guard
  7. Served Exceeding Prepared Rejection
  8. Duplicate Records Detection
  9. Invalid Chronological Dates (Use-By before Prep)
  10. Approaching Use-By Dates ($< 4$h)
  11. Missing Historical Baseline Fallback
  12. Historical Average Demand Calculation
  13. Unusually High Demand Handling
  14. Invalid Outcome Quantity Exceeding Leftovers
  15. Duplicate Outcome Entries Prevention
  16. Inconsistent Units Validation
- Dynamic pass rate counter (100% / 16 of 16 tests passing).
- Guaranteed zero side-effects on live user records.

---

## 🚀 How to Run the Application

### Option 1: Using the Python Server (Recommended)
From PowerShell or Command Prompt:
```powershell
cd C:\Users\devik\.gemini\antigravity\scratch\foodwise-ai
python server.py
```
Open your browser at: `http://localhost:8000`

### Option 2: Directly in Any Web Browser
Simply double-click or open `index.html` in Chrome, Edge, Firefox, or Safari:
```powershell
Start-Process "C:\Users\devik\.gemini\antigravity\scratch\foodwise-ai\index.html"
```

---

## 🔒 Food Safety & Ethical Disclaimer
FoodWise AI is a decision-support prototype engineered for hackathon presentation and institutional testing. Algorithmic alerts and estimates support kitchen managers but do not substitute for mandatory public health hygiene codes, official HACCP audits, or trained kitchen inspection judgment.
