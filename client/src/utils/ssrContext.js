import { createContext, useContext } from 'react';

// Set only by entry-server.jsx. Lets a page tell the SSR server the HTTP
// status to send (e.g. 404 for a missing product), instead of a soft 404.
export const SsrContext = createContext(null);

/** Call during render: no-op in the browser. */
export const useSsrStatus = (status) => {
  const ssr = useContext(SsrContext);
  ssr?.setStatus(status);
};

/** Same as useSsrStatus, as an element for early-return branches. */
export const SsrStatus = ({ code }) => {
  useSsrStatus(code);
  return null;
};
