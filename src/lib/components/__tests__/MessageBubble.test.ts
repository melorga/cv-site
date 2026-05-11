import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import MessageBubble from '../MessageBubble.svelte';

describe('MessageBubble', () => {
	it('renders user text aligned right', () => {
		const { container, getByText } = render(MessageBubble, {
			role: 'user',
			text: 'Hello'
		});
		expect(getByText('Hello')).toBeInTheDocument();
		expect(container.querySelector('[data-role="user"]')).not.toBeNull();
	});

	it('renders assistant text aligned left', () => {
		const { container } = render(MessageBubble, {
			role: 'assistant',
			text: 'Hi there'
		});
		expect(container.querySelector('[data-role="assistant"]')).not.toBeNull();
	});

	it('includes the fade-in animation class', () => {
		const { container } = render(MessageBubble, {
			role: 'user',
			text: 'x'
		});
		expect(container.firstElementChild).toHaveClass('animate-fade-in');
	});
});
