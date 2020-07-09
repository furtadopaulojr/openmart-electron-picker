const {app, BrowserWindow, screen, net, ipcMain, powerSaveBlocker, protocol,} = require('electron');
const url = require('url');
const path = require('path');

const {autoUpdater} = require('electron-updater');

require('update-electron-app')({
    repo: 'furtadopaulojr/openmart-electron-picker',
    updateInterval: '5 minutes',
    logger: require('electron-log')
});

const isDev = require('electron-is-dev');

if (isDev) {
    console.log('Running in development');
} else {
    console.log('Running in production');
}


if (handleSquirrelEvent(app)) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
}

let onlineStatusWindow;
let win;
let winMonitor;
let online = 'offline';
let continua = true;
// let apiUrl = 'https://api.dev.openmart.com.br';
let apiUrl = 'https://api.openmart.com.br';


protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: {secure: true, standard: true}}]);

app.whenReady().then(() => {
    onlineStatusWindow = new BrowserWindow({width: 0, height: 0, show: false, webPreferences: {nodeIntegration: true}});
    onlineStatusWindow.loadURL('file://' + __dirname + '/dist/online/online-status.html');

    const id = powerSaveBlocker.start('prevent-display-sleep');

    const id2 = powerSaveBlocker.start('prevent-app-suspension');

    process.on("uncaughtException", (err) => {
        // console.log('deu ruim', err);
        if (winMonitor) {
            winMonitor.closable = true;
            winMonitor.close();
        }
    });

});

ipcMain.on('online-status-changed', (event, status) => {
    online = status;
    if (status === 'offline') {
        if (winMonitor) {
            winMonitor.closable = true;
            winMonitor.close();
        }
    } else {
        // createWindowMonitor()

        var tokenStorage = getFromLocalStorage('token');

        if (tokenStorage instanceof Promise) {
            tokenStorage.then(function (token) {
                if (token) {
                    getFromLocalStorage('lojaAtual').then(function (lojaAtual) {
                        if (lojaAtual) {
                            createWindowMonitor();
                        }

                    }).catch(error => {
                    });
                }
            }).catch(error => {
            });
        }


    }
});


function createWindowPrincipal() {
    // Cria uma janela de navegação.
    win = new BrowserWindow({
        width: 1366,
        height: 800,
        minWidth: 1366,
        minHeight: 768,
        background: '#ffffff',
        icon: path.join(__dirname, 'images/icon.ico'),
        webPreferences: {
            nodeIntegration: true
        }
    })
    clearLoja();
    win.setMenu(null);
    win.loadURL('file://' + __dirname + '/dist/index.html');

    win.webContents.openDevTools();

    win.on("closed", function () {
        app.quit();
        continua = false;
        win = null;

        if (winMonitor) {
            winMonitor.closable = true;
            winMonitor.close();
            winMonitor = null;
        }
    });
}

function createWindowMonitor() {
    if (!winMonitor) {
        let monitorW = 360;
        let monitorH = 350;
        let display = screen.getPrimaryDisplay();

        winMonitor = new BrowserWindow({
            width: monitorW,
            height: monitorH,
            minWidth: monitorW,
            minHeight: monitorH,
            maxWidth: monitorW,
            maxHeight: monitorH,
            background: '#ffffff',
            alwaysOnTop: true,
            minimizable: true,
            maximizable: false,
            icon: path.join(__dirname, 'images/icon.ico'),
            closable: false,
            x: 0,
            y: display.bounds.height - monitorH - 40,
            // parent: win,
            webPreferences: {
                nodeIntegration: true
            }
        });
        winMonitor.setMenu(null);
        winMonitor.loadURL(url.format({
            pathname: path.join(__dirname, '/dist/index.html'),
            protocol: 'file:',
            slashes: true,
            hash: '/monitor-pedido'
        }));

        winMonitor.on("closed", function () {
            if (winMonitor) {
                winMonitor = null;
            }
            if (!win) {
                app.quit();
            }
        });
    }

    //winMonitor.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Algumas APIs podem ser usadas somente depois que este evento ocorre.
app.whenReady().then(createWindowPrincipal)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindowPrincipal()
    }
});


