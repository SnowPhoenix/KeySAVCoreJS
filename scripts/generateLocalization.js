const path = require('path');
const fs = require('fs');

const languages = ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'zh'];
const pkhexPath = process.argv[2];
const textPath = path.join(pkhexPath, 'PKHeX', 'Resources', 'text');
const localPath = path.join(__dirname, '..', 'localization');

function generateBase(sourceName, destName) {
    const data = {};
    for (const lang of languages) {
        data[lang] = fs.readFileSync(path.join(textPath, lang, `text_${sourceName}_${lang}.txt`), 'utf-8').split(/\r?\n/);
    }
    fs.writeFileSync(path.join(localPath, destName + '.json'), JSON.stringify(data, null, 4), 'utf-8');
}

function generateSpecies() {
    generateBase('Species', 'species');
}

function generateItems() {
    generateBase('Items', 'items');
}

function generateAbilities() {
    generateBase('Abilities', 'abilities');
}

function generateMoves() {
    generateBase('Moves', 'moves');
}

function generateNatures() {
    generateBase('Natures', 'natures');
}

function generateTypes() {
    generateBase('Types', 'types');
}

function generateGames() {
    generateBase('Games', 'games');
}

function generateCharacteristics() {
    const data = {};
    for (const lang of languages) {
        const lines = fs.readFileSync(path.join(textPath, lang, `text_Character_${lang}.txt`), 'utf-8').split(/\r?\n/);
        const langData = [];
        for (let i = 0; i < lines.length; i += 5) {
            langData.push(lines.slice(i, i + 5));
        }
        data[lang] = langData;
    }
    fs.writeFileSync(path.join(localPath, 'characteristics.json'), JSON.stringify(data, null, 4), 'utf-8');
}

const languagesInLocale = ['ja', 'en', 'fr', 'de', 'it', 'es', 'zh', 'ko'];

function generateCountries() {
    const lines = fs.readFileSync(path.join(textPath, 'locale', 'countries.txt'), 'ucs2').split(/\r?\n/).map(l => l.split(/,/)).slice(1);
    const res = {};
    for (let i = 0; i < languagesInLocale.length; ++i) {
        const lang = languagesInLocale[i];
        const langData = res[lang] = [];
        for (const line of lines) {
            langData[line[0]] = line[i + 1];
        }
    }
    fs.writeFileSync(path.join(localPath, 'countries.json'), JSON.stringify(res, null, 4), 'utf-8');
}

function generateAll() {
    generateSpecies();
    generateItems();
    generateAbilities();
    generateMoves();
    generateNatures();
    generateTypes();
    generateGames();
    generateCharacteristics();
    generateCountries();
}

if (!module.parent) {
    generateAll();
}
