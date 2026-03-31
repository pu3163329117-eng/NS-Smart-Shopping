const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const zhPath = path.join(__dirname, 'src/locales/zh.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

// Get all Vue and JSON files
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.vue') || file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, file)); // Windows formatting fine
            }
        }
    });

    return arrayOfFiles;
}

const allVueFiles = getAllFiles(srcDir);
const translationKeys = new Set();
const regex = /\$t\(\s*['"]([^'"]+)['"]\)/g;

allVueFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        translationKeys.add(match[1]);
    }
});

// Helper to set nested key
function setNestedKey(obj, keyPath, defaultValue) {
    const keys = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    const finalKey = keys[keys.length - 1];
    if (current[finalKey] === undefined) {
        current[finalKey] = defaultValue;
        return true;
    }
    return false;
}

const zhJson = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));

let added = 0;
translationKeys.forEach(key => {
    if (setNestedKey(zhJson, key, 'MISSING_ZH_' + key)) added++;
    setNestedKey(enJson, key, 'MISSING_EN_' + key);
});

if (added > 0) {
    fs.writeFileSync(zhPath, JSON.stringify(zhJson, null, 2));
    fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2));
    console.log(`Updated locales with ${added} new missing keys!`);
} else {
    console.log(`No new keys found.`);
}

console.log('Total unique keys extracted:', translationKeys.size);
