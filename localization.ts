import PkBase from "./pkbase";

var forms6 = require("./localization/forms6.json"),
    forms7 = require("./localization/forms7.json"),
    locations = require("./localization/locations.json"),
    characteristics = require("./localization/characteristics.json"),
    ribbons = require("./localization/ribbons.json"),
    abilities = require("./localization/abilities.json"),
    items = require("./localization/items.json"),
    species = require("./localization/species.json"),
    moves = require("./localization/moves.json"),
    games = require("./localization/games.json"),
    types = require("./localization/types.json"),
    natures = require("./localization/natures.json"),
    countries = require("./localization/countries.json"),
    languageTags = require("./localization/languageTags.json"),
    regions = require("./localization/regions.json");

var langs = ["de", "en", "es", "fr", "it", "ja", "ko", "zh"];

export interface LocalizationLanguage {
    abilities: string[];
    countries: string[];
    forms6: string[][];
    forms7: string[][];
    games: string[];
    items: string[];
    languageTags: string[];
    moves: string[];
    natures: string[];
    regions: string[];
    species: string[];
    types: string[];

    getLocation(pkm: PkBase): string;
    getLocation(gameVersion: number, location: number): string;
    getEggLocation(pkm: PkBase): string;
    getRibbons(pkm: PkBase): string[];
    getBallName(ball: number): string;
    getCharacteristic(pkm: PkBase): string;
}

export interface Localization {
    de: LocalizationLanguage;
    en: LocalizationLanguage;
    es: LocalizationLanguage;
    fr: LocalizationLanguage;
    it: LocalizationLanguage;
    ja: LocalizationLanguage;
    ko: LocalizationLanguage;
    [lang: string]: LocalizationLanguage;
}

var names: Localization = <any>{};

for (var i = 0; i < langs.length; ++i) {
    var lang = names[langs[i]] = <any>{};

    lang.forms6 = forms6[langs[i]];
    lang.forms7 = forms7[langs[i]];
    lang.abilities = abilities[langs[i]];
    lang.items = items[langs[i]];
    lang.moves = moves[langs[i]];
    lang.species = species[langs[i]];
    lang.moves = moves[langs[i]];
    lang.games = games[langs[i]];
    lang.types = types[langs[i]];
    lang.natures = natures[langs[i]];
    lang.countries = countries[langs[i]];
    lang.languageTags = languageTags[langs[i]];
    lang.regions = regions[langs[i]];

    lang.getLocation = (function(lang) {
        return function(originGame, location) {
            if (location === undefined) {
                if (originGame.metLocation && originGame.gameVersion && originGame.eggLocation !== undefined) {
                    location = originGame.metLocation;
                    originGame = originGame.gameVersion;
                }
                else {
                    return "";
                }
            }
            if (originGame < 24) {
                return locations[lang].bw2[location];
            }
            if (originGame > 23) {
                return locations[lang].xy[location];
            }
            if (originGame > 27) {
                return locations[lang].sm[location];
            }
        };
    })(langs[i]);

    lang.getEggLocation = (function(lang) {
        return function(pkm) {
            if (pkm.eggLocation === undefined || pkm.gameVersion === undefined)
                return "";
            return lang.getLocation(pkm.gameVersion, pkm.eggLocation);
        }
    })(lang);

    lang.getRibbons = (function(lang) {
        var ribbonNames = ribbons[lang];
        return function(pkx) {
            var res = [];

            for (var i = 0; i < 4; ++i) {
                var names = ribbonNames[i];
                var ribbonSet = [pkx.ribbonSet1, pkx.ribbonSet2, pkx.ribbonSet3, pkx.ribbonSet4][i];

                for (var j = 0; ribbonSet > 0; ++j, ribbonSet >>= 1) {
                    if (ribbonSet & 1) {
                        res.push(names[j]);
                    }
                }
            }

            return res;
        }
    })(langs[i]);

    lang.getBallName = (function(lang) {
        return function(ball) {
            var ballToItem = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 492, 493, 494, 495, 496, 497, 498, 499, 576];

            return lang.items[ballToItem[ball]];
        };
    })(lang);

    lang.getCharacteristic = (function(lang) {
        return function(pkx: PkBase) {
            const ivs = [pkx.ivHp, pkx.ivAtk, pkx.ivDef, pkx.ivSpe, pkx.ivSpAtk, pkx.ivSpDef];
            const max = Math.max.apply(Math, ivs);
            const maxVals = ivs.map(iv => iv === max ? max : undefined);

            for (let index = pkx.pid % 6;; index = (index + 1) % 6) {
                if (maxVals[index] !== undefined) {
                    return characteristics[lang][index][max % 5];
                }
            }
        }
    })(langs[i]);
}

export var de = names["de"];
export var en = names["en"];
export var es = names["es"];
export var fr = names["fr"];
export var it = names["it"];
export var ja = names["ja"];
export var ko = names["ko"];
export default names;
