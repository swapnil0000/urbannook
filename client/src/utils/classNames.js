/**
 * Utility function to conditionally join classNames
 * Similar to the popular 'classnames' or 'clsx' library
 * 
 * @param {...(string|Object|Array)} args - Class names or objects with boolean values
 * @returns {string} - Combined class names
 * 
 * @example
 * cn('btn', 'btn-primary') // 'btn btn-primary'
 * cn('btn', { 'btn-active': isActive }) // 'btn btn-active' if isActive is true
 * cn('btn', isActive && 'btn-active') // 'btn btn-active' if isActive is true
 * cn(['btn', 'btn-primary']) // 'btn btn-primary'
 */
export function cn(...args) {
  const classes = [];

  args.forEach((arg) => {
    if (!arg) return;

    const argType = typeof arg;

    if (argType === 'string' || argType === 'number') {
      classes.push(arg);
    } else if (Array.isArray(arg)) {
      if (arg.length) {
        const inner = cn(...arg);
        if (inner) {
          classes.push(inner);
        }
      }
    } else if (argType === 'object') {
      if (arg.toString !== Object.prototype.toString) {
        classes.push(arg.toString());
      } else {
        for (const key in arg) {
          if (Object.prototype.hasOwnProperty.call(arg, key) && arg[key]) {
            classes.push(key);
          }
        }
      }
    }
  });

  return classes.join(' ');
}

export default cn;
