import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({
    options = [],
    value = '',
    onChange,
    placeholder = 'Select an option...',
    error = '',
    label = '',
    name = '',
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (selectRef.current && !selectRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectOption = (option) => {
        if (!option.disabled && !disabled) {
            onChange({
                target: {
                    name: name,
                    value: option.value
                }
            });
            setIsOpen(false);
        }
    };

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="text-[10px] uppercase tracking-widest text-brand font-bold ml-2">
                    {label}
                </label>
            )}
            <div className="relative" ref={selectRef}>
                {/* Custom Select Button */}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full bg-white border rounded-xl px-5 py-4 text-left focus:outline-none transition-all duration-200 shadow-sm flex items-center justify-between group ${
                        disabled 
                            ? 'cursor-not-allowed opacity-60 bg-gray-50' 
                            : 'cursor-pointer'
                    } ${
                        error 
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:border-brand hover:border-brand/50'
                    } ${isOpen ? 'border-brand shadow-md' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        {selectedOption && selectedOption.value ? (
                            <>
                                {selectedOption.icon && (
                                    <i className={`${selectedOption.icon} text-brand text-sm`}></i>
                                )}
                                <span className="text-ink font-medium">{selectedOption.label}</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-circle-question text-gray-400 text-sm"></i>
                                <span className="text-gray-400">{placeholder}</span>
                            </>
                        )}
                    </div>
                    <i className={`fa-solid fa-chevron-down text-brand text-xs transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}></i>
                </button>

                {/* Custom Dropdown */}
                <div className={`absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-200 ${
                    isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'
                }`}>
                    <div className="max-h-64 overflow-y-auto">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectOption(option)}
                                disabled={option.disabled}
                                className={`w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 group ${
                                    option.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                } ${value === option.value ? 'bg-brand/5 border-r-2 border-brand' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                    value === option.value
                                        ? 'bg-brand text-white'
                                        : option.disabled
                                            ? 'bg-gray-100 text-gray-400'
                                            : 'bg-gray-100 text-brand group-hover:bg-brand group-hover:text-white'
                                }`}>
                                    {option.icon && (
                                        <i className={`${option.icon} text-xs`}></i>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className={`font-medium ${
                                        option.disabled ? 'text-gray-400' : 'text-ink'
                                    }`}>
                                        {option.label}
                                    </div>
                                    {option.description && !option.disabled && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {option.description}
                                        </div>
                                    )}
                                </div>
                                {value === option.value && (
                                    <i className="fa-solid fa-check text-brand text-sm"></i>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {error && (
                <p className="text-red-500 text-xs ml-2">{error}</p>
            )}
        </div>
    );
};

export default CustomSelect;