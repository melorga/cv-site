<script>
  import { onMount } from 'svelte';
  import { initFirebase, getFirebaseAuth } from '$lib/firebase';

  // Authentication state
  let user = null;
  let isInitializing = true;
  let auth;
  let firebaseError = null;
  
  // Form state
  let email = '';
  let password = '';
  let isLogin = true; // Toggle between login and register
  let authError = '';
  let authLoading = false;
  
  // Chat state
  let chatMessage = '';
  let chatHistory = [];
  let turnstileToken = '';
  let chatError = '';
  let isLoading = false;
  let turnstileLoaded = false;

  onMount(async () => {
    try {
      console.log('Attempting Firebase initialization...');
      await initFirebase();
      auth = getFirebaseAuth();
      console.log('Firebase initialized successfully');
      
      // Listen for auth state changes
      const { onAuthStateChanged } = await import('firebase/auth');
      onAuthStateChanged(auth, (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser ? 'logged in' : 'logged out');
        if (firebaseUser) {
          user = firebaseUser;
          initializeChat();
        } else {
          user = null;
        }
        isInitializing = false;
      });
      
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      console.log('Continuing in development mode without Firebase authentication');
      
      // Set development mode - no Firebase, direct to chat
      firebaseError = null;
      user = { email: 'dev@example.com', uid: 'dev-user' };
      initializeChat();
      isInitializing = false;
    }
    
    // Always load Turnstile regardless of Firebase status
    loadTurnstile();
  });
  
  function setUser(newUser) {
    user = newUser;
    if (user) {
      console.log('User logged in:', user.email);
    }
  }
  
  function initializeChat() {
    // Add welcome message
    chatHistory = [{
      role: 'assistant',
      message: `Hi! I'm an AI assistant trained on Mariano's professional profile and experience. Feel free to ask me anything about his background, skills, projects, or experience you'd like to know more about.`,
      timestamp: new Date()
    }];
  }
  
  function loadTurnstile() {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      turnstileLoaded = true;
      renderTurnstile();
    };
    document.head.appendChild(script);
  }
  
  function renderTurnstile() {
    if (typeof turnstile !== 'undefined' && document.getElementById('turnstile-widget')) {
      try {
        turnstile.render('#turnstile-widget', {
          sitekey: '0x4AAAAAAA3bU_TJuFdz5kJb', // Default test key, replace with your actual key
          theme: 'light',
          callback: (token) => {
            turnstileToken = token;
            console.log('Turnstile token received');
          }
        });
      } catch (e) {
        console.warn('Turnstile render failed:', e);
      }
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    if (!email || !password) {
      authError = 'Please enter both email and password';
      return;
    }
    
    authLoading = true;
    authError = '';
    
    try {
      if (isLogin) {
        // Sign in
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful');
      } else {
        // Sign up
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('Registration successful');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      authError = error.message;
    } finally {
      authLoading = false;
    }
  }
  
  async function handleLogout() {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      chatHistory = [];
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async function sendChat() {
    if (!chatMessage.trim()) return;
    
    // Add user message to history
    const userMessage = {
      role: 'user',
      message: chatMessage,
      timestamp: new Date()
    };
    chatHistory = [...chatHistory, userMessage];
    
    const currentMessage = chatMessage;
    chatMessage = '';
    isLoading = true;
    chatError = '';
    
    try {
      console.log('Sending chat message:', currentMessage);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: currentMessage,
          turnstileToken: turnstileToken
        })
      });
      
      console.log('Chat API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chat API response:', data);
        chatHistory = [...chatHistory, {
          role: 'assistant',
          message: data.response,
          timestamp: new Date()
        }];
      } else {
        const errorData = await response.json();
        console.error('Chat API error:', errorData);
        // Make the error message more descriptive
        const detail = errorData.details || errorData.error || 'Unknown error';
        throw new Error(`API Error (${response.status}): ${detail}`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      chatError = error.message;
      chatHistory = [...chatHistory, {
        role: 'assistant',
        message: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }];
    } finally {
      isLoading = false;
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChat();
    }
  }
</script>

<main class="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">

  <!-- Initializing -->
  {#if isInitializing}
    <div class="text-center">
      <p class="text-lg font-semibold">Initializing...</p>
    </div>
  
  <!-- Firebase Error -->
  {:else if firebaseError}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Initialization Failed!</strong>
      <span class="block sm:inline">{firebaseError}</span>
    </div>

  <!-- Logged In View: Chat Interface -->
  {:else if user}
    <div class="w-full max-w-2xl h-[80vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
      <header class="bg-gray-800 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 class="text-2xl font-bold tracking-wider">AI-Powered CV Assistant</h1>
        <button on:click={handleLogout} class="text-sm text-gray-300 hover:text-white transition-colors">
          Logout
        </button>
      </header>

      <div class="flex-1 p-6 overflow-y-auto space-y-4">
        {#each chatHistory as entry}
          <div class={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div class="max-w-lg px-4 py-2 rounded-xl shadow-md" 
                 class:bg-blue-500={entry.role === 'user'}
                 class:text-white={entry.role === 'user'}
                 class:bg-gray-200={entry.role === 'assistant'}
                 class:text-gray-800={entry.role === 'assistant'}>
              <p>{entry.message}</p>
              <span class="text-xs text-gray-400 block text-right mt-1">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        {/each}
        {#if isLoading}
          <div class="flex justify-start">
            <div class="max-w-lg px-4 py-2 rounded-xl shadow-md bg-gray-200 text-gray-800">
              <p class="animate-pulse">Typing...</p>
            </div>
          </div>
        {/if}
        {#if chatError}
          <p class="text-red-500 text-sm text-center">{chatError}</p>
        {/if}
      </div>

      <footer class="bg-white p-4 border-t border-gray-200 shadow-inner">
        <div class="flex items-center space-x-4">
          <textarea bind:value={chatMessage} 
                    on:keypress={handleKeyPress}
                    placeholder="Ask me anything about my CV..."
                    class="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"></textarea>
          <button on:click={sendChat} 
                  class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200">
            Send
          </button>
        </div>
      </footer>
    </div>
    
  <!-- Logged Out View: Authentication Form -->
  {:else}
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8">
      <h1 class="text-3xl font-bold text-center text-gray-800 tracking-tight">Welcome</h1>
      <p class="text-center text-gray-600">Please {isLogin ? 'log in' : 'sign up'} to continue</p>

      <form on:submit={handleAuth} class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" id="email" bind:value={email} required class="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" id="password" bind:value={password} required class="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div id="turnstile-widget" class="flex justify-center"></div>

        {#if authError}
          <p class="text-red-500 text-sm text-center">{authError}</p>
        {/if}

        <button type="submit" 
                disabled={authLoading} 
                class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50">
          {authLoading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>
      
      <p class="text-center text-sm">
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <button on:click={() => { isLogin = !isLogin; authError = ''; }} class="font-medium text-blue-600 hover:underline">
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  {/if}

</main>
