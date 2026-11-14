// Marks a v1 endpoint as deprecated without changing its response.
// Clients and monitoring can see it in the headers (RFC 8594 / RFC 9745):
//   Deprecation: true
//   Link: </api/v2/...>; rel="successor-version"
// No Sunset date yet: v1 stays until the storefront, SSR and mobile app have
// moved to v2. Set one here when a removal date is agreed.
export const deprecated = (successorPath) => (req, res, next) => {
  res.set("Deprecation", "true");
  if (successorPath) res.set("Link", `<${successorPath}>; rel="successor-version"`);
  next();
};
