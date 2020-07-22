#!/usr/bin/env nodejs

import assert from 'assert';
import child_process from 'child_process';
import fs from 'fs';
import Path from 'path';
import process from 'process';
import util from 'util';

const { promisify } = util;
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const exec = util.promisify(child_process.exec);

import serve from './ws-server.mjs';
import Model from './model.mjs';
import meta from './meta.mjs';

/*************************** Loading Data *******************************/

async function loadData(model, dataFiles) {
  for (const path of dataFiles) {
    const books = await readJson(path);
    for (const book of books) { await model.addBook(book); }
  }
}


async function readJson(jsonPath) {
  try {
    let text;
    if (jsonPath.endsWith('.gz')) {
      const {stdout, stderr} = await exec(`zcat ${jsonPath}`);
      if (stderr) throw stderr;
      text = stdout.trim();
    }
    else {
      text = await readFile(jsonPath, 'utf8');
    }
    return JSON.parse(text);
  }
  catch (err) {
    throw [ `cannot read ${jsonPath}: ${err}` ];
  }
}

/**************************** Top-Level Code ***************************/

const USAGE = `usage: ${Path.basename(process.argv[1])} PORT MONGO_DB_URL ` +
  '[DATA_FILE...]';

function usage() {
  console.error(USAGE);
  process.exit(1);
}

function getPort(portArg) {
  let port = Number(portArg);
  if (!port) usage();
  return port;
}

async function go(args) {
  try {
    const port = getPort(args[0]);
    if (!args[1].startsWith('mongodb://')) {
      console.error(`argument "${args[1]}" does not start with mongodb://`);
      process.exit(1);
    }
    const model = await Model.make(args[1]);
    if (args.length > 2) {
      await model.clear();  //clears books and carts
      await loadData(model, args.slice(2));
    }
    serve(port, meta, model);
  }
  catch (err) {
    //hopefully we should never get here.
    console.error(err);
  }
}
    

export default async function cli() {
  if (process.argv.length < 4) usage();
  await go(process.argv.slice(2));
}

