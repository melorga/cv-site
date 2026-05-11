import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from '../ThemeToggle.svelte';

describe('ThemeToggle', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove('dark', 'light');
	});

	it('renders a button with an accessible label', () => {
		const { getByRole } = render(ThemeToggle);
		expect(getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
	});

	it('starts in dark mode by default', () => {
		render(ThemeToggle);
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('toggles to light mode on click and persists', async () => {
		const { getByRole } = render(ThemeToggle);
		await fireEvent.click(getByRole('button'));
		expect(document.documentElement.classList.contains('dark')).toBe(false);
		expect(localStorage.getItem('theme')).toBe('light');
	});

	it('reads stored preference on mount', () => {
		localStorage.setItem('theme', 'light');
		render(ThemeToggle);
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});
});
