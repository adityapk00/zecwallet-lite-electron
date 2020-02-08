/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable max-classes-per-file */
/* eslint-disable react/prop-types */
/* eslint-disable react/no-unused-state */
import React from 'react';
import ReactModal from 'react-modal';
import { Switch, Route } from 'react-router';
import native from '../native/index.node';
import { ErrorModal, ErrorModalData } from './components/ErrorModal';
import cstyles from './components/Common.css';
import routes from './constants/routes.json';
import App from './containers/App';
import Dashboard from './components/Dashboard';
import Send from './components/Send';
import Receive from './components/Receive';
import LoadingScreen from './components/LoadingScreen';
import AppState, {
  AddressBalance,
  TotalBalance,
  Transaction,
  SendPageState,
  ToAddr,
  RPCConfig,
  Info,
  ReceivePageState,
  AddressBookEntry
} from './components/AppState';
import RPC from './rpc';
import Utils from './utils/utils';
import Zcashd from './components/Zcashd';
import AddressBook from './components/Addressbook';
import AddressbookImpl from './utils/AddressbookImpl';
import Sidebar from './components/Sidebar';
import Transactions from './components/Transactions';

type Props = {};

export default class RouteApp extends React.Component<Props, AppState> {
  rpc: RPC;

  constructor(props) {
    super(props);

    this.state = {
      totalBalance: new TotalBalance(),
      addressesWithBalance: [],
      addressPrivateKeys: {},
      addresses: [],
      addressBook: [],
      transactions: null,
      sendPageState: new SendPageState(),
      receivePageState: new ReceivePageState(),
      rpcConfig: new RPCConfig(),
      info: new Info(),
      location: null,
      errorModalData: new ErrorModalData()
    };

    // Create the initial ToAddr box
    // eslint-disable-next-line react/destructuring-assignment
    this.state.sendPageState.toaddrs = [new ToAddr(Utils.getNextToAddrID())];

    // Set the Modal's app element
    ReactModal.setAppElement('#root');

    console.log(native.litelib_wallet_exists('main'));
  }

  componentDidMount() {
    if (!this.rpc) {
      this.rpc = new RPC(
        this.setTotalBalance,
        this.setAddressesWithBalances,
        this.setTransactionList,
        this.setAllAddresses,
        this.setSinglePrivateKey,
        this.setInfo,
        this.setZecPrice
      );
    }

    // Read the address book
    (async () => {
      const addressBook = await AddressbookImpl.readAddressBook();
      if (addressBook) {
        this.setState({ addressBook });
      }
    })();
  }

  componentWillUnmount() {}

  openErrorModal = (title: string, body: string) => {
    const errorModalData = new ErrorModalData();
    errorModalData.modalIsOpen = true;
    errorModalData.title = title;
    errorModalData.body = body;

    this.setState({ errorModalData });
  };

  closeErrorModal = () => {
    const errorModalData = new ErrorModalData();
    errorModalData.modalIsOpen = false;

    this.setState({ errorModalData });
  };

  setInfo = (info: Info) => {
    this.setState({ info });
  };

  setTotalBalance = (totalBalance: TotalBalance) => {
    this.setState({ totalBalance });
  };

  setAddressesWithBalances = (addressesWithBalance: AddressBalance[]) => {
    this.setState({ addressesWithBalance });

    const { sendPageState } = this.state;

    // If there is no 'from' address, we'll set a default one
    if (!sendPageState.fromaddr) {
      // Find a z-address with the highest balance
      const defaultAB = addressesWithBalance
        .filter(ab => Utils.isSapling(ab.address))
        .reduce((prev, ab) => {
          // We'll start with a sapling address
          if (prev == null) {
            return ab;
          }
          // Find the sapling address with the highest balance
          if (prev.balance < ab.balance) {
            return ab;
          }

          return prev;
        }, null);

      if (defaultAB) {
        const newSendPageState = new SendPageState();
        newSendPageState.fromaddr = defaultAB.address;
        newSendPageState.toaddrs = sendPageState.toaddrs;

        this.setState({ sendPageState: newSendPageState });
      }
    }
  };

  setTransactionList = (transactions: Transaction[]) => {
    this.setState({ transactions });
  };

  setAllAddresses = (addresses: string[]) => {
    this.setState({ addresses });
  };

  setSendPageState = (sendPageState: SendPageState) => {
    this.setState({ sendPageState });
  };

  setSendTo = (address: string, amount: number | null, memo: string | null) => {
    // Clear the existing send page state and set up the new one
    const { sendPageState } = this.state;

    const newSendPageState = new SendPageState();
    newSendPageState.fromaddr = sendPageState.fromaddr;

    const to = new ToAddr(Utils.getNextToAddrID());
    if (address) {
      to.to = address;
    }
    if (amount) {
      to.amount = amount;
    }
    if (memo) {
      to.memo = memo;
    }
    newSendPageState.toaddrs = [to];

    this.setState({ sendPageState: newSendPageState });
  };

  setRPCConfig = (rpcConfig: RPCConfig) => {
    this.setState({ rpcConfig });
    console.log(rpcConfig);
    this.rpc.configure(rpcConfig);
  };

