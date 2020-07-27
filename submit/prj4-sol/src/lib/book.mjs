import { getRelHref } from './util.mjs';

/** Contains all book fields + url for this book */
export default class Book {

  /** build book from ws response, */
  constructor(bookResult) {
    if (bookResult.result) { //hackery because of bug in prj3 specs
      this.url = getRelHref(bookResult.links, 'self');
      Object.assign(this, bookResult.result);
    }
    else {
      const { links, ...bookFields } = bookResult;
      this.url = getRelHref(links, 'details');
      Object.assign(this, bookFields);
    }
    Object.freeze(this);
  }

  static async make(ws, bookUrl) {
    const bookResult = await ws.get(bookUrl);
    return new Book(bookResult);
  }
  
}
