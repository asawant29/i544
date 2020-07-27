//-*- mode: rjsx-mode;

import React from 'react';
import ReactDom from 'react-dom';

import Books from './books.jsx';
import Cart from './cart.jsx';
import Tab from './tab.jsx';

import CartModel from '../lib/cart.mjs';

/*************************** App Component ***************************/

const STORE = window.localStorage;
const CART = 'cart';  //key used for tracking cart url in STORE

export default class App extends React.Component {

  constructor(props) {
    super(props);

    this.select = this.select.bind(this);
    this.ws = props.ws;

    this.state = {
      selected: 'books',
      cart: { lineItems: [] },
    };
  }

  async componentDidMount() {
    let cartUrl = STORE.getItem(CART);
    if (cartUrl === 'undefined' || cartUrl === 'null') cartUrl = null;
    const cart = await CartModel.make(this.ws, cartUrl);
    STORE.setItem(CART, cart.url);
    this.setState({cart});
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }


  /** add one unit of the book specified by bookSearchResult (an
   *  individual item in the ws.findBooks() result list) to cart
   */
  async buy(bookSearchResult) {
    let cart = this.state.cart;
    cart = await cart.buy(this.ws, bookSearchResult);
    STORE.setItem(CART, cart.url); //in case cart url changed
    this.setState({cart});
    this.select('cart');
  }

  /** Set number of units of book to nUnits in cart (note that book
   *  must be an instance of the class defined in ../lib/book.mjs;
   *  this is true for the book items contained in the enhanced
   *  shopping cart).
   */
  async update(book, nUnits) {
    let cart = this.state.cart;
    cart = await cart.update(this.ws, book, nUnits);
    STORE.setItem(CART, cart.url); //in case cart url changed
    this.setState({cart});
    this.select('cart');
  }

  select(v) {
    this.setState({selected: v});
  }

  render() {
    const components = {
      books: <Books app={this}/>,
      cart:  <Cart app={this} items={this.state.cart.lineItems}/>
    };
    const tabs = Object.entries(components).map(([k, component], i) => {
      const isSelected = (this.state.selected === k);
      const label = k[0].toUpperCase() + k.substr(1);
      const tab = (
        <Tab component={component} key={k} id={k}
             label={label} index={i}
             select={this.select} isSelected={isSelected}/>
      );
      return tab;
    });

    return <div className="tabs">{tabs}</div>;
  }

}
