"""
FoodWise AI — Local Web Server
Runs a lightweight, multi-threaded HTTP server with appropriate MIME types
for instant local preview.
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    port = PORT
    max_attempts = 10

    for attempt in range(max_attempts):
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                url = f"http://localhost:{port}"
                print("=" * 65)
                print(f"  FoodWise AI — Intelligent Food Waste Reduction Platform")
                print(f"  Local Web Server Running at: {url}")
                print(f"  Serving files from: {DIRECTORY}")
                print("=" * 65)
                print("Press Ctrl+C to stop the server.")
                
                # Check if --no-browser flag passed
                if "--no-browser" not in sys.argv:
                    try:
                        webbrowser.open(url)
                    except Exception:
                        pass
                
                httpd.serve_forever()
                break
        except OSError as e:
            if "address already in use" in str(e).lower() or e.errno == 48 or e.errno == 10048:
                print(f"Port {port} in use, trying port {port + 1}...")
                port += 1
            else:
                raise e

if __name__ == "__main__":
    run_server()
