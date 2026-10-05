import React from 'react';
import { COUNTRIES, pickerCountryName } from '../services/worldCities';

interface CountrySelectProps {
  value: string;
  onChange: (country: string) => void;
  id?: string;
  className?: string;
}

/**
 * Country dropdown for address forms. Inherits the surrounding form's `select` styling.
 * A stored value spelled differently from the list ("UK") is normalized to the matching
 * option; one not in the list at all is kept as an extra option rather than silently
 * replaced, so opening an old record never changes its country by itself.
 */
export const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange, id, className }) => {
  const selected = pickerCountryName(value);
  const isListed = COUNTRIES.some(([name]) => name === selected);
  return (
    <select id={id} className={className} value={selected} onChange={e => onChange(e.target.value)}>
      {!isListed && <option value={selected}>{selected}</option>}
      {COUNTRIES.map(([name, code]) => (
        <option key={code} value={name}>{name}</option>
      ))}
    </select>
  );
};
