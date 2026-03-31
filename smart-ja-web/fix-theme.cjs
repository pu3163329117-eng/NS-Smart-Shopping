const fs = require('fs');

function fixTheme(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    
    let c = fs.readFileSync(filePath, 'utf8');

    // Prevent double replacements by temporarily masking existing dark: classes
    c = c.replace(/dark:text-white/g, '__DARK_TEXT_WHITE__');
    c = c.replace(/dark:bg-black/g, '__DARK_BG_BLACK__');
    c = c.replace(/dark:text-slate-[0-9]+/g, '__DARK_TEXT_SLATE__');
    
    // Background replacements for primary containers
    c = c.replace(/\bbg-black\b/g, 'bg-slate-50 dark:bg-black');
    c = c.replace(/\bbg-\[\#060608\]/g, 'bg-slate-50 dark:bg-[#060608]');
    c = c.replace(/\bbg-\[\#0a0a0c\]/g, 'bg-white dark:bg-[#0a0a0c]');
    c = c.replace(/\bbg-\[\#121212\]/g, 'bg-white dark:bg-[#121212]');
    
    // Text replacements
    c = c.replace(/\btext-white(?!\/)\b/g, 'text-slate-900 dark:text-white');
    c = c.replace(/\btext-white\/45\b/g, 'text-slate-500 dark:text-white/45');
    c = c.replace(/\btext-white\/65\b/g, 'text-slate-600 dark:text-white/65');
    c = c.replace(/\btext-white\/35\b/g, 'text-slate-400 dark:text-white/35');
    c = c.replace(/\btext-white\/28\b/g, 'text-slate-400 dark:text-white/28');
    c = c.replace(/\btext-white\/52\b/g, 'text-slate-500 dark:text-white/52');
    c = c.replace(/\btext-white\/75\b/g, 'text-slate-700 dark:text-white/75');
    c = c.replace(/\btext-white\/80\b/g, 'text-slate-800 dark:text-white/80');
    
    // General text-white/XX catch-all for remaining
    c = c.replace(/\btext-white\/([0-9]+)\b/g, 'text-slate-600 dark:text-white/$1');
    
    // Border replacements
    c = c.replace(/\bborder-white\/([0-9]+)\b/g, 'border-slate-200 dark:border-white/$1');
    c = c.replace(/\bborder-white\/\[0\.0[0-9]+\]\b/g, 'border-slate-200 dark:border-white/10');
    
    // General background translucents
    c = c.replace(/\bbg-black\/20\b/g, 'bg-slate-100 dark:bg-black/20');
    c = c.replace(/\bbg-black\/70\b/g, 'bg-slate-900/40 dark:bg-black/70');
    c = c.replace(/\bbg-white\/\[0\.02\]/g, 'bg-slate-50 dark:bg-white/[0.02]');
    c = c.replace(/\bbg-white\/\[0\.03\]/g, 'bg-slate-50 dark:bg-white/[0.03]');
    c = c.replace(/\bbg-white\/\[0\.04\]/g, 'bg-slate-100 dark:bg-white/[0.04]');
    c = c.replace(/\bbg-white\/\[0\.06\]/g, 'bg-slate-100 dark:bg-white/[0.06]');
    c = c.replace(/\bbg-white\/\[0\.08\]/g, 'bg-slate-200 dark:bg-white/[0.08]');
    c = c.replace(/\bbg-white\/\[0\.10\]/g, 'bg-slate-200 dark:bg-white/[0.10]');
    
    // Unmask
    c = c.replace(/__DARK_TEXT_WHITE__/g, 'dark:text-white');
    c = c.replace(/__DARK_BG_BLACK__/g, 'dark:bg-black');
    c = c.replace(/__DARK_TEXT_SLATE__/g, 'dark:text-slate-400');

    fs.writeFileSync(filePath, c);
    console.log(`Processed: ${filePath}`);
}

const targetFiles = [
    'f:/JA/smart-ja-web/src/views/GushiOrderDetail.vue',
    'f:/JA/smart-ja-web/src/components/CartDrawer.vue',
    'f:/JA/smart-ja-web/src/views/Login.vue'
];

targetFiles.forEach(fixTheme);
console.log('Done!');
