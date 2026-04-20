import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LoginPage } from '../src/features/auth/LoginPage';

describe('LoginPage', () => {
  it('renders the quick entry workspace copy', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Quick entry/i)).toBeTruthy();
    expect(screen.getByText(/Chatbot AI hoc tap/i)).toBeTruthy();
  });
});
