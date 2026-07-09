module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 30px 60px rgba(15, 23, 42, 0.12)',
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.15), transparent 36%), radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.12), transparent 28%)',
      },
    },
  },
  plugins: [],
};
