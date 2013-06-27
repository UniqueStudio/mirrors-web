normaliseLang = function(lang) {
    lang = lang.replace(/_/, '-').toLowerCase();
    if (lang.length > 3) {
        lang = lang.substring(0, 3) + lang.substring(3).toUpperCase();
    }
    return lang;
};

defaultLanguage = normaliseLang(navigator.language || navigator.userLanguage);
