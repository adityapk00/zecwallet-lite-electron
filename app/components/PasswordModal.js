import React, { PureComponent } from 'react';
import Modal from 'react-modal';
import cstyles from './Common.css';

type Props = {
  modalIsOpen: boolean,
  confirmNeeded: boolean,
  passwordCallback: (password: string) => void,
  closeCallback: () => void
};

type State = {
  password: string,
  confirmPassword: string
};

export default class PasswordModal extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { password: '', confirmPassword: '' };
  }

  enterButton = () => {
    const { passwordCallback } = this.props;
    const { password } = this.state;

    passwordCallback(password);

    // Clear the passwords
    this.setState({ password: '', confirmPassword: '' });
  };

  closeButton = () => {
    const { closeCallback } = this.props;

    closeCallback();

    // Clear the passwords
    this.setState({ password: '', confirmPassword: '' });
  };

  render() {
    const { modalIsOpen, confirmNeeded } = this.props;
    const { password, confirmPassword } = this.state;

    return (
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={this.closeButton}
        className={cstyles.modal}
        overlayClassName={cstyles.modalOverlay}
      >
        <div className={[cstyles.verticalflex].join(' ')}>
          <div className={cstyles.marginbottomlarge} style={{ textAlign: 'center' }}>
            Enter Wallet Password
          </div>

          <div className={cstyles.well} style={{ textAlign: 'center' }}>
            <input
              type="password"
              className={[cstyles.inputbox, cstyles.marginbottomlarge].join(' ')}
              value={password}
              onChange={e => this.setState({ password: e.target.value })}
            />

            {confirmNeeded && (
              <input
                type="password"
                className={[cstyles.inputbox, cstyles.marginbottomlarge].join(' ')}
                value={confirmPassword}
                onChange={e => this.setState({ confirmPassword: e.target.value })}
              />
            )}
          </div>

          <div className={cstyles.buttoncontainer}>
            <button type="button" className={cstyles.primarybutton} onClick={this.enterButton}>
              Enter
            </button>

            <button type="button" className={cstyles.primarybutton} onClick={this.closeButton}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }
}
