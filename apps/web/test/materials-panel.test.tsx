import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MaterialsPanel } from '../src/components/materials/MaterialsPanel';
import type { MaterialRecommendation, MaterialSubject } from '@chatbot-ai/shared';

afterEach(cleanup);

const makeSubject = (overrides: Partial<MaterialSubject> = {}): MaterialSubject => ({
  id: 'subject-db',
  slug: 'database-systems',
  nameVi: 'Hệ quản trị CSDL',
  nameEn: 'Database Systems',
  ...overrides,
});

const makeMaterial = (overrides: Partial<MaterialRecommendation> = {}): MaterialRecommendation => ({
  id: 'material-1',
  title: 'SQL Query Patterns',
  description: 'Covers joins, grouping, subqueries',
  url: 'https://example.edu/sql',
  subject: makeSubject(),
  topic: null,
  level: 'beginner',
  type: 'article',
  tags: ['sql', 'joins'],
  language: 'en',
  source: 'Campus Dev Notes',
  score: 85,
  reason: ['Matches query keywords'],
  isFeatured: true,
  ...overrides,
});

describe('MaterialsPanel', () => {
  const defaultProps = {
    searchValue: '',
    onSearchChange: () => {},
    materials: [] as MaterialRecommendation[],
    isLoading: false,
    errorMessage: null as string | null,
    errorMeta: null as string | null,
    onRetry: undefined as (() => void) | undefined,
  };

  it('renders search input', () => {
    render(<MaterialsPanel {...defaultProps} />);
    expect(screen.getByRole('searchbox')).toBeTruthy();
  });

  it('renders empty state when no materials', () => {
    render(<MaterialsPanel {...defaultProps} />);
    expect(screen.getByText(/No materials found/i)).toBeTruthy();
  });

  it('renders materials when provided', () => {
    const materials = [
      makeMaterial(),
      makeMaterial({ id: 'm2', title: 'SQL Indexing Guide', score: 72 }),
    ];
    render(<MaterialsPanel {...defaultProps} materials={materials} />);
    expect(screen.getByText('SQL Query Patterns')).toBeTruthy();
    expect(screen.getByText('SQL Indexing Guide')).toBeTruthy();
  });

  it('shows match percentage on each material', () => {
    const materials = [makeMaterial({ score: 85 }), makeMaterial({ id: 'm2', score: 92 })];
    render(<MaterialsPanel {...defaultProps} materials={materials} />);
    expect(screen.getByText('85% match')).toBeTruthy();
    expect(screen.getByText('92% match')).toBeTruthy();
  });

  it('shows material type badge', () => {
    const materials = [makeMaterial({ type: 'video' }), makeMaterial({ id: 'm2', type: 'pdf' })];
    render(<MaterialsPanel {...defaultProps} materials={materials} />);
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText('PDF')).toBeTruthy();
  });

  it('renders subject name for each material', () => {
    const materials = [makeMaterial({ subject: makeSubject({ nameVi: 'Toán rời rạc' }) })];
    render(<MaterialsPanel {...defaultProps} materials={materials} />);
    expect(screen.getByText('Toán rời rạc')).toBeTruthy();
  });

  it('calls onSearchChange when the search input changes', () => {
    const onSearchChange = vi.fn();
    render(<MaterialsPanel {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'joins' } });
    expect(onSearchChange).toHaveBeenCalledWith('joins');
  });

  it('renders loading skeletons when isLoading is true', () => {
    render(<MaterialsPanel {...defaultProps} isLoading={true} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state with message and retry button', () => {
    const onRetry = vi.fn();
    render(<MaterialsPanel {...defaultProps} errorMessage="Failed to load" errorMeta="Network error" onRetry={onRetry} />);
    expect(screen.getByText('Failed to load')).toBeTruthy();
    expect(screen.getByText('Network error')).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeTruthy();
  });

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<MaterialsPanel {...defaultProps} errorMessage="Failed" onRetry={onRetry} />);
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    (retryBtn as HTMLElement).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<MaterialsPanel {...defaultProps} errorMessage="Failed" />);
    expect(screen.queryByRole('button', { name: /Retry/i })).toBeFalsy();
  });

  it('renders material links with correct href', () => {
    const materials = [makeMaterial({ url: 'https://example.edu/sql' })];
    render(<MaterialsPanel {...defaultProps} materials={materials} />);
    const links = screen.getAllByRole('link');
    const hasCorrectHref = links.some((l) => l.getAttribute('href') === 'https://example.edu/sql');
    expect(hasCorrectHref).toBe(true);
  });
});
