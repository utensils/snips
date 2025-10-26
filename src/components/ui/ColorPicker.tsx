import { type ChangeEvent, type ReactElement, useEffect, useState } from 'react';

import { getTextColor, isValidHex } from '@/lib/color';

export interface ColorPickerProps {
  /**
   * Current color value (hex)
   */
  value: string;
  /**
   * Callback when color changes
   */
  onChange: (color: string) => void;
  /**
   * Label for the color picker
   */
  label?: string;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#0075ca', // GitHub blue
  '#d73a4a', // GitHub red
  '#0e8a16', // GitHub green
  '#fbca04', // GitHub yellow
  '#6f42c1', // GitHub purple
  '#e99695', // GitHub light red
  '#f9d0c4', // GitHub peach
  '#bfdadc', // GitHub light blue
  '#c2e0c6', // GitHub light green
  '#fef2c0', // GitHub light yellow
  '#cfd3d7', // GitHub gray
  '#EDEDED', // Default gray
];

/**
 * Generate a random hex color
 */
function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * ColorPicker component for selecting tag colors
 */
export function ColorPicker({
  value,
  onChange,
  label,
  disabled = false,
}: ColorPickerProps): ReactElement {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInputValue(value);
    setIsValid(isValidHex(value));
  }, [value]);

  const handlePresetClick = (color: string): void => {
    onChange(color);
  };

  const handleRandomClick = (): void => {
    const randomColor = generateRandomColor();
    onChange(randomColor);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (isValidHex(newValue)) {
      setIsValid(true);
      onChange(newValue.startsWith('#') ? newValue : `#${newValue}`);
    } else {
      setIsValid(false);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Current color preview with hex input */}
      <div className="flex items-center gap-2">
        <div
          className="w-12 h-12 rounded-md border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: isValid ? inputValue : '#FFFFFF',
          }}
          title={isValid ? inputValue : 'Invalid color'}
        >
          {isValid && (
            <span className="text-xs font-semibold" style={{ color: getTextColor(inputValue) }}>
              Snips
            </span>
          )}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder="#EDEDED"
          maxLength={7}
          className={`
            flex-1 px-3 py-2 text-sm font-mono
            border rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-700
            ${
              isValid
                ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                : 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
            }
            text-gray-900 dark:text-gray-100
          `}
          aria-label="Color hex value"
          aria-invalid={!isValid}
        />
        <button
          type="button"
          onClick={handleRandomClick}
          disabled={disabled}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate random color"
          aria-label="Generate random color"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {!isValid && (
        <p className="text-xs text-red-600 dark:text-red-400">Please enter a valid hex color</p>
      )}

      {/* Preset colors */}
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Preset colors:</p>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => {
            const isSelected = value.toUpperCase() === color.toUpperCase();
            const textColor = getTextColor(color);

            return (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                disabled={disabled}
                className={`
                  w-full h-10 rounded-md
                  border-2 transition-all
                  hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${isSelected ? 'border-gray-900 dark:border-gray-100 ring-2 ring-blue-500' : 'border-gray-300 dark:border-gray-600'}
                `}
                style={{
                  backgroundColor: color,
                }}
                title={color}
                aria-label={`Select color ${color}`}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <span
                    className="text-lg font-bold"
                    style={{ color: textColor }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
