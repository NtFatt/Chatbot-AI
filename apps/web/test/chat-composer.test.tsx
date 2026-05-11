import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatComposer } from '../src/components/chat/ChatComposer';

afterEach(cleanup);

describe('ChatComposer', () => {
  const defaultProps = {
    activeProvider: 'GEMINI' as const,
    connectionState: 'connected' as const,
    disabled: false,
    onChange: () => {},
    onSend: () => {},
    value: '',
  };

  it('renders the textarea with placeholder text', () => {
    render(<ChatComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask anything about your studies...')).toBeTruthy();
  });

  it('calls onChange when text is entered', () => {
    const onChange = vi.fn();
    render(<ChatComposer {...defaultProps} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText('Ask anything about your studies...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'What is SQL?' } });
    expect(onChange).toHaveBeenCalledWith('What is SQL?');
  });

  it('calls onSend when Enter is pressed with non-empty value', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();
    render(<ChatComposer {...defaultProps} onSend={onSend} onChange={onChange} value="What is a join?" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13, which: 13 });
    });

    expect(onSend).toHaveBeenCalledWith('What is a join?');
  });

  it('does not call onSend when Enter+Shift is pressed', () => {
    const onSend = vi.fn();
    render(<ChatComposer {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true, keyCode: 16, which: 16 });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears the input after successful send', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();
    render(<ChatComposer {...defaultProps} onSend={onSend} onChange={onChange} value="Hello" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13, which: 13 });
    });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not call onSend when disabled', () => {
    const onSend = vi.fn();
    render(<ChatComposer {...defaultProps} disabled={true} onSend={onSend} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 13, which: 13 });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows disconnected hint when connection is down', () => {
    render(<ChatComposer {...defaultProps} connectionState="disconnected" />);
    expect(screen.getByText(/Realtime disconnected/i)).toBeTruthy();
  });

  it('respects maxLength attribute on textarea', () => {
    render(<ChatComposer {...defaultProps} value="test" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.maxLength).toBeGreaterThan(0);
  });

  it('renders the send button', () => {
    render(<ChatComposer {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
