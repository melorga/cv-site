import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SuggestionChips from '../SuggestionChips.svelte';

describe('SuggestionChips', () => {
	it('renders each prompt as a chip', () => {
		const prompts = ['What is your AWS specialty?', 'Show me a project'];
		const { getByText } = render(SuggestionChips, { prompts, onSelect: () => {} });
		expect(getByText(prompts[0])).toBeInTheDocument();
		expect(getByText(prompts[1])).toBeInTheDocument();
	});

	it('calls onSelect with the prompt text when clicked', async () => {
		const onSelect = vi.fn();
		const { getByText } = render(SuggestionChips, { prompts: ['Pick me'], onSelect });
		await fireEvent.click(getByText('Pick me'));
		expect(onSelect).toHaveBeenCalledWith('Pick me');
	});

	it('renders nothing when prompts is empty', () => {
		const { container } = render(SuggestionChips, { prompts: [], onSelect: () => {} });
		expect(container.querySelectorAll('button')).toHaveLength(0);
	});
});
