import PropTypes from 'prop-types';

const ColorSelector = ({ colors, selectedColor, onColorSelect, disabled = false }) => {
  // Return null if colors array is empty or undefined
  if (!colors || colors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Select Color
      </label>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color;
          
          return (
            <button
              key={color}
              type="button"
              onClick={() => !disabled && onColorSelect(color)}
              disabled={disabled}
              className={`
                px-4 py-2 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-[#F5DEB3] bg-[#F5DEB3] text-[#1c3026] font-semibold shadow-md' 
                  : 'border-gray-300 bg-white text-gray-700 hover:border-[#1c3026] hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={`Select ${color} color`}
              aria-pressed={isSelected}
            >
              {color}
            </button>
          );
        })}
      </div>
    </div>
  );
};

ColorSelector.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string),
  selectedColor: PropTypes.string,
  onColorSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ColorSelector;
