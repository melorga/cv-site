import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../Sidebar.svelte';
import type { User } from '$lib/types';

const user: User = {
	uid: 'u1',
	email: 'visitor@example.com',
	displayName: 'Visitor',
	photoURL: null
};

describe('Sidebar', () => {
	it('renders the owner name from VITE_PROFILE_NAME, not the visitor name', () => {
		// Fixture set in vitest.setup.ts → VITE_PROFILE_NAME = "Test Owner"
		const { getByText } = render(Sidebar, { user, onSignOut: () => {} });
		expect(getByText('Test Owner')).toBeInTheDocument();
	});

	it('renders LinkedIn and Calendar links when VITE_*_URL env vars are set', () => {
		const { getByRole } = render(Sidebar, { user, onSignOut: () => {} });
		expect(getByRole('link', { name: /linkedin/i })).toBeInTheDocument();
		expect(getByRole('link', { name: /calendar/i })).toBeInTheDocument();
	});

	it('calls onSignOut when sign-out is clicked', async () => {
		const onSignOut = vi.fn();
		const { getByRole } = render(Sidebar, { user, onSignOut });
		await fireEvent.click(getByRole('button', { name: /sign out/i }));
		expect(onSignOut).toHaveBeenCalled();
	});

	it('shows visitor email', () => {
		const { getByText } = render(Sidebar, { user, onSignOut: () => {} });
		expect(getByText(/visitor@example\.com/)).toBeInTheDocument();
	});
});
