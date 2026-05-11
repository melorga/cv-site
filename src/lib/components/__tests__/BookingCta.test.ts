import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookingCta from '../BookingCta.svelte';

describe('BookingCta', () => {
	beforeEach(() => {
		delete (window as unknown as { Calendly?: unknown }).Calendly;
	});

	it('renders the Book 15 min label', () => {
		const { getByRole } = render(BookingCta, {
			calendlyUrl: 'https://calendly.com/me/15min',
			mailtoFallback: 'mailto:me@example.com?subject=15min'
		});
		expect(getByRole('button', { name: /book 15 min/i })).toBeInTheDocument();
	});

	it('calls Calendly.initPopupWidget when widget is loaded', async () => {
		const initPopup = vi.fn();
		(window as unknown as { Calendly: { initPopupWidget: typeof initPopup } }).Calendly = {
			initPopupWidget: initPopup
		};
		const { getByRole } = render(BookingCta, {
			calendlyUrl: 'https://calendly.com/me/15min',
			mailtoFallback: 'mailto:me@example.com'
		});
		await fireEvent.click(getByRole('button'));
		expect(initPopup).toHaveBeenCalledWith({ url: 'https://calendly.com/me/15min' });
	});
});
