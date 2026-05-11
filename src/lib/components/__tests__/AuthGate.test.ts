import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import AuthGate from '../AuthGate.svelte';

describe('AuthGate', () => {
	it('renders the inviting headline', () => {
		const { getByText } = render(AuthGate, { onAuthenticated: () => {} });
		expect(getByText(/let's talk about/i)).toBeInTheDocument();
	});

	it('renders email and password inputs', () => {
		const { getByLabelText } = render(AuthGate, { onAuthenticated: () => {} });
		expect(getByLabelText(/email/i)).toBeInTheDocument();
		expect(getByLabelText(/password/i)).toBeInTheDocument();
	});

	it('renders the Book 15 min CTA', () => {
		const { getByRole } = render(AuthGate, { onAuthenticated: () => {} });
		expect(getByRole('button', { name: /book 15 min/i })).toBeInTheDocument();
	});

	it('shows a generic error on sign-in failure (no detail leak)', async () => {
		const { getByLabelText, getByRole, findByText } = render(AuthGate, {
			onAuthenticated: () => {},
			signInImpl: async () => {
				throw new Error('user-not-found');
			}
		});
		await fireEvent.input(getByLabelText(/email/i), { target: { value: 'a@b.c' } });
		await fireEvent.input(getByLabelText(/password/i), { target: { value: 'badpassword' } });
		await fireEvent.click(getByRole('button', { name: /^sign in →$/i }));
		const err = await findByText(/sign-in failed/i);
		expect(err).toBeInTheDocument();
		expect(err.textContent).not.toMatch(/user-not-found|invalid-email|wrong-password/i);
	});
});
