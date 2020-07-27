//-*- mode: rjsx-mode;

import React from 'react';

export default class Books extends React.Component {

  constructor(props) {
    super(props);
    //@TODO other initialization
  }

  //@TODO other methods

  render() {
    //@TODO complete rendering
    return '';
  }

}

export function Book({book, full}) {
  //@TODO return rendering of book based on full
  return '';
}

//@TODO other components like SearchForm, Results, etc.

/** text for scroll controls */
const SCROLLS = {
  next: 'Next >>',
  prev: '<< Previous',
};
