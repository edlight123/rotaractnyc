'use client';

import { useState, useEffect } from 'react';
import Select from './Select';
import Input from './Input';

interface SelectWithOtherProps {
  label?: string;
  /** Marks the field required, same as the underlying Select. */
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  helperText?: string;
}

/**
 * A Select dropdown that includes an "Other" option. When "Other" is chosen,
 * a text Input appears below so the user can type a custom value.
 *
 * The component emits the resolved value — either the selected dropdown option
 * or the custom text the user typed.
 *
 * The `options` array should include `{ value: '__other__', label: 'Other' }`
 * as the last item (use the `toSelectOptions` helper from lib/profileOptions).
 */
export default function SelectWithOther({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  helperText,
}: SelectWithOtherProps) {
  const knownValues = options.map((o) => o.value).filter((v) => v !== '__other__');
  const isOther = value !== '' && !knownValues.includes(value);

  const [showOtherInput, setShowOtherInput] = useState(isOther);
  const [customValue, setCustomValue] = useState(isOther ? value : '');

  // When the parent's value changes (e.g. on mount from saved data), sync
  useEffect(() => {
    const known = options.map((o) => o.value).filter((v) => v !== '__other__');
    const isCustom = value !== '' && !known.includes(value);
    setShowOtherInput(isCustom);
    if (isCustom) setCustomValue(value);
  }, [value, options]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__other__') {
      setShowOtherInput(true);
      setCustomValue('');
      onChange('');
    } else {
      setShowOtherInput(false);
      setCustomValue('');
      onChange(selected);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCustomValue(v);
    onChange(v);
  };

  const selectValue = showOtherInput ? '__other__' : value;

  return (
    <div className="w-full space-y-2">
      <Select
        label={label}
        required={required}
        value={selectValue}
        onChange={handleSelectChange}
        options={options}
        placeholder={placeholder}
        error={!showOtherInput ? error : undefined}
        helperText={!showOtherInput ? helperText : undefined}
      />
      {showOtherInput && (
        <Input
          value={customValue}
          onChange={handleCustomChange}
          placeholder="Please specify…"
          error={error}
          helperText={helperText}
        />
      )}
    </div>
  );
}
