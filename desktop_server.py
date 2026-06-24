from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import webbrowser

ROOT = Path(__file__).parent / "app"
PORT = 8765

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AppHandler)
    url = f"http://127.0.0.1:{PORT}"
    print(f"MaxyMessenger desktop is running at {url}")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping desktop server...")
