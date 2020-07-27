import axios from 'axios';

/** interface to web services */
class Ws {
  
  constructor(urls) {
    Object.assign(this, urls);
  }

  static async make() {
    const baseUrl = getWsUrl();
    const apiUrl = `${baseUrl}/api`;
    const response = await Ws._get(apiUrl);
    const links =  response.links.filter(link => link.rel !== 'self');
    const urls = Object.fromEntries(links.map(link => [link.name, link.href]));
    return new Ws(urls);
  }

  /** Return ws response for book specified by isbn */
  async getBook(isbn) {
    const bookUrl = `${this.books}/isbn`;
    return await Ws._get(bookUrl);
  }

  /** Return ws response for authorsTitleSearch for books */
  async findBooks(authorsTitleSearch) {
    return await Ws._get(this.books, {authorsTitleSearch});
  }

  /** Create a new cart and return its URL */
  async newCart() {
    return await Ws._create(this.carts);
  }

  /** Return ws response for cartUrl */
  async getCart(cartUrl) {
    return await Ws._get(cartUrl);
  }

  /** Return ws response for updating cart by updateParams object */
  async updateCart(cartUrl, updateParams) {
    return await Ws._update(cartUrl, updateParams);
  }

  /** Return result of accessing url */
  async get(url) { return await Ws._get(url);  }

  static async _get(url, q={}) {
    try {
      const response = await axios.get(url, { params: q });
      return response.data;
    }
    catch (err) {
      console.error(err);
      throw (err.response && err.response.data) ? err.response.data : err;
    }
  }


  static async _create(url, params={}) {
    try {
      const response = await axios.post(url, params);
      return response.headers.location;
    }
    catch (err) {
      console.error(err);
      throw (err.response && err.response.data) ? err.response.data : err;
    }
  }

  static async _update(url, params) {
    try {
      const response = await axios.patch(url, params);
      return response.data;
    }
    catch (err) {
      console.error(err);
      throw (err.response && err.response.data) ? err.response.data : err;
    }  
  }

}


const DEFAULT_WS_URL = 'http://zdu.binghamton.edu:2345';

function getWsUrl() {
  const params = (new URL(document.location)).searchParams;
  return params.get('ws-url') || DEFAULT_WS_URL;
}

export default Ws.make;

