// Build CSS Tailwind untuk folder hosting/ (jalankan ulang setiap ada class Tailwind baru di HTML/JS):
//   npx tailwindcss@3.4.16 -c tailwind.config.js -i tailwind.input.css -o hosting/css/tailwind.css --minify
module.exports = {
    content: ['./hosting/index.html', './hosting/js/**/*.js'],
};
