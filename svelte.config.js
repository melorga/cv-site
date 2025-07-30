import adapter from '@sveltejs/adapter-cloudflare';
export default {
  kit: { adapter: adapter({ platform: 'pages', routes: { include: ['/*'], exclude: ['<all>'] } }) }
};
