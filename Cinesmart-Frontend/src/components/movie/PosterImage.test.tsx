import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PosterImage } from './PosterImage';

describe('PosterImage', () => {
  it('renders the poster with the title as alt', () => {
    render(<PosterImage src="https://img.example/p.jpg" title="Interstellar" />);
    const img = screen.getByRole('img', { name: 'Interstellar' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it.each([null, '', 'N/A'])('falls back to the placeholder for %j', (src) => {
    render(<PosterImage src={src} title="No Poster" />);
    const placeholder = screen.getByRole('img', { name: 'No Poster' });
    expect(placeholder.tagName).toBe('DIV');
    expect(placeholder).toHaveTextContent('No Poster');
  });

  it('falls back when the image fails to load', () => {
    render(<PosterImage src="https://img.example/broken.jpg" title="Broken" priority />);
    const img = screen.getByRole('img', { name: 'Broken' });
    expect(img).toHaveAttribute('loading', 'eager');
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'Broken' }).tagName).toBe('DIV');
  });
});
