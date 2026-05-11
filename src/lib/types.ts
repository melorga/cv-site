export interface User {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

export interface ChatMessage {
	role: 'user' | 'assistant';
	text: string;
	timestamp: Date;
}
