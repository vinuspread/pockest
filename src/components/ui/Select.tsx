import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils';

export interface SelectOption {
    label: string;
    value: string;
}

export interface SelectProps {
    options: SelectOption[] | string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select option',
    label,
    className,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Normalize options to object format
    const normalizedOptions: SelectOption[] = options.map((opt) =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const selectedOption = normalizedOptions.find((opt) => opt.value === value);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={cn("w-full relative", className)} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 bg-white border rounded-xl text-sm transition-all outline-none",
                    "hover:border-primary-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10",
                    disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "cursor-pointer",
                    isOpen ? "border-primary-500 ring-4 ring-primary-500/10" : "border-gray-200",
                    !selectedOption ? "text-gray-400" : "text-gray-900"
                )}
            >
                <span className="block truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-gray-400 transition-transform duration-200",
                        isOpen && "transform rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100 origin-top-center">
                    <div className="p-1">
                        {normalizedOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors text-left",
                                    option.value === value
                                        ? "bg-primary-50 text-primary-700 font-medium"
                                        : "text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <span>{option.label}</span>
                                {option.value === value && (
                                    <Check className="w-4 h-4 text-primary-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
