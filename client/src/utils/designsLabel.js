import { COLLECTIONS as C } from '../content/homeRedesign';

/** "1 design" / "12 designs" — wording from content/homeRedesign.js. */
export const designsLabel = (n) => (n === 1 ? C.designs.one : C.designs.many).replace('{n}', n);
