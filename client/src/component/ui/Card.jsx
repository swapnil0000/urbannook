import PropTypes from 'prop-types';

/**
 * Card Component
 * Reusable card container with variants
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  ...props
}) => {
  // Variant styles
  const variants = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg',
    outlined: 'bg-transparent border-2 border-[#a89068]',
    filled: 'bg-[#f5f7f8] border border-transparent',
    dark: 'bg-[#2e443c] text-white border border-transparent',
  };

  // Padding styles
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  // Hover effect
  const hoverEffect = hover
    ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer'
    : '';

  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${hoverEffect} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'elevated', 'outlined', 'filled', 'dark']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl']),
  hover: PropTypes.bool,
  className: PropTypes.string,
};

export default Card;
