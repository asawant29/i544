import Book from './book.mjs';
import Cache from './cache.mjs';

import { getRelHref } from './util.mjs';

/** Exposes WS cart-result as an immutable object with properties:
 *
 *    url:          The URL of the cart.
 *    lineItems:    sku, nUnits enhanced with the Book object specified
 *                  by the sku.
 *    lastModified: time of last modification.
 */

//Implementation provides 2 non-obvious features:
//
//  + If a cart has disappeared from the underlying DB, it will
//    return automatically create a new empty cart (with a different
//    url) before carrying out the requested operation.
//
//  + Books in the cart are cached.
 
export default class Cart {

  /** return cart from web-services ws having specified URL cartUrl.
   *  Create a new cart if cartUrl is falsy.  Use cache to cache
   *  books in cart.
   */
  static async make(ws, cartUrl=null, cache=new Cache()) {
    const enhancedCartResponse = await getCart(ws, cartUrl, cache);
    return new Cart(enhancedCartResponse, cache);
  }

  /** return a new cart which is this cart with 1 unit of the book
   *  corresponding to bookSearchResult added (note that url of
   *  returned cart may be different from that of this cart).
   */
  async buy(ws, bookSearchResult) {
    const book = new Book(bookSearchResult);
    return await this._update(ws, book, 1, true);
  }

  /** return a new cart which is this cart with # of units of book set
   *  to nUnits (note that url of returned cart may be different from
   *  that of this cart).
   */
  async update(ws, book, nUnits) {
    return await this._update(ws, book, nUnits, false);
  }

  //private methods

  //private: use static make() factory method
  constructor(enhancedCartResponse, cache) {
    this.url = getRelHref(enhancedCartResponse.links, 'self');
    this.lineItems = enhancedCartResponse.result;
    this.lastModified = new Date(enhancedCartResponse._lastModified);
    this._cache = cache;
    Object.freeze(this);
  }

  async _update(ws, book, qty, isInc) {
    this._cache.set(book.url, book);
    const cart = await getCart(ws, this.url, this._cache);
    const cartUrl = getRelHref(cart.links, 'self');
    let nUnits = qty;
    if (isInc) {
      const bookItem = cart.result.find(item => item.sku === book.isbn);
      const currentQty = bookItem ? bookItem.nUnits : 0;
      nUnits = currentQty + qty;
    }
    await ws.updateCart(cartUrl, { sku: book.isbn, nUnits});
    return await new Cart(await getCart(ws, cartUrl, this._cache), this._cache);
  }

}

async function getCart(ws, cartUrl, cache) {
  const doRetry = !!cartUrl;
  let cart;
  if (!cartUrl) {
    cartUrl  = await ws.newCart();
  }
  try {
    cart = await ws.get(cartUrl);
  }
  catch (err) {
    if (err.status === 404 && doRetry) { //cart was removed from db
      cart = await this._getCart(ws, null);
    }
    else {
      throw err;
    }
  }
  return await addBooks(ws, cart, cache);
}


async function addBooks(ws, cart, cache) {
  const addBookToItem = async item => {
    const bookUrl = getRelHref(item.links, 'item');
    const book = await getBook(ws, bookUrl, cache);
    return { ...item, book };
  };
  const result = await
  Promise.all(cart.result.map(async item => await addBookToItem(item)));
  return { ...cart, result };
}


async function getBook(ws, bookUrl, cache) {
  let book = cache.get(bookUrl);
  if (!book) {
    book = await Book.make(ws, bookUrl);
    cache.set(bookUrl, book);
  }
  return book;
}

