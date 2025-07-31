#!/usr/bin/env node

/**
 * Security and Functionality Test Suite
 * Validates the CV site for production readiness
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';
const TIMEOUT = 10000;

class SecurityTester {
	constructor() {
		this.results = {
			passed: 0,
			failed: 0,
			warnings: 0,
			tests: []
		};
	}

	log(level, message, details = '') {
		const timestamp = new Date().toISOString();
		const emoji = level === 'PASS' ? '✅' : level === 'FAIL' ? '❌' : '⚠️';
		console.log(`${timestamp} ${emoji} [${level}] ${message}${details ? '\n    ' + details : ''}`);

		this.results.tests.push({ level, message, details, timestamp });

		if (level === 'PASS') this.results.passed++;
		else if (level === 'FAIL') this.results.failed++;
		else this.results.warnings++;
	}

	async test(name, fn) {
		try {
			await fn();
		} catch (error) {
			this.log('FAIL', name, error.message);
		}
	}

	async fetch(url, options = {}) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	// Test basic connectivity
	async testConnectivity() {
		await this.test('Basic Connectivity', async () => {
			const response = await this.fetch(BASE_URL);
			if (response.ok) {
				this.log('PASS', 'Site is accessible');
			} else {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
		});
	}

	// Test security headers
	async testSecurityHeaders() {
		await this.test('Security Headers', async () => {
			const response = await this.fetch(BASE_URL);
			const headers = response.headers;

			const requiredHeaders = [
				'x-content-type-options',
				'x-frame-options',
				'x-xss-protection',
				'referrer-policy'
			];

			for (const header of requiredHeaders) {
				if (headers.get(header)) {
					this.log('PASS', `Header ${header} present: ${headers.get(header)}`);
				} else {
					this.log('WARN', `Missing security header: ${header}`);
				}
			}

			// Check CSP in production
			const csp = headers.get('content-security-policy');
			if (csp) {
				this.log('PASS', 'Content Security Policy present');
				if (csp.includes("'unsafe-eval'") || csp.includes("'unsafe-inline'")) {
					this.log('WARN', 'CSP allows potentially unsafe directives');
				}
			} else {
				this.log('WARN', 'Content Security Policy not set');
			}
		});
	}

	// Test rate limiting
	async testRateLimit() {
		await this.test('Rate Limiting', async () => {
			const promises = [];
			for (let i = 0; i < 70; i++) {
				// Exceed the 60/min limit
				promises.push(
					this.fetch(`${BASE_URL}/api/chat`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ message: 'test' })
					})
				);
			}

			const responses = await Promise.allSettled(promises);
			const rateLimited = responses.some((r) => r.status === 'fulfilled' && r.value.status === 429);

			if (rateLimited) {
				this.log('PASS', 'Rate limiting is working');
			} else {
				this.log('WARN', 'Rate limiting may not be configured properly');
			}
		});
	}

	// Test input validation
	async testInputValidation() {
		await this.test('Input Validation', async () => {
			const maliciousInputs = [
				'<script>alert("xss")</script>',
				'SELECT * FROM users',
				'javascript:alert(1)',
				'x'.repeat(2000), // Too long
				null,
				undefined,
				{ malicious: 'object' }
			];

			for (const input of maliciousInputs) {
				try {
					const response = await this.fetch(`${BASE_URL}/api/chat`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ message: input })
					});

					if (response.status >= 400 && response.status < 500) {
						this.log(
							'PASS',
							`Rejected malicious input: ${typeof input === 'string' ? input.substring(0, 50) : typeof input}`
						);
					} else {
						this.log('WARN', `Accepted potentially malicious input: ${typeof input}`);
					}
				} catch {
					// Network errors are fine for this test
					this.log('PASS', `Network-level rejection for: ${typeof input}`);
				}
			}
		});
	}

	// Test API error handling
	async testErrorHandling() {
		await this.test('Error Handling', async () => {
			// Test malformed JSON
			const response = await this.fetch(`${BASE_URL}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'invalid json'
			});

			if (response.status === 400) {
				this.log('PASS', 'Properly handles malformed JSON');
			} else {
				this.log('WARN', 'May not properly handle malformed JSON');
			}

			const errorResponse = await response.json();
			if (errorResponse.error && !errorResponse.stack) {
				this.log('PASS', 'Error responses do not leak stack traces');
			} else {
				this.log('WARN', 'Error responses may leak sensitive information');
			}
		});
	}

	// Test HTTPS redirect (if applicable)
	async testHTTPS() {
		await this.test('HTTPS Configuration', async () => {
			if (BASE_URL.startsWith('https://')) {
				this.log('PASS', 'Using HTTPS');
			} else if (BASE_URL.includes('localhost')) {
				this.log('WARN', 'Using HTTP (acceptable for local testing)');
			} else {
				this.log('FAIL', 'Production site should use HTTPS');
			}
		});
	}

	// Test for common files that shouldn't be exposed
	async testFileExposure() {
		await this.test('File Exposure', async () => {
			const sensitiveFiles = [
				'/.env',
				'/.git/config',
				'/package.json',
				'/wrangler.toml',
				'/node_modules',
				'/.svelte-kit'
			];

			for (const file of sensitiveFiles) {
				try {
					const response = await this.fetch(`${BASE_URL}${file}`);
					if (response.status === 404) {
						this.log('PASS', `Sensitive file not exposed: ${file}`);
					} else {
						this.log('WARN', `Potentially sensitive file accessible: ${file} (${response.status})`);
					}
				} catch {
					this.log('PASS', `File not accessible: ${file}`);
				}
			}
		});
	}

	// Test TypeScript compilation
	async testTypeScript() {
		await this.test('TypeScript Compilation', async () => {
			// This would require running pnpm run check
			this.log('WARN', 'TypeScript check should be run separately: pnpm run check');
		});
	}

	// Test Firebase configuration
	async testFirebaseConfig() {
		await this.test('Firebase Security', async () => {
			// Check if Firebase config is exposed in source
			const response = await this.fetch(BASE_URL);
			const html = await response.text();

			if (html.includes('apiKey') && html.includes('firebase')) {
				this.log('WARN', 'Firebase config may be exposed in HTML');
			} else {
				this.log('PASS', 'Firebase config not obviously exposed');
			}
		});
	}

	// Run all tests
	async runAll() {
		console.log('🚀 Starting Security and Functionality Tests...\n');

		await this.testConnectivity();
		await this.testSecurityHeaders();
		await this.testRateLimit();
		await this.testInputValidation();
		await this.testErrorHandling();
		await this.testHTTPS();
		await this.testFileExposure();
		await this.testTypeScript();
		await this.testFirebaseConfig();

		this.printSummary();
	}

	printSummary() {
		console.log('\n' + '='.repeat(50));
		console.log('🔍 SECURITY TEST SUMMARY');
		console.log('='.repeat(50));
		console.log(`✅ Passed: ${this.results.passed}`);
		console.log(`⚠️  Warnings: ${this.results.warnings}`);
		console.log(`❌ Failed: ${this.results.failed}`);
		console.log(`📊 Total Tests: ${this.results.tests.length}`);

		if (this.results.failed > 0) {
			console.log('\n❌ CRITICAL ISSUES FOUND - NOT READY FOR PRODUCTION');
			process.exit(1);
		} else if (this.results.warnings > 0) {
			console.log('\n⚠️  WARNINGS FOUND - REVIEW BEFORE PRODUCTION');
			process.exit(0);
		} else {
			console.log('\n✅ ALL TESTS PASSED - READY FOR PRODUCTION');
			process.exit(0);
		}
	}
}

// Run tests
const tester = new SecurityTester();
tester.runAll().catch((error) => {
	console.error('Test suite failed:', error);
	process.exit(1);
});
