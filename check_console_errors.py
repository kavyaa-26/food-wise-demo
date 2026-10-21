"""
Inspect browser console and errors via Chrome CDP
"""

import subprocess
import time
import urllib.request
import json
import os

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def run():
    # Start Chrome with remote debugging
    cmd = [
        CHROME_PATH,
        "--headless",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "http://localhost:8000"
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(2)

    try:
        # Get list of targets
        req = urllib.request.urlopen("http://localhost:9222/json")
        targets = json.loads(req.read().decode())
        print(f"Targets: {len(targets)}")
        if targets:
            ws_url = targets[0].get("webSocketDebuggerUrl")
            print(f"WebSocket URL: {ws_url}")
            print(f"Title: {targets[0].get('title')}")
            print(f"URL: {targets[0].get('url')}")
    except Exception as e:
        print(f"Error querying CDP: {e}")
    finally:
        proc.terminate()

if __name__ == "__main__":
    run()
