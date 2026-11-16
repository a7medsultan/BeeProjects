import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in Svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			csp: isProduction
				? {
						mode: 'auto',
						directives: {
							'default-src': ['self'],
							'script-src': ['self'],
							'style-src': ['self', 'unsafe-inline'],
							'img-src': ['self', 'data:'],
							'font-src': ['self'],
							'connect-src': ['self'],
							'object-src': ['none'],
							'base-uri': ['self'],
							'frame-ancestors': ['none'],
							'form-action': ['self']
						}
					}
				: undefined
		})
	]
});
