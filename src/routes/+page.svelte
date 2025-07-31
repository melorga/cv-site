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
  
  // UI state
  let isDarkMode = false;
  let isHighContrast = false;
  let isTyping = false;
  
  // Theme toggle functions
  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDarkMode);
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }
  }
  
  function toggleHighContrast() {
    isHighContrast = !isHighContrast;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('high-contrast', isHighContrast);
      localStorage.setItem('highContrast', isHighContrast.toString());
    }
  }
  
  // Initialize theme from localStorage
  function initializeTheme() {
    if (typeof document !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const savedContrast = localStorage.getItem('highContrast');
      
      if (savedTheme === 'dark') {
        isDarkMode = true;
        document.documentElement.classList.add('dark');
      }
      
      if (savedContrast === 'true') {
        isHighContrast = true;
        document.body.classList.add('high-contrast');
      }
    }
  }

  onMount(async () => {
    // Initialize theme first
    initializeTheme();
    
    try {
      console.log('🔄 Initializing Firebase...');
      await initFirebase();
      auth = getFirebaseAuth();
      console.log('✅ Firebase initialized successfully');
      
      // Listen for auth state changes
      const { onAuthStateChanged } = await import('firebase/auth');
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('🔄 Auth state changed:', firebaseUser ? `logged in as ${firebaseUser.email}` : 'logged out');
        
        if (firebaseUser) {
          user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          };
          initializeChat();
        } else {
          user = null;
          chatHistory = [];
        }
        
        isInitializing = false;
        firebaseError = null;
      }, (error) => {
        console.error('❌ Auth state change error:', error);
        firebaseError = `Authentication error: ${error.message}`;
        isInitializing = false;
      });
      
      // Store unsubscribe function for cleanup
      return () => {
        if (unsubscribe) unsubscribe();
      };
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      
      if (error.message === 'DEV_MODE_NO_FIREBASE') {
        console.log('🚧 Running in development mode without Firebase');
        // Set development mode - no Firebase, direct to chat
        firebaseError = null;
        user = { 
          uid: 'dev-user', 
          email: 'dev@mariano.ai',
          displayName: 'Development User',
          photoURL: null,
          emailVerified: true
        };
        initializeChat();
        isInitializing = false;
      } else {
        // Real Firebase error
        firebaseError = `Failed to initialize authentication: ${error.message}`;
        isInitializing = false;
      }
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
          sitekey: import.meta.env.VITE_TURNSTILE_SITEKEY || '0x4AAAAAAA3bU_TJuFdz5kJb',
          theme: isDarkMode ? 'dark' : 'light',
          callback: (token) => {
            turnstileToken = token;
            console.log('✅ Turnstile token received');
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

<main class="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-matrix-darker dark:via-matrix-dark dark:to-gray-900 flex flex-col justify-center items-center p-4 transition-all duration-500">
  <!-- 3D Animated Background -->
  <div class="absolute inset-0 overflow-hidden">
    <!-- Floating geometric shapes -->
    <div class="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 rounded-3xl animate-float transform rotate-45 dark:from-neon-blue/10 dark:to-neon-purple/10"></div>
    <div class="absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-neon-green/20 to-neon-blue/20 rounded-full animate-float transform" style="animation-delay: 2s;"></div>
    <div class="absolute bottom-32 left-40 w-20 h-20 bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 rounded-2xl animate-float transform rotate-12" style="animation-delay: 4s;"></div>
    <div class="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-r from-neon-pink/20 to-neon-blue/20 rounded-full animate-float transform" style="animation-delay: 6s;"></div>
    
    <!-- Neural network lines -->
    <svg class="absolute inset-0 w-full h-full opacity-10 dark:opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#00D4FF;stop-opacity:0.6" />
          <stop offset="50%" style="stop-color:#9D4EDD;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#39FF14;stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <g stroke="url(#neuralGradient)" stroke-width="2" fill="none">
        <path d="M100,200 Q300,100 500,200 T900,200" opacity="0.6">
          <animate attributeName="d" dur="8s" repeatCount="indefinite" values="M100,200 Q300,100 500,200 T900,200;M100,200 Q300,300 500,200 T900,200;M100,200 Q300,100 500,200 T900,200" />
        </path>
        <path d="M200,100 Q400,300 600,100 T1000,100" opacity="0.4">
          <animate attributeName="d" dur="10s" repeatCount="indefinite" values="M200,100 Q400,300 600,100 T1000,100;M200,100 Q400,50 600,100 T1000,100;M200,100 Q400,300 600,100 T1000,100" />
        </path>
        <path d="M50,300 Q250,200 450,300 T850,300" opacity="0.3">
          <animate attributeName="d" dur="12s" repeatCount="indefinite" values="M50,300 Q250,200 450,300 T850,300;M50,300 Q250,400 450,300 T850,300;M50,300 Q250,200 450,300 T850,300" />
        </path>
      </g>
      <!-- Neural nodes -->
      <g fill="url(#neuralGradient)">
        <circle cx="300" cy="150" r="4" opacity="0.8">
          <animate attributeName="r" dur="3s" repeatCount="indefinite" values="4;8;4" />
        </circle>
        <circle cx="500" cy="250" r="3" opacity="0.6">
          <animate attributeName="r" dur="4s" repeatCount="indefinite" values="3;6;3" />
        </circle>
        <circle cx="700" cy="180" r="5" opacity="0.7">
          <animate attributeName="r" dur="5s" repeatCount="indefinite" values="5;10;5" />
        </circle>
      </g>
    </svg>
  </div>

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
    <div class="relative w-full max-w-5xl h-[88vh] flex flex-col glass-dark rounded-3xl shadow-2xl overflow-hidden border border-neon-blue/20 transition-all duration-500 transform-3d hover:rotate-x-12">
      <header class="relative bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-indigo-900/95 dark:from-matrix-darker/95 dark:via-matrix-dark/95 dark:to-gray-900/95 text-white p-8 flex justify-between items-center shadow-2xl backdrop-blur-xl border-b border-neon-blue/30">
        <div class="flex items-center space-x-6 z-10">
          <!-- Sophisticated 3D Icon -->
          <div class="relative w-16 h-16 transform-3d group">
            <div class="absolute inset-0 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl rotate-45 transform group-hover:rotate-[225deg] transition-transform duration-700 animate-glow"></div>
            <div class="absolute inset-2 bg-slate-900 rounded-xl flex items-center justify-center">
              <svg class="w-8 h-8 text-neon-blue animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                <circle cx="12" cy="9" r="1" fill="currentColor"/>
                <circle cx="8" cy="9" r="1" fill="currentColor"/>
                <circle cx="16" cy="9" r="1" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <div>
            <h1 class="text-4xl font-black font-display tracking-tight neon-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent">MARIANO.AI</h1>
            <p class="text-sm opacity-80 font-mono text-neon-blue tracking-wider">[v0.06]</p>
          </div>
        </div>
        <div class="flex items-center space-x-4 z-10">
          <button on:click={toggleHighContrast} 
                  aria-label="Toggle high contrast mode"
                  class="p-3 rounded-2xl bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 hover:from-neon-purple/40 hover:to-neon-pink/40 transition-all duration-300 transform hover:scale-110 border border-neon-purple/30">
            <svg class="w-5 h-5 text-neon-purple" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L3 7v11h5v-6h4v6h5V7l-7-5zM8 15H5v-2h3v2zm0-4H5V9h3v2zm7 4h-3v-2h3v2zm0-4h-3V9h3v2z"/>
            </svg>
          </button>
          <button on:click={toggleDarkMode} 
                  aria-label="Toggle dark mode"
                  class="p-3 rounded-2xl bg-gradient-to-r from-neon-blue/20 to-neon-green/20 hover:from-neon-blue/40 hover:to-neon-green/40 transition-all duration-300 transform hover:scale-110 border border-neon-blue/30">
            <svg class="w-5 h-5 text-neon-blue" fill="currentColor" viewBox="0 0 20 20">
              {#if isDarkMode}
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
              {:else}
                <path d="M17.293 13.293A8 8 0 716.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              {/if}
            </svg>
          </button>
          <button on:click={handleLogout} 
                  class="px-6 py-3 text-sm font-mono font-bold bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/40 hover:to-red-600/40 rounded-2xl transition-all duration-300 transform hover:scale-105 border border-red-500/30 text-red-400">
            [DISCONNECT]
          </button>
        </div>
        <!-- Matrix-style background -->
        <div class="absolute inset-0 opacity-5">
          <div class="absolute top-4 left-4 font-mono text-xs text-neon-green animate-pulse">01010011 01101111 01101100</div>
          <div class="absolute top-8 right-8 font-mono text-xs text-neon-blue animate-pulse" style="animation-delay: 1s;">11100101 01011010</div>
          <div class="absolute bottom-4 left-8 font-mono text-xs text-neon-purple animate-pulse" style="animation-delay: 2s;">01000001 01001001</div>
        </div>
      </header>

<div class="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar bg-gradient-to-b from-transparent via-slate-50/5 to-transparent dark:via-gray-900/20 flex-grow h-full">
        {#each chatHistory as entry}
          <div class={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'} transform transition-all duration-300 hover:scale-[1.02]`}>
            {#if entry.role === 'user'}
              <div class="max-w-2xl px-6 py-4 rounded-2xl shadow-lg bg-gradient-to-r from-neon-blue/90 to-neon-purple/90 text-white border-neon-blue/30 backdrop-blur-sm">
                <p class="font-medium leading-relaxed">{entry.message}</p>
                <span class="text-xs text-white/70 block text-right mt-2 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
            {:else}
              <div class="max-w-2xl px-6 py-4 rounded-2xl shadow-lg glass-dark border border-neon-green/20 text-gray-100 dark:text-gray-200">
                <div class="flex items-start space-x-3">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center flex-shrink-0 mt-1">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="font-medium leading-relaxed text-gray-100 dark:text-gray-200">{entry.message}</p>
                    <span class="text-xs text-neon-green/80 block mt-2 font-mono">[AI_RESPONSE] {new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
        {#if isLoading}
          <div class="flex justify-start">
            <div class="max-w-2xl px-6 py-4 rounded-2xl shadow-lg glass-dark border border-neon-green/20 text-gray-100 dark:text-gray-200">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center animate-spin">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </div>
                <div class="flex space-x-1">
                  <div class="w-2 h-2 bg-neon-green rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
                  <div class="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
                </div>
                <span class="text-neon-green font-mono text-sm">[PROCESSING...]</span>
              </div>
            </div>
          </div>
        {/if}
        {#if chatError}
          <div class="flex justify-center">
            <div class="px-6 py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl">
              <p class="text-red-400 text-sm font-mono">[ERROR] {chatError}</p>
            </div>
          </div>
        {/if}
      </div>

<footer class="bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-indigo-900/95 dark:from-matrix-darker/95 dark:via-matrix-dark/95 dark:to-gray-900/95 p-6 border-t border-neon-blue/30 backdrop-blur-xl mt-auto">
        <div class="flex items-center space-x-4">
          <div class="flex-1 relative">
            <textarea bind:value={chatMessage} 
                      on:keypress={handleKeyPress}
                      placeholder="> Enter your query..."
                      class="w-full px-6 py-4 bg-slate-800/50 dark:bg-matrix-dark/50 border border-neon-blue/30 rounded-2xl shadow-lg text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all duration-300 font-mono backdrop-blur-sm"
                      rows="1"></textarea>
            <div class="absolute bottom-2 right-2 text-xs text-gray-500 font-mono"></div>
          </div>
          <button on:click={sendChat} 
                  disabled={!chatMessage.trim()}
                  class="px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-purple hover:to-neon-pink disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 border-neon-blue/30 font-mono">
            {#if isLoading}
              [SENDING...]
            {:else}
              [TRANSMIT]
            {/if}
          </button>
        </div>
      </footer>
    </div>
    
  <!-- Logged Out View: Authentication Form -->
  {:else}
    <div class="relative w-full max-w-lg glass-dark rounded-3xl shadow-2xl p-10 space-y-8 border border-neon-blue/20 backdrop-blur-xl">
      <!-- Header with sophisticated branding -->
      <div class="text-center space-y-4">
        <div class="flex justify-center">
          <div class="relative w-20 h-20 transform-3d group">
            <div class="absolute inset-0 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl rotate-45 transform group-hover:rotate-[225deg] transition-transform duration-700 animate-glow"></div>
            <div class="absolute inset-2 bg-slate-900 rounded-xl flex items-center justify-center">
              <svg class="w-10 h-10 text-neon-blue animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
          </div>
        </div>
        <h1 class="text-4xl font-black font-display tracking-tight neon-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent">ACCESS_CONTROL</h1>
        <p class="text-gray-300 font-mono text-sm tracking-wider">[AUTHENTICATION_REQUIRED]</p>
        <div class="w-24 h-px bg-gradient-to-r from-transparent via-neon-blue to-transparent mx-auto"></div>
      </div>

      <form on:submit={handleAuth} class="space-y-6">
        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-mono font-medium text-neon-blue mb-2">[EMAIL_ADDRESS]</label>
            <input type="email" id="email" bind:value={email} required 
                   class="w-full px-6 py-4 bg-slate-800/50 dark:bg-matrix-dark/50 border border-neon-blue/30 rounded-2xl shadow-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all duration-300 font-mono backdrop-blur-sm" 
                   placeholder="user@domain.com" />
          </div>

          <div>
            <label for="password" class="block text-sm font-mono font-medium text-neon-purple mb-2">[PASSWORD]</label>
            <input type="password" id="password" bind:value={password} required 
                   class="w-full px-6 py-4 bg-slate-800/50 dark:bg-matrix-dark/50 border border-neon-purple/30 rounded-2xl shadow-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent transition-all duration-300 font-mono backdrop-blur-sm" 
                   placeholder="••••••••" />
          </div>
        </div>

        <div id="turnstile-widget" class="flex justify-center py-4"></div>

        {#if authError}
          <div class="p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl">
            <p class="text-red-400 text-sm font-mono text-center">[AUTH_ERROR] {authError}</p>
          </div>
        {/if}

        <button type="submit" 
                disabled={authLoading} 
                class="w-full py-4 px-6 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-purple hover:to-neon-pink disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 border border-neon-blue/30 font-mono">
          {#if authLoading}
            <div class="flex items-center justify-center space-x-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>[AUTHENTICATING...]</span>
            </div>
          {:else}
            [{isLogin ? 'AUTHENTICATE' : 'REGISTER'}]
          {/if}
        </button>
      </form>
      
      <div class="text-center">
        <div class="w-32 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent mx-auto mb-4"></div>
        <p class="text-gray-400 text-sm font-mono">
          {isLogin ? '[NO_ACCOUNT?]' : '[EXISTING_USER?]'}
        </p>
        <button on:click={() => { isLogin = !isLogin; authError = ''; }} 
                class="mt-2 text-neon-green hover:text-neon-blue transition-colors duration-300 font-mono font-bold">
          [{isLogin ? 'CREATE_ACCOUNT' : 'LOGIN_INSTEAD'}]
        </button>
      </div>
    </div>
  {/if}

</main>
