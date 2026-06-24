const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const root = path.join(__dirname, "app");
const preferredPort = Number(process.env.PORT || 8765);
let attemptedFallback = false;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !attemptedFallback) {
    attemptedFallback = true;
    const nextPort = preferredPort + 1;
    console.log(`Port ${preferredPort} is busy, trying ${nextPort}...`);
    server.listen(nextPort, "127.0.0.1");
    return;
  }

  console.error("Server start failed:", error.message);
  process.exit(1);
});

server.on("listening", () => {
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`MaxyMessenger is running at ${url}`);
  execFile("cmd", ["/c", "start", "", url], { windowsHide: true }, () => {});
});

server.listen(preferredPort, "127.0.0.1");
