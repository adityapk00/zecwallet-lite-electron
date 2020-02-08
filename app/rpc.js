import axios from 'axios';
import { TotalBalance, AddressBalance, Transaction, RPCConfig, TxDetail, Info } from './components/AppState';
import native from '../native/index.node';

export default class RPC {
  rpcConfig: RPCConfig;

  fnSetInfo: Info => void;

  fnSetTotalBalance: TotalBalance => void;

  fnSetAddressesWithBalance: (AddressBalance[]) => void;

  fnSetTransactionsList: (Transaction[]) => void;

  fnSetAllAddresses: (string[]) => void;

  fnSetSinglePrivateKey: (string, string) => void;

  // This function is not set via a constructor, but via the sendTransaction method
  fnOpenSendErrorModal: (string, string) => void;

  fnSetZecPrice: number => void;

  opids: Set<string>;

  refreshTimerID: TimerID;

  opTimerID: TimerID;

  priceTimerID: TimerID;

  constructor(
    fnSetTotalBalance: TotalBalance => void,
    fnSetAddressesWithBalance: (AddressBalance[]) => void,
    fnSetTransactionsList: (Transaction[]) => void,
    fnSetAllAddresses: (string[]) => void,
    fnSetSinglePrivateKey: (string, string) => void,
    fnSetInfo: Info => void,
    fnSetZecPrice: number => void
  ) {
    this.fnSetTotalBalance = fnSetTotalBalance;
    this.fnSetAddressesWithBalance = fnSetAddressesWithBalance;
    this.fnSetTransactionsList = fnSetTransactionsList;
    this.fnSetAllAddresses = fnSetAllAddresses;
    this.fnSetSinglePrivateKey = fnSetSinglePrivateKey;
    this.fnSetInfo = fnSetInfo;
    this.fnSetZecPrice = fnSetZecPrice;

    this.opids = new Set();
  }

  async configure(rpcConfig: RPCConfig) {
    this.rpcConfig = rpcConfig;

    if (!this.refreshTimerID) {
      this.refreshTimerID = setTimeout(() => this.refresh(), 1000);
    }

    if (!this.opTimerID) {
      this.opTimerID = setTimeout(() => this.refreshOpStatus(), 1000);
    }

    if (!this.priceTimerID) {
      this.priceTimerID = setTimeout(() => this.getZecPrice(), 1000);
    }
  }

  setupNextFetch(lastBlockHeight: number) {
    this.refreshTimerID = setTimeout(() => this.refresh(lastBlockHeight), 20000);
  }

  static doSync() {
    const syncstr = native.litelib_execute('sync', '');
    console.log(`Sync status: ${syncstr}`);
  }

  static doSave() {
    const savestr = native.litelib_execute('save', '');
    console.log(`Sync status: ${savestr}`);
  }

  async refresh(lastBlockHeight: number) {
    const latestBlockHeight = await this.fetchInfo();

    if (!lastBlockHeight || lastBlockHeight < latestBlockHeight) {
      const balP = this.fetchTotalBalance();
      const txns = this.fetchTandZTransactions(latestBlockHeight);

      await balP;
      await txns;

      // All done, set up next fetch
      console.log(`Finished full refresh at ${latestBlockHeight}`);
    } else {
      // Still at the latest block
      console.log('Already have latest block, waiting for next refresh');
    }

    this.setupNextFetch(latestBlockHeight);
  }

  // Special method to get the Info object. This is used both internally and by the Loading screen
  static getInfoObject() {
    const infostr = native.litelib_execute('info', '');
    const infoJSON = JSON.parse(infostr);

    const info = new Info();
    info.testnet = infoJSON.chain_name === 'testnet';
    info.latestBlock = infoJSON.latest_block_height;
    info.connections = 1;
    info.version = infoJSON.version;
    info.verificationProgress = 1;
    info.currencyName = info.testnet ? 'TAZ' : 'ZEC';
    info.solps = 0;

    return info;
  }

  async fetchInfo(): number {
    const info = RPC.getInfoObject(this.rpcConfig);

    this.fnSetInfo(info);

    return info.latestBlock;
  }

  // This method will get the total balances
  async fetchTotalBalance() {
    const balanceStr = native.litelib_execute('balance', '');
    const balanceJSON = JSON.parse(balanceStr);

    // Total Balance
    const balance = new TotalBalance();
    balance.private = balanceJSON.tbalance / 10 ** 8;
    balance.transparent = balanceJSON.zbalance / 10 ** 8;
    balance.total = balance.private + balance.transparent;

    this.fnSetTotalBalance(balance);

    // Addresses with Balance. The lite client reports balances in zatoshi, so divide by 10^8;
    const zaddresses = balanceJSON.z_addresses
      .map(o => {
        return new AddressBalance(o.address, o.zbalance / 10 ** 8);
      })
      .filter(ab => ab.balance > 0);

    const taddresses = balanceJSON.t_addresses
      .map(o => {
        return new AddressBalance(o.address, o.balance / 10 ** 8);
      })
      .filter(ab => ab.balance > 0);

    const addresses = zaddresses.concat(taddresses);

    this.fnSetAddressesWithBalance(addresses);

    // Also set all addresses
    const allZAddresses = balanceJSON.z_addresses.map(o => o.address);
    const allTAddresses = balanceJSON.t_addresses.map(o => o.address);
    const allAddresses = allZAddresses.concat(allTAddresses);

    this.fnSetAllAddresses(allAddresses);
  }

