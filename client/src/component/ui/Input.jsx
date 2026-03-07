import PropTypes from 'prop-types';

/**
 * Input Component
 * Reusable input field with label, error, and icon support
 */
const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  inputClassName = '',
  ...props
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-[10px] font-bold uppercase tracking-widest text-[#a89068] ml-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-white border rounded-xl px-5 py-4 text-[#2e443c]
            focus:outline-none transition-all duration-300 placeholder-gray-300 shadow-sm
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon ? 'pr-12' : ''}
            ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-[#a89068]'}
            ${inputClassName}
          `}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-xs ml-1">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-gray-500 text-xs ml-1">{helperText}</p>
      )}
    </div>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
};

export default Input;
