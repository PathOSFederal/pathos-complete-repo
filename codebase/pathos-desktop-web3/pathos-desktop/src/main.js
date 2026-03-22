/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { app, BrowserWindow } = require("electron");
const path = require("path");

const DEV_URL = process.env.PATHOS_DESKTOP_DEV_URL || "http://localhost:3000";

function isDev() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.PATHOS_DESKTOP_DEV === "1"
  );
}

function getProdIndexPath() {
  return path.join(__dirname, "..", "renderer", "index.html");
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev(),
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev()) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(getProdIndexPath());
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
