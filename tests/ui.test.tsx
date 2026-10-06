// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import App from '../src/App';
import { PremiumDialog } from '../src/Premium';
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
});
describe('desktop shell', () => {
  it('navigates to honest empty states without fabricated activity', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Your files. Somewhere new.' })).toBeInTheDocument();
    expect(screen.getByText(/Browser preview/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Receive' }));
    expect(
      screen.getByRole('heading', { name: 'Receiving is being built carefully.' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Transfers' }));
    expect(screen.getByRole('heading', { name: 'No transfers yet.' })).toBeInTheDocument();
  });
  it('persists theme and genuinely applies reduced motion', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByRole('combobox', { name: 'Color mode' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Color mode' }), 'dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    await user.click(screen.getByRole('switch', { name: /Reduced motion/ }));
    await waitFor(() => expect(document.documentElement).toHaveClass('reduce-motion'));
    expect(JSON.parse(localStorage.getItem('dropbeam.settings')!).theme).toBe('dark');
  });
  it('shows both editions as free and marks worldwide as planned', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /A little more magic/ }));
    expect(screen.getAllByText('$0.00')).toHaveLength(2);
    expect(screen.getByText(/You already own Free/)).toBeInTheDocument();
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });
  it('validates a name and blocks email submission without Cloud', async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    const user = userEvent.setup();
    render(<PremiumDialog close={() => {}} />);
    await user.type(screen.getByLabelText('Your name'), '<script>');
    await user.click(screen.getByRole('button', { name: 'Preview my request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use letters');
    await user.clear(screen.getByLabelText('Your name'));
    await user.type(screen.getByLabelText('Your name'), 'Caleb');
    await user.click(screen.getByRole('button', { name: 'Preview my request' }));
    expect(screen.getByText(/Dear Caleb,/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Premium' })).toBeDisabled();
    expect(screen.queryByText('Premium Request Sent!')).not.toBeInTheDocument();
  });
});
