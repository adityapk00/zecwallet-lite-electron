#[macro_use]
extern crate lazy_static;

use neon::register_module;
use neon_serde::export;

use std::sync::{Mutex, Arc};
use std::cell::RefCell;

use zecwalletlitelib::{commands, lightclient::{LightClient, LightClientConfig}};

// We'll use a MUTEX to store a global lightclient instance,
// so we don't have to keep creating it. We need to store it here, in rust
// because we can't return such a complex structure back to JS
lazy_static! {
    static ref LIGHTCLIENT: Mutex<RefCell<Option<Arc<LightClient>>>> = Mutex::new(RefCell::new(None));
}


export! {
  // Check if there is an existing wallet
  fn litelib_wallet_exists(chain_name: String) -> bool {
      let config = LightClientConfig::create_unconnected(chain_name, None);

      println!("Wallet exists: {}", config.wallet_exists());
      config.wallet_exists()
  }

  /// Create a new wallet and return the seed for the newly created wallet.
  fn litelib_initialize_new(dangerous: bool, server_uri: String) -> String {
      let server = LightClientConfig::get_server_or_default(Some(server_uri));
      let (config, latest_block_height) = match LightClientConfig::create(server, dangerous) {
          Ok((c, h)) => (c, h),
          Err(e) => {
              return format!("Error: {}", e);
          }
      };

      let lightclient = match LightClient::new(&config, latest_block_height) {
          Ok(l) => l,
          Err(e) => {
            return format!("Error: {}", e);
          }
      };

      // Initialize logging
      let _ = lightclient.init_logging();

      let seed = match lightclient.do_seed_phrase() {
          Ok(s) => s.dump(),
          Err(e) => {
            return format!("Error: {}", e);
          }
      };

      LIGHTCLIENT.lock().unwrap().replace(Some(Arc::new(lightclient)));

      // Return the wallet's seed
      return seed;
  }

  /// Restore a wallet from the seed phrase
  fn litelib_initialize_new_from_phrase(dangerous: bool, server_uri: String,
              seed: String, birthday: u64) -> String {
      let server = LightClientConfig::get_server_or_default(Some(server_uri));
      let (config, _latest_block_height) = match LightClientConfig::create(server, dangerous) {
          Ok((c, h)) => (c, h),
          Err(e) => {
            return format!("Error: {}", e);
          }
      };

      let lightclient = match LightClient::new_from_phrase(seed, &config, birthday) {
          Ok(l) => l,
          Err(e) => {
            return format!("Error: {}", e);
          }
      };

      // Initialize logging
      let _ = lightclient.init_logging();

      LIGHTCLIENT.lock().unwrap().replace(Some(Arc::new(lightclient)));

      format!("OK")
  }

  // Initialize a new lightclient and store its value
  fn litelib_initialize_existing(dangerous: bool, server_uri: String) -> String {
      let server = LightClientConfig::get_server_or_default(Some(server_uri));
      let (config, _latest_block_height) = match LightClientConfig::create(server, dangerous) {
          Ok((c, h)) => (c, h),
          Err(e) => {
            return format!("Error: {}", e);
          }
      };

      let lightclient = match LightClient::read_from_disk(&config) {
          Ok(l) => l,
          Err(e) => {
            return format!("Error: {}", e);
          }
      };

      // Initialize logging
      let _ = lightclient.init_logging();

      LIGHTCLIENT.lock().unwrap().replace(Some(Arc::new(lightclient)));

      format!("OK")
  }

  fn litelib_execute(cmd: String, args_list: String) -> String {
      let resp: String;
      {
          let lightclient: Arc<LightClient>;
          {
              let lc = LIGHTCLIENT.lock().unwrap();

              if lc.borrow().is_none() {
                  return format!("Error: Light Client is not initialized");
              }

              lightclient = lc.borrow().as_ref().unwrap().clone();
          };

          let args = if args_list.is_empty() { vec![] } else { vec![args_list.as_ref()] };

          resp = commands::do_user_command(&cmd, &args, lightclient.as_ref()).clone();
      };

      return resp;
  }
}
