const { app, BrowserWindow } = require("electron");
const path = require("node:path");

const gotSingleInstanceLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;

    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    // The renderer does not need device permissions or privileged APIs.
    app.on("web-contents-created", (_event, contents) => {
      contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
      });
      contents.setWindowOpenHandler(() => ({ action: "deny" }));
      contents.on("will-navigate", (event) => event.preventDefault());
    });

    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: "RasPi Vehicle Control",
      icon: path.join(__dirname, "icon.png"),
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

    mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });

  app.on("activate", () => {
    if (mainWindow) mainWindow.show();
  });

  app.on("window-all-closed", () => app.quit());
}
