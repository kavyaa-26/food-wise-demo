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
        header = bytearray([0x81]) # FIN + text opcode
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

    def recv(self, timeout=2.0):
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

def inspect_browser():
    # Launch Chrome with remote debugging
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "http://localhost:8000"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        req = urllib.request.urlopen("http://localhost:9222/json")
        targets = json.loads(req.read().decode())
        page_target = None
        for t in targets:
            if t.get("type") == "page":
                page_target = t
                break
        if not page_target:
            page_target = targets[0]
        
        ws_url = page_target["webSocketDebuggerUrl"]
        print("Connected to:", ws_url)
        # Parse host and path
        # ws://localhost:9222/devtools/page/...
        path = "/" + ws_url.split("/", 3)[3]
        ws = SimpleWebSocket("localhost", 9222, path)

        # Enable Log and Runtime
        ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        ws.send(json.dumps({"id": 2, "method": "Log.enable"}))

        # Check console logs and evaluate expressions
        logs = []
        for _ in range(10):
            msg = ws.recv(timeout=0.5)
            if msg:
                obj = json.loads(msg)
                logs.append(obj)
                if obj.get("method") == "Runtime.exceptionThrown":
                    print("RUNTIME EXCEPTION:", obj["params"]["exceptionDetails"])
                elif obj.get("method") == "Runtime.consoleAPICalled":
                    print("CONSOLE LOG:", obj["params"]["type"], obj["params"]["args"])

        # Evaluate window.App
        ws.send(json.dumps({
            "id": 10,
            "method": "Runtime.evaluate",
            "params": {"expression": "typeof window.App"}
        }))
        for _ in range(5):
            msg = ws.recv(timeout=0.5)
            if msg:
                obj = json.loads(msg)
                if obj.get("id") == 10:
                    print("typeof window.App:", obj.get("result", {}).get("result", {}).get("value"))

        # Evaluate what happens when clicking a button
        eval_script = """
        (() => {
            const results = {};
            results.appType = typeof window.App;
            results.storeType = typeof window.store;
            results.buttonsCount = document.querySelectorAll('button').length;
            results.buttons = [];
            document.querySelectorAll('button').forEach((b, i) => {
                results.buttons.push({
                    index: i,
                    text: b.innerText.trim().slice(0, 30),
                    onclickAttr: b.getAttribute('onclick'),
                    id: b.id,
                    className: b.className
                });
            });
            return results;
        })()
        """
        ws.send(json.dumps({
            "id": 11,
            "method": "Runtime.evaluate",
            "params": {
                "expression": eval_script,
                "returnByValue": True
            }
        }))
        for _ in range(5):
            msg = ws.recv(timeout=0.5)
            if msg:
                obj = json.loads(msg)
                if obj.get("id") == 11:
                    print("Button evaluation summary:")
                    val = obj.get("result", {}).get("result", {}).get("value")
                    print(json.dumps(val, indent=2))

        ws.close()
    finally:
        proc.terminate()

if __name__ == "__main__":
    inspect_browser()