app.on('close', () => {

    if (win) {
        win.closable = true;
        win.close();
        win = null;
    }

    if (winMonitor) {
        winMonitor.closable = true;
        winMonitor.close();
        winMonitor = null;
    }
});

setInterval(function () {
    autoUpdater.checkForUpdatesAndNotify();
}, 2000);

setInterval(function () {
    if (win) {

    } else {
        // se não tiver win fecha a winMonitor
        winMonitor.closable = true;
        winMonitor.close();
        winMonitor = null;
    }
}, 3000);

setInterval(function () {

    if (continua) {
        if (win) {
            var tokenStorage = getFromLocalStorage('token');
            if (tokenStorage instanceof Promise) {
                tokenStorage.then(function (token) {
                    if (token) {
                        getFromLocalStorage('lojaAtual').then(function (lojaAtual) {
                            if (lojaAtual) {
                                if (!winMonitor) {
                                    createWindowMonitor();
                                }
                            } else {
                                winMonitor.closable = true;
                                winMonitor.close();
                                winMonitor = null;
                            }

                        }).catch(error => {
                        });
                    } else {
                        if (winMonitor != null) {
                            winMonitor.closable = true;
                            winMonitor.close();
                            winMonitor = null;
                        }
                    }
                }).catch(error => {
                });
            }

        }
    }


}, 1000);


setInterval(function () {

    if (continua) {
        if (online === 'online' && win) {

            var tokenStorage = getFromLocalStorage('token');

            if (tokenStorage instanceof Promise) {
                tokenStorage.then(function (token) {
                    if (token) {
                        getFromLocalStorage('lojaAtual').then(function (lojaAtual) {
                            if (lojaAtual) {
                                const loja = JSON.parse(lojamAtual);
                                if (!win.isMinimized()) {
                                    // chamar a api
                                    const request = net.request({
                                        method: 'PUT',
                                        url: apiUrl + '/picker/loja/' + loja.id + '/view',
                                    });
                                    request.setHeader('token', token);
                                    request.on('response', (response) => {
                                        // console.log(`STATUS: ${response.statusCode}`);
                                    });
                                    request.end();
                                }
                            }
                        }).catch(error => {
                        });
                    }
                }).catch(error => {
                });
            }


        }
    }

}, 10000);

// }, 300000);

function getFromLocalStorage(key) {
    if (win) {
        return win.webContents.executeJavaScript('localStorage.getItem("' + key + '");', true)
    }
}

function clearLoja() {
    if (win) {
        win.webContents.executeJavaScript('localStorage.removeItem("lojaAtual");', true).then((lojaAtual) => {
        }).catch(error => {
        });
    }
}

function clearToken() {
    if (win) {
        win.webContents.executeJavaScript('localStorage.removeItem("token");', true).then((e) => {
        }).catch(error => {
        });
    }
}

function openMonitorIfHasLoja() {
    getFromLocalStorage('token').then(function (token) {
        if (token) {
            getFromLocalStorage('lojaAtual').then(function (lojaAtual) {
                if (lojaAtual) {
                    if (!winMonitor) {
                        createWindowMonitor();
                    }
                } else {
                    winMonitor.closable = true;
                    winMonitor.close();
                    winMonitor = null;
                }

            }).catch(error => {
            });
        } else {
            if (winMonitor != null) {
                winMonitor.closable = true;
                winMonitor.close();
                winMonitor = null;
            }
        }
    }).catch(error => {
    });
}

function handleSquirrelEvent(application) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function (command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) {
        }

        return spawnedProcess;
    };

    const spawnUpdate = function (args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            application.quit();
            return true;
    }
};

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', {version: app.getVersion()});
});

autoUpdater.on('update-available', () => {
    win.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded');
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});