  setZecPrice = (price: number | null) => {
    console.log(`Price = ${price}`);
    const { info } = this.state;

    const newInfo = new Info();
    Object.assign(newInfo, info);
    newInfo.zecPrice = price;

    this.setState({ info: newInfo });
  };

  setInfo = (newInfo: Info) => {
    // If the price is not set in this object, copy it over from the current object
    const { info } = this.state;
    if (!newInfo.zecPrice) {
      // eslint-disable-next-line no-param-reassign
      newInfo.zecPrice = info.zecPrice;
    }

    this.setState({ info: newInfo });
  };

  setSinglePrivateKey = (address: string, key: string) => {
    const addressPrivateKeys = {};
    addressPrivateKeys[address] = key;
    this.setState({ addressPrivateKeys });
    console.log(`Added private key for ${address}`);
  };

  sendTransaction = async (sendJson: [], fnOpenSendErrorModal: (string, string) => void) => {
    const success = await this.rpc.sendTransaction(sendJson, fnOpenSendErrorModal);
    return success;
  };

  // Getter methods, which are called by the components to update the state
  getSinglePrivateKey = (address: string) => {
    this.rpc.fetchPrivateKey(address);
  };

  addAddressBookEntry = (label: string, address: string) => {
    // Add an entry into the address book
    const { addressBook } = this.state;
    const newAddressBook = addressBook.concat(new AddressBookEntry(label, address));

    // Write to disk. This method is async
    AddressbookImpl.writeAddressBook(newAddressBook);

    this.setState({ addressBook: newAddressBook });
  };

  removeAddressBookEntry = (label: string) => {
    const { addressBook } = this.state;
    const newAddressBook = addressBook.filter(i => i.label !== label);

    // Write to disk. This method is async
    AddressbookImpl.writeAddressBook(newAddressBook);

    this.setState({ addressBook: newAddressBook });
  };

  createNewAddress = async (zaddress: boolean) => {
    // Create a new address
    const newaddress = RPC.createNewAddress(zaddress);
    console.log(`Created new Address ${newaddress}`);

    // And then fetch the list of addresses again to refresh (totalBalance gets all addresses)
    this.rpc.fetchTotalBalance();

    const { receivePageState } = this.state;
    const newRerenderKey = receivePageState.rerenderKey + 1;

    const newReceivePageState = new ReceivePageState();
    newReceivePageState.newAddress = newaddress;
    newReceivePageState.rerenderKey = newRerenderKey;

    this.setState({ receivePageState: newReceivePageState });
  };

  render() {
    const {
      totalBalance,
      transactions,
      addressesWithBalance,
      addressPrivateKeys,
      addresses,
      addressBook,
      sendPageState,
      receivePageState,
      info,
      errorModalData
    } = this.state;

    const standardProps = {
      openErrorModal: this.openErrorModal,
      closeErrorModal: this.closeErrorModal,
      setSendTo: this.setSendTo,
      info
    };

    return (
      <App>
        <ErrorModal
          title={errorModalData.title}
          body={errorModalData.body}
          modalIsOpen={errorModalData.modalIsOpen}
          closeModal={this.closeErrorModal}
        />

        <div style={{ overflow: 'hidden' }}>
          {info && info.version && (
            <div className={cstyles.sidebarcontainer}>
              <Sidebar info={info} setSendTo={this.setSendTo} {...standardProps} />
            </div>
          )}
          <div className={cstyles.contentcontainer}>
            <Switch>
              <Route
                path={routes.SEND}
                render={() => (
                  <Send
                    addressesWithBalance={addressesWithBalance}
                    sendTransaction={this.sendTransaction}
                    sendPageState={sendPageState}
                    setSendPageState={this.setSendPageState}
                    addressBook={addressBook}
                    {...standardProps}
                  />
                )}
              />
              <Route
                path={routes.RECEIVE}
                render={() => (
                  <Receive
                    rerenderKey={receivePageState.rerenderKey}
                    addresses={addresses}
                    addressesWithBalance={addressesWithBalance}
                    addressPrivateKeys={addressPrivateKeys}
                    receivePageState={receivePageState}
                    addressBook={addressBook}
                    {...standardProps}
                    getSinglePrivateKey={this.getSinglePrivateKey}
                    createNewAddress={this.createNewAddress}
                  />
                )}
              />
              <Route
                path={routes.ADDRESSBOOK}
                render={() => (
                  <AddressBook
                    addressBook={addressBook}
                    addAddressBookEntry={this.addAddressBookEntry}
                    removeAddressBookEntry={this.removeAddressBookEntry}
                    {...standardProps}
                  />
                )}
              />
              <Route
                path={routes.DASHBOARD}
                // eslint-disable-next-line react/jsx-props-no-spreading
                render={() => (
                  <Dashboard totalBalance={totalBalance} info={info} addressesWithBalance={addressesWithBalance} />
                )}
              />
              <Route
                path={routes.TRANSACTIONS}
                render={() => <Transactions transactions={transactions} info={info} addressBook={addressBook} />}
              />
              <Route path={routes.ZCASHD} render={() => <Zcashd info={info} />} />
              <Route
                path={routes.LOADING}
                render={() => <LoadingScreen setRPCConfig={this.setRPCConfig} setInfo={this.setInfo} />}
              />
            </Switch>
          </div>
        </div>
      </App>
    );
  }
}
