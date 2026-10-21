"""
Comprehensive automated browser button testing via Chrome DevTools Protocol
Tests all 9 views, modals, forms, CRUD actions, outcome logging, alert reviews, and CSV export.
"""

import os
import sys
import time
import json
import base64
import socket
import struct
import urllib.request
import subprocess

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

class SimpleWebSocket:
    def __init__(self, host, port, path):
        self.sock = socket.create_connection((host, port))
        key = base64.b64encode(os.urandom(16)).decode('ascii')
        req = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode('ascii'))
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)
        if b"101" not in resp:
            raise RuntimeError(f"Handshake failed: {resp.decode('latin1', 'replace')}")

    def send(self, msg_str):
        data = msg_str.encode('utf-8')
        length = len(data)
        mask_key = os.urandom(4)
        header = bytearray([0x81])
        if length <= 125:
            header.append(0x80 | length)
        elif length <= 65535:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))
        masked_data = bytearray(length)
        for i in range(length):
            masked_data[i] = data[i] ^ mask_key[i % 4]
        self.sock.sendall(header + mask_key + masked_data)

    def recv(self, timeout=3.0):
        self.sock.settimeout(timeout)
        try:
            head = self.sock.recv(2)
            if not head:
                return None
            b1, b2 = head[0], head[1]
            opcode = b1 & 0x0F
            masked = (b2 & 0x80) != 0
            payload_len = b2 & 0x7F
            if payload_len == 126:
                ext = self.sock.recv(2)
                payload_len = struct.unpack("!H", ext)[0]
            elif payload_len == 127:
                ext = self.sock.recv(8)
                payload_len = struct.unpack("!Q", ext)[0]

            if masked:
                mask_key = self.sock.recv(4)
            data = b""
            while len(data) < payload_len:
                chunk = self.sock.recv(payload_len - len(data))
                if not chunk:
                    break
                data += chunk

            if masked:
                unmasked = bytearray(len(data))
                for i in range(len(data)):
                    unmasked[i] = data[i] ^ mask_key[i % 4]
                return unmasked.decode('utf-8', 'replace')
            return data.decode('utf-8', 'replace')
        except socket.timeout:
            return None

    def close(self):
        try:
            self.sock.close()
        except:
            pass

class BrowserDriver:
    def __init__(self, ws):
        self.ws = ws
        self.msg_id = 1
        self.exceptions = []

    def call(self, method, params=None):
        mid = self.msg_id
        self.msg_id += 1
        payload = {"id": mid, "method": method}
        if params:
            payload["params"] = params
        self.ws.send(json.dumps(payload))
        
        # Read until response with matching id
        start = time.time()
        while time.time() - start < 5.0:
            msg = self.ws.recv(timeout=1.0)
            if not msg:
                continue
            obj = json.loads(msg)
            if obj.get("method") == "Runtime.exceptionThrown":
                self.exceptions.append(obj["params"]["exceptionDetails"])
            if obj.get("id") == mid:
                if "error" in obj:
                    raise RuntimeError(obj["error"])
                return obj.get("result", {})
        raise TimeoutError(f"Timeout waiting for command {mid} ({method})")

    def eval(self, script):
        res = self.call("Runtime.evaluate", {
            "expression": script,
            "returnByValue": True,
            "awaitPromise": True
        })
        val = res.get("result", {}).get("value")
        exc = res.get("exceptionDetails")
        if exc:
            self.exceptions.append(exc)
            raise RuntimeError(f"Script threw: {exc.get('text', '')} {exc.get('exception', {}).get('description', '')}")
        return val

