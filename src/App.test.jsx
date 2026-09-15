import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => []
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the header brand and navigation', () => {
    render(<App />);
    expect(screen.getByAltText('Nexus')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText(/Curate Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Research/i)).toBeInTheDocument();
  });

  it('renders search input and filters studies', () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText(/Search studies/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Neuroplasticity' } });
    expect(screen.getByText(/Neuroplasticity in Adult Lexical Learning/i)).toBeInTheDocument();
  });

  it('opens and closes curation modal', () => {
    render(<App />);
    const curateBtn = screen.getByText(/Curate Feed/i);
    fireEvent.click(curateBtn);
    expect(screen.getByText('Curate Your Feed')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close curation modal');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Curate Your Feed')).not.toBeInTheDocument();
  });

  it('navigates to article view and opens Ask the Paper tab', async () => {
    render(<App />);
    const studyTitle = screen.getByText(/Neuroplasticity in Adult Lexical Learning/i);
    fireEvent.click(studyTitle);

    expect(screen.getByText('Plain Synthesis')).toBeInTheDocument();
    const askTab = screen.getByText(/Ask the Paper/i);
    expect(askTab).toBeInTheDocument();

    fireEvent.click(askTab);
    expect(screen.getByText(/Grounded in paper/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask a question about this study/i)).toBeInTheDocument();
  });
});



