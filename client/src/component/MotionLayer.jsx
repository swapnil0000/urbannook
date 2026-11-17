/**
 * URBAN NOOK - app-level film grain.
 *
 * All motion that used to be scripted here is now plain CSS (index.css):
 *   - scroll reveals on `.un-reveal`  -> native `animation-timeline: view()`
 *     (content is visible by default, so crawlers and older browsers see it)
 *   - hover lift on `.un-card`        -> :hover transition
 *   - press on `.un-btn` / `.un-chip` -> :active scale transition
 * The grain is a static texture (no animation), hidden on touch devices and
 * for reduced motion. No JavaScript, no listeners.
 */
const MotionLayer = () => <div className="un-grain" aria-hidden="true" />;

export default MotionLayer;
