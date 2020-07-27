
/** Given array of links,  return href for link in links which has
 *  specified rel.
 */
function getRelHref(links, rel) {
  return links.find(link => link.rel === rel).href;
}

export { getRelHref };
