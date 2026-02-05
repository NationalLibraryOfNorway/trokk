/** @type {import("tailwindcss").Config} */
const config = {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}'
    ],
    safelist: [
        {pattern: /grid-cols-(1|2|3|4|5|6|7|8|9|10)/},
    ],
    theme: {
    	extend: {
    		colors: {
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			border: 'hsl(var(--border))',
    		}
    	}
    },
    plugins: [require('tailwindcss-animate')]
};
export default config;
