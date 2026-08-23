import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubmitModal from './SubmitModal';

describe('SubmitModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <SubmitModal isOpen={false} onClose={() => {}} onPaperAdded={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(<SubmitModal isOpen onClose={() => {}} onPaperAdded={() => {}} />);
    expect(screen.getByText('Submit Research')).toBeInTheDocument();
  });
});

