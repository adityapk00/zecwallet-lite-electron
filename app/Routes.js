import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes.json';
import App from './containers/App';
import HomePage from './containers/HomePage';
import SendPage from './containers/SendPage';

export default () => (
  <App>
    <Switch>
      <Route path={routes.SEND} component={SendPage} />
      <Route path={routes.HOME} component={HomePage} />
    </Switch>
  </App>
);
