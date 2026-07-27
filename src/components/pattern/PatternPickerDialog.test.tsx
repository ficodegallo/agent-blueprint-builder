import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatternPickerDialog } from './PatternPickerDialog';
import { ALL_PATTERNS } from '../../features/patterns/patterns';

describe('PatternPickerDialog', () => {
  it('renders a card for every pattern plus a Start blank option', () => {
    render(<PatternPickerDialog isOpen onClose={() => {}} onSelect={() => {}} />);
    for (const p of ALL_PATTERNS) {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    }
    expect(screen.getByText('Start blank')).toBeInTheDocument();
    expect(screen.getByText('Help me choose')).toBeInTheDocument();
  });

  it('selecting a pattern card calls onSelect with that id', () => {
    const onSelect = vi.fn();
    render(<PatternPickerDialog isOpen onClose={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Routing'));
    expect(onSelect).toHaveBeenCalledWith('routing');
  });

  it('Start blank calls onSelect with null', () => {
    const onSelect = vi.fn();
    render(<PatternPickerDialog isOpen onClose={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Start blank'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('guided mode recommends a pattern and confirming flows to onSelect', () => {
    const onSelect = vi.fn();
    render(<PatternPickerDialog isOpen onClose={() => {}} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Help me choose'));
    // First question resolves to pipeline on "Yes".
    fireEvent.click(screen.getByText('Yes'));
    expect(screen.getByText('Recommended pattern')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Use this pattern'));
    expect(onSelect).toHaveBeenCalledWith('pipeline');
  });
});
