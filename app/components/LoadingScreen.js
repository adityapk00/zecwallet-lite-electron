/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import { Redirect, withRouter } from 'react-router';
import { ipcRenderer } from 'electron';
import native from '../../native/index.node';
import routes from '../constants/routes.json';
import { RPCConfig, Info } from './AppState';
import RPC from '../rpc';
import cstyles from './Common.css';
import styles from './LoadingScreen.css';
import Logo from '../assets/img/logobig.gif';

type Props = {
  setRPCConfig: (rpcConfig: RPCConfig) => void,
  setInfo: (info: Info) => void
};

class LoadingScreenState {
  currentStatus: string;

  loadingDone: boolean;

  rpcConfig: RPCConfig | null;

  url: string;

  getinfoRetryCount: number;

  constructor() {
    this.currentStatus = 'Loading...';
    this.loadingDone = false;
    this.rpcConfig = null;
    this.url = '';
    this.getinfoRetryCount = 0;
  }
}

class LoadingScreen extends Component<Props, LoadingScreenState> {
  constructor(props: Props) {
    super(props);

    const state = new LoadingScreenState();
    state.url = 'https://lightwalletd.zecwallet.co:1443';
    this.state = state;
  }

  componentDidMount() {
    (async () => {
      // Try to load the light client
      const { url } = this.state;

      const result = native.litelib_initialize_existing(false, url);
      console.log(`Intialization: ${result}`);

      this.setupExitHandler();
      this.setupNextGetInfo();
    })();
  }

  setupExitHandler = () => {
    // App is quitting, make sure to save the wallet properly.
    ipcRenderer.on('appquitting', () => {
      RPC.doSave();

      // And reply that we're all done.
      ipcRenderer.send('appquitdone');
    });
  };

  setupNextGetInfo() {
    setTimeout(() => this.getInfo(), 1000);
  }

  async getInfo() {
    const { url } = this.state;

    // Try getting the info.
    try {
      const { setRPCConfig, setInfo } = this.props;

      const info = RPC.getInfoObject();
      console.log(info);
      setInfo(info);

      const rpcConfig = new RPCConfig();
      rpcConfig.url = url;
      setRPCConfig(rpcConfig);

      // Do a sync at start
      this.setState({ currentStatus: 'Syncing...' });
      (async () => {
        RPC.doSync();

        RPC.doSave();

        // This will cause a redirect to the dashboard
        this.setState({ loadingDone: true });
      })();
    } catch (err) {
      // Not yet finished loading. So update the state, and setup the next refresh
      this.setState({ currentStatus: err });
    }
  }

  render() {
    const { loadingDone, currentStatus } = this.state;

    // If still loading, show the status
    if (!loadingDone) {
      return (
        <div className={[cstyles.verticalflex, cstyles.center, styles.loadingcontainer].join(' ')}>
          <div style={{ marginTop: '100px' }}>
            <img src={Logo} width="200px;" alt="Logo" />
          </div>
          <div>{currentStatus}</div>
        </div>
      );
    }

    return <Redirect to={routes.DASHBOARD} />;
  }
}

export default withRouter(LoadingScreen);
