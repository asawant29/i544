import React  from 'react';
import ReactDom from 'react-dom';

import Ws from './lib/ws.mjs';

import App from './components/app.jsx';

async function root() {
  const ws = await Ws();
  const app = <App ws={ws}/>;
  ReactDom.render(app, document.getElementById('app'));
}

export default root;
