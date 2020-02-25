// @flow
import { app, Menu, shell, BrowserWindow } from 'electron';

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu() {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment();
    }

    const template = process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment() {
    this.mainWindow.openDevTools();
    this.mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.inspectElement(x, y);
          }
        }
      ]).popup(this.mainWindow);
    });
  }

  buildDarwinTemplate() {
    const { mainWindow } = this;

    const subMenuAbout = {
      label: 'Zecwallet Lite',
      submenu: [
        {
          label: 'About Zecwallet Lite',
          selector: 'orderFrontStandardAboutPanel:',
          click: () => {
            mainWindow.webContents.send('about');
          }
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide Zecwallet Lite',
          accelerator: 'Command+H',
          selector: 'hide:'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:'
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    };
    const subMenuEdit = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:'
        }
      ]
    };
    const subMenuViewDev = {
      label: 'Wallet',
      submenu: [
        {
          label: 'Wallet Seed',
          click: () => {
            mainWindow.webContents.send('seed');
          }
        },
        {
          label: '&Export All Private Keys',
          click: () => {
            mainWindow.webContents.send('exportall');
          }
        },
        {
          label: '&Rescan',
          click: () => {
            mainWindow.webContents.send('rescan');
          }
        },
        {
          label: 'View Lightwalletd Info',
          click: () => {
            this.mainWindow.webContents.send('zcashd');
          }
        },
        { type: 'separator' },
        {
          label: 'Encrypt Wallet',
          click: () => {
            this.mainWindow.webContents.send('encrypt');
          }
        },
        {
          label: 'Remove Wallet Encryption',
          click: () => {
            this.mainWindow.webContents.send('decrypt');
          }
        },
        {
          label: 'Unlock',
          click: () => {
            this.mainWindow.webContents.send('unlock');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.toggleDevTools();
          }
        }
      ]
    };
    const subMenuViewProd = {
      label: 'Wallet',
      submenu: [
        {
          label: 'Wallet Seed',
          click: () => {
            mainWindow.webContents.send('seed');
          }
        },
        {
          label: '&Export All Private Keys',
          click: () => {
            mainWindow.webContents.send('exportall');
          }
        },
        {
          label: '&Rescan',
          click: () => {
            mainWindow.webContents.send('rescan');
          }
        },
        {
          label: 'Server info',
          click: () => {
            this.mainWindow.webContents.send('zcashd');
          }
        },
        { type: 'separator' },
        {
          label: 'Encrypt Wallet',
          click: () => {
            this.mainWindow.webContents.send('encrypt');
          }
        },
        {
          label: 'Remove Wallet Encryption',
          click: () => {
            this.mainWindow.webContents.send('decrypt');
          }
        },
        {
          label: 'Unlock',
          click: () => {
            this.mainWindow.webContents.send('unlock');
          }
        }
      ]
    };
    const subMenuWindow = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:'
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' }
      ]
    };
    const subMenuHelp = {
      label: 'Help',
      submenu: [
        {
          label: 'Donate',
          click() {
            mainWindow.webContents.send('donate');
          }
        },
        {
          label: 'Check github.com for updates',
          click() {
            shell.openExternal('https://github.com/adityapk00/zecwallet-lite-electron/releases');
          }
        },
        {
          label: 'File a bug...',
          click() {
            shell.openExternal('https://github.com/adityapk00/zecwallet-lite-electron/issues');
          }
        }
      ]
    };

    const subMenuView = process.env.NODE_ENV === 'development' ? subMenuViewDev : subMenuViewProd;

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const { mainWindow } = this;

    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Pay URI',
            accelerator: 'Ctrl+P',
            click: () => {
              mainWindow.webContents.send('payuri');
            }
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            }
          }
        ]
      },
      {
        label: '&Wallet',
        submenu: [
          {
            label: 'Wallet Seed',
            click: () => {
              mainWindow.webContents.send('seed');
            }
          },
          {
            label: '&Export All Private Keys',
            click: () => {
              mainWindow.webContents.send('exportall');
            }
          },
          {
            label: '&Rescan',
            click: () => {
              mainWindow.webContents.send('rescan');
            }
          },
          {
            label: 'Server info',
            click: () => {
              this.mainWindow.webContents.send('zcashd');
            }
          },
          { type: 'separator' },
          {
            label: 'Encrypt Wallet',
            click: () => {
              this.mainWindow.webContents.send('encrypt');
            }
          },
          {
            label: 'Remove Wallet Encryption',
            click: () => {
              this.mainWindow.webContents.send('decrypt');
            }
          },
          {
            label: 'Unlock',
            click: () => {
              this.mainWindow.webContents.send('unlock');
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Zecwallet Lite',
            click: () => {
              mainWindow.webContents.send('about');
            }
          },
          {
            label: 'Donate',
            click() {
              mainWindow.webContents.send('donate');
            }
          },
          {
            label: 'Check github.com for updates',
            click() {
              shell.openExternal('https://github.com/adityapk00/zecwallet-lite-electron/releases');
            }
          },
          {
            label: 'File a bug...',
            click() {
              shell.openExternal('https://github.com/adityapk00/zecwallet-lite-electron/issues');
            }
          }
        ]
      }
    ];

    return templateDefault;
  }
}
