/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-orange': '#FF9900',
                'brand-teal': '#3D8593',
                'brand-bg': '#FDFBFA',
            },
        },
    },
    plugins: [],
}
