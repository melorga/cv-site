import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatPanel from '../ChatPanel.svelte';

describe('ChatPanel', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the greeting and input', () => {
		const { getByText, getByPlaceholderText } = render(ChatPanel, {
			initialPrompts: ['Q1']
		});
		expect(getByText(/ask me/i)).toBeInTheDocument();
		expect(getByPlaceholderText(/ask anything/i)).toBeInTheDocument();
	});

	it('renders the initial suggestion chips', () => {
		const { getByText } = render(ChatPanel, {
			initialPrompts: ['What is your AWS specialty?']
		});
		expect(getByText('What is your AWS specialty?')).toBeInTheDocument();
	});

	it('sends a message and appends both bubbles', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ response: 'I specialize in X', contextUsed: true })
		}) as unknown as typeof fetch;
		const { getByPlaceholderText, getByRole, getByText } = render(ChatPanel, {
			initialPrompts: []
		});
		const input = getByPlaceholderText(/ask anything/i) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'Tell me about you' } });
		await fireEvent.click(getByRole('button', { name: /send/i }));
		await waitFor(() => expect(getByText('Tell me about you')).toBeInTheDocument());
		await waitFor(() => expect(getByText('I specialize in X')).toBeInTheDocument());
		expect(global.fetch).toHaveBeenCalledWith(
			'/api/chat',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('shows a friendly error on 429', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch;
		const { getByPlaceholderText, getByRole, findByText } = render(ChatPanel, {
			initialPrompts: []
		});
		const input = getByPlaceholderText(/ask anything/i) as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'hi' } });
		await fireEvent.click(getByRole('button', { name: /send/i }));
		expect(await findByText(/slow down/i)).toBeInTheDocument();
	});
});
