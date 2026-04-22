const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'public/css/style.css',
    'views/pages/onboarding.ejs',
    'views/pages/errors/403.ejs',
    'views/pages/errors/404.ejs',
    'views/pages/errors/500.ejs',
    'views/pages/error.ejs',
    'views/pages/system-status.ejs',
    'views/pages/testimonies.ejs',
    'views/pages/watch.ejs',
    'views/pages/staff.ejs'
];

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Base brand green
        content = content.replace(/#25D366/g, '#176a60');
        content = content.replace(/#25d366/g, '#176a60');
        
        // Secondary green (used in gradients)
        content = content.replace(/#1eac52/g, '#115048');
        
        // Tailwind greens (used for hover/borders)
        content = content.replace(/#22c55e/g, '#176a60');
        content = content.replace(/#166534/g, '#0e423c'); // dark green
        
        // RGBA Tailwind green (34, 197, 94) -> (23, 106, 96)
        content = content.replace(/34, 197, 94/g, '23, 106, 96');
        content = content.replace(/34,\s*197,\s*94/g, '23, 106, 96');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