  static createNewAddress(zaddress: boolean) {
    const addrStr = native.litelib_execute('new', zaddress ? 'z' : 't');
    const addrJSON = JSON.parse(addrStr);

    return addrJSON[0];
  }

  // Fetch a private key for either a t or a z address
  async fetchPrivateKey(address: string) {
    const privKeyStr = native.litelib_execute('export', address);
    const privKeyJSON = JSON.parse(privKeyStr);

    this.fnSetSinglePrivateKey(address, privKeyJSON[0].private_key);
  }

  static fetchSeed(): string {
    const seedStr = native.litelib_execute('seed', '');
    const seedJSON = JSON.parse(seedStr);

    return seedJSON.seed;
  }

  // Fetch all T and Z transactions
  async fetchTandZTransactions(latestBlockHeight: number) {
    const listStr = native.litelib_execute('list', '');
    const listJSON = JSON.parse(listStr);

    const txlist = listJSON.map(tx => {
      const transaction = new Transaction();

      const type = tx.outgoing_metadata ? 'Sent' : 'Receive';

      transaction.address = type === 'Sent' ? tx.outgoing_metadata[0].address : tx.address;
      transaction.type = type;
      transaction.amount = tx.amount / 10 ** 8;
      transaction.confirmations = latestBlockHeight - tx.block_height;
      transaction.txid = tx.txid;
      transaction.time = tx.datetime;
      if (tx.outgoing_metadata) {
        transaction.detailedTxns = tx.outgoing_metadata.map(o => {
          const detail = new TxDetail();
          detail.address = o.address;
          detail.amount = o.value / 10 ** 8;
          detail.memo = o.memo;

          return detail;
        });
      } else {
        transaction.detailedTxns = [new TxDetail()];
        transaction.detailedTxns[0].address = tx.address;
        transaction.detailedTxns[0].amount = tx.amount / 10 ** 8;
        transaction.detailedTxns[0].memo = tx.memo;
      }

      return transaction;
    });

    this.fnSetTransactionsList(txlist);
  }

  // Send a transaction using the already constructed sendJson structure
  async sendTransaction(sendJson: [], fnOpenSendErrorModal: (string, string) => void): boolean {
    this.fnOpenSendErrorModal = fnOpenSendErrorModal;

    try {
      const opid = (await RPC.doRPC('z_sendmany', sendJson, this.rpcConfig)).result;

      this.addOpidToMonitor(opid);

      return true;
    } catch (err) {
      // TODO Show a modal with the error
      console.log(`Error sending Tx: ${err}`);
      throw err;
    }
  }

  // Start monitoring the given opid
  async addOpidToMonitor(opid: string) {
    this.opids.add(opid);
    this.refreshOpStatus();
  }

  setupNextOpidSatusFetch() {
    if (this.opids.size > 0) {
      this.opTimerID = setTimeout(() => this.refreshOpStatus(), 2000); // 2 sec
    } else {
      this.opTimerID = null;
    }
  }

  async refreshOpStatus() {
    if (this.opids.size > 0) {
      // Get all the operation statuses.
      [...this.opids].map(async id => {
        try {
          const resultJson = await RPC.doRPC('z_getoperationstatus', [[id]], this.rpcConfig);

          const result = resultJson.result[0];

          if (result.status === 'success') {
            this.opids.delete(id);
            const { txid } = result.result;

            this.fnOpenSendErrorModal(
              'Successfully Broadcast Transaction',
              `Transaction was successfully broadcast. TXID: ${txid}`
            );
          } else if (result.status === 'failed') {
            this.opids.delete(id);

            this.fnOpenSendErrorModal('Error Sending Transaction', `Opid ${id} Failed. ${result.error.message}`);
          }
        } catch (err) {
          // If we can't get a response for this OPID, then just forget it and move on
          this.opids.delete(id);
        }
      });
    }

    this.setupNextOpidSatusFetch();
  }

  setupNextZecPriceRefresh(retryCount: number, timeout: number) {
    // Every hour
    this.priceTimerID = setTimeout(() => this.getZecPrice(retryCount), timeout);
  }

  async getZecPrice(retryCount: number) {
    if (!retryCount) {
      // eslint-disable-next-line no-param-reassign
      retryCount = 0;
    }

    try {
      const response = await new Promise((resolve, reject) => {
        axios('https://api.coinmarketcap.com/v1/ticker/', {
          method: 'GET'
        })
          .then(r => resolve(r.data))
          .catch(err => {
            reject(err);
          });
      });

      const zecData = response.find(i => i.symbol.toUpperCase() === 'ZEC');
      if (zecData) {
        this.fnSetZecPrice(zecData.price_usd);
        this.setupNextZecPriceRefresh(0, 1000 * 60 * 60); // Every hour
      } else {
        this.fnSetZecPrice(null);
        let timeout = 1000 * 60; // 1 minute
        if (retryCount > 5) {
          timeout = 1000 * 60 * 60; // an hour later
        }
        this.setupNextZecPriceRefresh(retryCount + 1, timeout);
      }
    } catch (err) {
      console.log(err);
      this.fnSetZecPrice(null);
      let timeout = 1000 * 60; // 1 minute
      if (retryCount > 5) {
        timeout = 1000 * 60 * 60; // an hour later
      }
      this.setupNextZecPriceRefresh(retryCount + 1, timeout);
    }
  }
}
