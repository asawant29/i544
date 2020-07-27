//-*- mode: rjsx-mode;

import React from 'react';
import ReactDom from 'react-dom';

import { Book } from './books.jsx';

export default class Cart extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    //@TODO render cart by mapping LineItem over each item in props.items.
    return '';
  }
}

class LineItem extends React.Component {

  constructor(props) {
    super(props);
    //@TODO
  }

  //@TODO other methods

}
