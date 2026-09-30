import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select, SelectTrigger, SelectValue } from './select';

describe('SelectTrigger', () => {
  it('renders a valid select trigger after theme styling changes', () => {
    render(
      <Select defaultValue="one">
        <SelectTrigger aria-label="Pilihan">
          <SelectValue placeholder="Pilih" />
        </SelectTrigger>
      </Select>,
    );

    expect(screen.getByRole('combobox', { name: 'Pilihan' })).toBeInTheDocument();
  });
});
