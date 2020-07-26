import assert from 'assert';
//import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import querystring from 'querystring';

import ModelError from './model-error.mjs';

//not all codes necessary
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

const BASE = "api";
const CART = "carts";
const BOOK = "books";

export default function serve(port, meta, model) {
  const app = express();
  app.locals.port = port;
  app.locals.meta = meta;
  app.locals.model = model;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

function setupRoutes(app) {
  //app.use(cors());

  //pseudo-handlers used to set up defaults for req
  app.use(bodyParser.json());      //always parse request bodies as JSON
  app.use(reqSelfUrl, reqBaseUrl); //set useful properties in req

  //application routes
  app.get(`/${BASE}`, doBase(app));
  //@TODO: add other application routes
  app.post(`/${BASE}/${CART}`, doNewCart(app));
  app.patch(`/${BASE}/${CART}/:id`, doUpdateCart(app));
  app.get(`/${BASE}/${BOOK}`, doFindBooks(app));
  app.get(`/${BASE}/${BOOK}/:id`, doFetchBook(app));
  app.get(`/${BASE}/${CART}/:id`, doGetCart(app));

  //must be last
  app.use(do404(app));
  app.use(doErrors(app));
}

/****************************** Handlers *******************************/

/** Sets selfUrl property on req to complete URL of req,
 *  including query parameters.
 */
function reqSelfUrl(req, res, next) {
  const port = req.app.locals.port;
  req.selfUrl = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
  next();  //absolutely essential
}

/** Sets baseUrl property on req to complete URL of BASE. */
function reqBaseUrl(req, res, next) {
  const port = req.app.locals.port;
  req.baseUrl = `${req.protocol}://${req.hostname}:${port}/${BASE}`;
  next(); //absolutely essential
}

function doBase(app) {
  return function (req, res) {
    try {
      const links = [
        { rel: "self", name: "self", href: req.selfUrl },
        //@TODO add links for book and cart collections,
        { rel: "collection", name: "books", href: `${req.selfUrl}/${BOOK}` },
        { rel: "collection", name: "carts", href: `${req.selfUrl}/${CART}` },
      ];
      res.json({ links });
    } catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

//@TODO: Add handlers for other application routes
function doNewCart(app) {
  return async function (req, res) {
    try {
      const cartId = await app.locals.model.newCart({});
      res.append("Location", `${req.selfUrl}/${cartId}`);
      res.status(CREATED).send("CREATED");
      res.end();
    } catch (error) {
      const mapped = mapError(error);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doUpdateCart(app) {
  return async function (req, res) {
    try {
      const patch = Object.assign({}, req.body);

      patch.cartId = Number(req.params.id);
      console.log(patch);
      const result = await app.locals.model.cartItem(patch);
      console.log(result);
      if (result == 0) {
        res.json({
          status: NOT_FOUND,
          error: [
            {
              code: NOT_FOUND,
              message:
                "sku does not correspond to the ISBN of the book in the catalog",
            },
          ],
        });
      } else {
        res.status(NO_CONTENT).send("No Content");
        res.end();
      }
    } catch (error) {
      const mapped = mapError(error);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doGetCart(app) {
  return async function (req, res) {
    try {
      const _id = req.params.id;

      const result = await app.locals.model.getCart({ cartId: _id });
      const response = {};
      response._lastModified = result._lastModified;
      const links = [{ href: req.selfUrl, name: "self", rel: "self" }];
      response.links = links;
      const bookList = [];
      for(const key in result) {
        if(key === '_lastModified') {
          continue;
        }
        // const result = await app.locals.model.findBooks({ isbn: key });
        bookList.push({
          links: [
            { 
              rel: 'item',
              name: 'book',
              href:  `${req.baseUrl}/${BOOK}/${key}`
          }
          ],
          sku: key,
          nUnits: result[key]
        })
      }
      response.result = bookList;

      console.log(result);
      res.send(response);
    } catch (error) {}
  };
}

function doFindBooks(app) {
  return async function (req, res) {
    try {
      // const results = await app.locals.model.findBooks(query);

      if (Object.keys(req.query).length === 0) {
        res.status(BAD_REQUEST);
        res.json({
          status: 400,

          errors: [
            {
              code: "FORM_ERROR",
              message: "At least one search field must be specified",
              name: "",
            },
          ],
        });
      }
      const query = Object.assign({}, req.query);
      const requestedCount = req.query._count || app.locals.model.DEFAULT_COUNT;
      query._count = +requestedCount + 1;

      query._index = req.query._index ? req.query._index : 0;

      const result = await app.locals.model.findBooks(query);
      const links = [
        {
          href: req.selfUrl,
          name: "self",
          rel: "self",
        },
      ];
      const response = {};
      response.result = [];
      result.forEach((book) => {
        const bookLink = [
          {
            rel: "details",
            name: "book",
            href: `${req.protocol}://${req.hostname}:${req.app.locals.port}/${BASE}/${BOOK}/${book.isbn}`,
          },
        ];
        book.links = bookLink;
        response.result.push(book);
      });

      if (query._index > 0) {
        const prevHref = [];
        prevHref.push(`${req.baseUrl}/${BOOK}?`);
        const q = Object.assign({}, req.query);
        q._index = +q._index - 5;

        for (const key in q) {
          prevHref.push(`${key}=${q[key]}`);
        }

        const prevLink = {
          rel: "prev",
          name: "prev",
          href: prevHref.join("&"),
        };
        links.push(prevLink);
      }

      if (result.length > requestedCount) {
        response.result = response.result.slice(
          +query._index,
          +query._index + 5
        );

        const nextHref = [];
        nextHref.push(`${req.baseUrl}/${BOOK}?`);
        const q = Object.assign({}, req.query);
        q._index = query._index + 5;

        for (const key in q) {
          nextHref.push(`${key}=${q[key]}`);
        }

        const nextLink = {
          rel: "next",
          name: "next",
          href: nextHref.join("&"),
        };
        links.push(nextLink);
      }
      response.links = links;
      res.json(response);
      // console.log(query);
    } catch (error) {
      console.log("Error", error);
      mapError(error);
      res.status(mapped.status).json(mapped);
    }
  };
}

function doFetchBook(app) {
  return async function (req, res) {
    try {
      const isbn = req.params.id;
      console.log(isbn);
      const result = await app.locals.model.findBooks({ isbn: isbn });

      if (result.length == 0) {
        res.json({
          errors: [
            {
              code: "BAD_ID",
              message: `no book for isbn ${isbn}`,
              name: "isbn",
            },
          ],
          status: NOT_FOUND,
        });
      } else {
        const response = {
          links: [{ rel: "self", name: "self", href: req.selfUrl }],
          results: result,
        };

        res.json(response);
      }
    } catch (err) {
      console.log(err);
      res.type('text').status(400).json({
        errors: [
          err[0]
        ],
        status: 400
      })
    }
  };
}

/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
  return async function(req, res) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    const result = {
      status: NOT_FOUND,
      errors: [	{ code: 'NOT_FOUND', message, }, ],
    };
    res.type('text').
	status(404).
	json(result);
  };
}


/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    const result = {
      status: SERVER_ERROR,
      errors: [ { code: 'SERVER_ERROR', message: err.message } ],
    };
    res.status(SERVER_ERROR).json(result);
    console.error(err);
  };
}

/*************************** Mapping Errors ****************************/

const ERROR_MAP = {
  BAD_ID: NOT_FOUND,
};

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code and an errors property containing list of error objects
 *  with code, message and name properties.
 */
function mapError(err) {
  const isDomainError =
    err instanceof Array && err.length > 0 && err[0] instanceof ModelError;
  const status = isDomainError
    ? ERROR_MAP[err[0].code] || BAD_REQUEST
    : SERVER_ERROR;
  const errors = isDomainError
    ? err.map((e) => ({ code: e.code, message: e.message, name: e.name }))
    : [{ code: "SERVER_ERROR", message: err.toString() }];
  if (!isDomainError) console.error(err);
  return { status, errors };
}

/****************************** Utilities ******************************/
