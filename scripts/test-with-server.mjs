#!/usr/bin/env node

/**
 * Test runner that starts the preview server, runs security tests, then stops the server
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

const PREVIEW_URL = 'http://localhost:5173';
const MAX_WAIT_TIME = 30000; // 30 seconds
const CHECK_INTERVAL = 1000; // 1 second

let previewProcess = null;

// Cleanup function
function cleanup() {
	if (previewProcess) {
		console.log('🛑 Stopping preview server...');
		previewProcess.kill('SIGTERM');
		previewProcess = null;
	}
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function waitForServer() {
	console.log('⏳ Waiting for server to start...');
	const startTime = Date.now();

	while (Date.now() - startTime < MAX_WAIT_TIME) {
		try {
			const response = await fetch(PREVIEW_URL, { timeout: 2000 });
			if (response.status === 200) {
				console.log('✅ Server is ready!');
				return true;
			}
		} catch {
			// Server not ready yet, continue waiting
		}
		await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
	}

	throw new Error('Server failed to start within timeout period');
}

async function runTests() {
	return new Promise((resolve, reject) => {
		console.log('🧪 Running security tests...');
		const testProcess = spawn('node', ['scripts/security-test.mjs'], {
			stdio: 'inherit',
			env: { ...process.env, TEST_URL: PREVIEW_URL }
		});

		testProcess.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Security tests failed with exit code ${code}`));
			}
		});

		testProcess.on('error', (error) => {
			reject(error);
		});
	});
}

async function main() {
	try {
		// Start preview server
		console.log('🚀 Starting preview server...');
		previewProcess = spawn('pnpm', ['run', 'preview'], {
			stdio: 'pipe', // Capture output to reduce noise
			env: { ...process.env }
		});

		previewProcess.on('error', (error) => {
			throw new Error(`Failed to start preview server: ${error.message}`);
		});

		// Wait for server to be ready
		await waitForServer();

		// Run security tests
		await runTests();

		console.log('✅ All tests completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Test execution failed:', error.message);
		process.exit(1);
	} finally {
		cleanup();
	}
}

main();