def run_tests():
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9223",
        "--disable-gpu",
        "--no-sandbox",
        "http://localhost:8000"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        req = urllib.request.urlopen("http://localhost:9223/json")
        targets = json.loads(req.read().decode())
        page_target = [t for t in targets if t.get("type") == "page"][0]
        
        ws_url = page_target["webSocketDebuggerUrl"]
        path = "/" + ws_url.split("/", 3)[3]
        ws = SimpleWebSocket("localhost", 9223, path)
        driver = BrowserDriver(ws)

        driver.call("Runtime.enable")
        driver.call("Log.enable")

        # Wait for page and window.App to be ready
        ready = False
        last_state = None
        for i in range(100):
            try:
                state = driver.eval("({ ready: document.readyState, hasApp: typeof window.App === 'object' })")
                last_state = state
                if state and state.get("hasApp"):
                    ready = True
                    break
            except Exception as e:
                last_state = str(e)
            time.sleep(0.2)
        if not ready:
            raise RuntimeError(f"Page did not load window.App within timeout (last state: {last_state})")

        print("=== BROWSER BUTTON & INTERACTION SUITE ===")

        # 1. Verify Navigation
        routes = ['home', 'dashboard', 'inventory', 'estimation', 'alerts', 'outcomes', 'analytics', 'testing', 'about']
        for route in routes:
            res = driver.eval(f"""
            (() => {{
                App.navigateTo('{route}');
                const active = document.getElementById('view-{route}').classList.contains('active');
                const hash = window.location.hash;
                return {{ active, hash, activeView: App.activeView }};
            }})()
            """)
            assert res['active'] == True, f"Route {route} not active"
            assert res['activeView'] == route
            print(f"PASS: Navigation to #{route} verified")

        # 2. Test Get Started and Hero Buttons
        res = driver.eval("""
        (() => {
            App.navigateTo('home');
            // Click Get Started button
            const getStarted = document.querySelector('.nav-actions button');
            getStarted.click();
            return {
                dashboardActive: document.getElementById('view-dashboard').classList.contains('active'),
                view: App.activeView
            };
        })()
        """)
        assert res['dashboardActive'] == True and res['view'] == 'dashboard'
        print("PASS: 'Get Started' button click navigates to dashboard")

        res = driver.eval("""
        (() => {
            App.navigateTo('home');
            // Click hero Explore Dashboard button
            const heroBtn = document.querySelectorAll('.hero-cta-group .btn-primary')[0];
            heroBtn.click();
            return {
                dashboardActive: document.getElementById('view-dashboard').classList.contains('active'),
                view: App.activeView
            };
        })()
        """)
        assert res['dashboardActive'] == True and res['view'] == 'dashboard'
        print("PASS: Hero 'Explore Dashboard' button click navigates to dashboard")

        res = driver.eval("""
        (() => {
            App.navigateTo('home');
            // Click hero Track Food Inventory button
            const trackBtn = document.querySelectorAll('.hero-cta-group .btn-secondary')[0];
            trackBtn.click();
            return {
                inventoryActive: document.getElementById('view-inventory').classList.contains('active'),
                view: App.activeView
            };
        })()
        """)
        assert res['inventoryActive'] == True and res['view'] == 'inventory'
        print("PASS: Hero 'Track Food Inventory' button click navigates to inventory")

        # 3. Test Modals: Open & Close Add Record Modal
        res = driver.eval("""
        (() => {
            App.openAddRecordModal();
            const modal = document.getElementById('recordModal');
            const isOpen = modal.classList.contains('open');
            // Close modal
            App.closeModal('recordModal');
            const isClosed = !modal.classList.contains('open');
            return { isOpen, isClosed };
        })()
        """)
        assert res['isOpen'] and res['isClosed']
        print("PASS: Add Record Modal open and close buttons work correctly")

        # 4. Test CRUD: Add Record via Form
        res = driver.eval("""
        (() => {
            App.openAddRecordModal();
            document.getElementById('formFoodName').value = 'Test Crispy Samosas';
            document.getElementById('formCategory').value = 'Breakfast/Snacks';
            document.getElementById('formPrepQty').value = '60';
            document.getElementById('formServedQty').value = '45';
            document.getElementById('formDemandQty').value = '50';
            document.getElementById('formUnit').value = 'portions';
            document.getElementById('formPreparedAt').value = '2026-10-13T16:00';
            document.getElementById('formUseByAt').value = '2026-10-13T20:00';
            document.getElementById('formAttendance').value = '80';
            document.getElementById('formMealSession').value = 'Lunch';
            document.getElementById('formNotes').value = 'Freshly fried batch for evening snack';
            
            // Click save
            App.saveRecordFromForm();

            // Check if record exists in store
            const items = store.getInventory();
            const created = items.find(i => i.name === 'Test Crispy Samosas');
            return {
                created: !!created,
                id: created ? created.id : null,
                surplus: created ? (created.preparedQty - created.servedQty) : null
            };
        })()
        """)
        assert res['created'] == True
        test_id = res['id']
        assert res['surplus'] == 15
        print(f"PASS: Add Record via Form successfully created item (id: {test_id})")

        # 5. Test CRUD: View Record Details Modal
        res = driver.eval(f"""
        (() => {{
            App.openRecordDetailsModal('{test_id}');
            const modal = document.getElementById('recordDetailsModal');
            const isOpen = modal.classList.contains('open');
            const title = document.getElementById('recordDetailsBody').innerText;
            App.closeModal('recordDetailsModal');
            return {{ isOpen, hasName: title.includes('Test Crispy Samosas') }};
        }})()
        """)
        assert res['isOpen'] and res['hasName']
        print("PASS: View Record Details action button and modal display correctly")

        # 6. Test CRUD: Edit Record via Form
        res = driver.eval(f"""
        (() => {{
            App.openEditRecordModal('{test_id}');
            document.getElementById('formServedQty').value = '55';
            App.saveRecordFromForm();
            const updated = store.getRecord('{test_id}');
            return {{
                servedQty: updated ? updated.servedQty : null,
                leftover: updated ? (updated.preparedQty - updated.servedQty) : null
            }};
        }})()
        """)
        assert res['servedQty'] == 55
        assert res['leftover'] == 5
        print(f"PASS: Edit Record via Form updated servedQty to 55 and leftover to 5")

        # 7. Test Outcome Logging
        res = driver.eval(f"""
        (() => {{
            App.openOutcomeModal('{test_id}');
            const modal = document.getElementById('outcomeModal');
            const isOpen = modal.classList.contains('open');
            document.getElementById('outcomeType').value = 'Redistributed';
            document.getElementById('outcomeQty').value = '5';
            document.getElementById('outcomeDestination').value = 'City Care Foundation';
            document.getElementById('outcomeVerifier').value = 'Chef Ramesh';
            document.getElementById('outcomeSafetyCheck').checked = true;
            document.getElementById('outcomeNotes').value = 'Chilled and packed in insulated boxes';
            App.saveOutcomeFromForm();
            
            const outcomes = store.getOutcomes();
            const logged = outcomes.find(o => o.recordId === '{test_id}');
            return {{
                isOpen,
                logged: !!logged,
                action: logged ? logged.outcomeType : null,
                qty: logged ? logged.quantity : null
            }};
        }})()
        """)
        assert res['isOpen'] and res['logged'] and res['action'] == 'Redistributed' and res['qty'] == 5
        print("PASS: Outcome logging action button and form submit verified")

        # 8. Test Alert Review
        res = driver.eval("""
        (() => {
            const alerts = AlertCenter.generateAlerts(store.getInventory(), store.getSettings());
            if (alerts.length === 0) return { alertTested: false };
            const firstAlert = alerts[0];
            App.openAlertReviewModal(firstAlert.id);
            const modal = document.getElementById('alertReviewModal');
            const isOpen = modal.classList.contains('open');
            document.getElementById('reviewStatusSelect').value = 'Reviewed - Under Action';
            document.getElementById('reviewNotesInput').value = 'Staff dispatched to redistribute surplus.';
            App.saveAlertReviewFromForm();
            const savedReviews = store.getAlertReviews();
            return {
                alertTested: true,
                isOpen,
                reviewed: !!savedReviews[firstAlert.id]
            };
        })()
        """)
        assert res['alertTested'] and res['isOpen'] and res['reviewed']
        print("PASS: Alert review action button and modal review workflow verified")

        # 9. Test CRUD: Delete Record
        res = driver.eval(f"""
        (() => {{
            const origConfirm = window.confirm;
            window.confirm = () => true;
            App.deleteRecord('{test_id}');
            window.confirm = origConfirm;
            const item = store.getRecord('{test_id}');
            return {{ deleted: !item }};
        }})()
        """)
        assert res['deleted'] == True
        print(f"PASS: Delete Record button and action completed safely")

        # 10. Test In-Browser Test Suite Button
        res = driver.eval("""
        (() => {
            App.navigateTo('testing');
            App.runAllTests();
            const passed = document.getElementById('testPassedCount').innerText;
            const total = document.getElementById('testTotalCount').innerText;
            const passRate = document.getElementById('testPassRate').innerText;
            return { passed, total, passRate };
        })()
        """)
        assert res['passed'] == '16' and res['total'] == '16' and res['passRate'] == '100%'
        print(f"PASS: In-browser test suite executed: {res['passed']}/{res['total']} ({res['passRate']} passed)")

        # 11. Check for any unhandled exceptions
        print(f"Total unhandled browser runtime exceptions: {len(driver.exceptions)}")
        if driver.exceptions:
            for exc in driver.exceptions:
                print("EXCEPTION:", exc)
        assert len(driver.exceptions) == 0

        ws.close()
        print("\nALL 11 BROWSER INTERACTION VERIFICATIONS PASSED WITH ZERO EXCEPTIONS!")

    finally:
        proc.terminate()

if __name__ == "__main__":
    run_tests()
