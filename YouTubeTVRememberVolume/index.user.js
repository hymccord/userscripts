// ==UserScript==
// @name         YouTube TV Remember Volume
// @namespace    https://www.github.com/InKahootz
// @version      1.0
// @description  Remember YouTube TV volume between visits/refreshes
// @author       InKahootz
// @match        https://tv.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @downloadURL  https://github.com/InKahootz/userscripts/raw/main/YouTubeTVRememberVolume/index.user.js
// @updateURL    https://github.com/InKahootz/userscripts/raw/main/YouTubeTVRememberVolume/index.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    var RETRY_DELAY_IN_MS = 100;

    function getElement(query, callback) {
        var element = document.querySelector(query);
        if (element === null) {
            // null possible if element not loaded yet, retry with delay
            window.setTimeout(function () {
                getElement(query, callback);
            }, RETRY_DELAY_IN_MS);
        } else {
            callback(element);
        }
    }

    function onElementSourceUpdate(target, callback) {
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                callback();
            });
        });
        observer.observe(target, {attributes: true, attributeFilter: ["src"]});
    }

    function setVolume(volume) {
        getElement("tp-yt-paper-slider", function (slider) {
            getElement("video", function (video) {
                video.addEventListener('volumechange', function(e) {
                    GM_setValue("volume", slider.value);
                }, false);
            });
            slider.value = volume;
        });
    }

    function setPreferredVolume() {
        const preferredVolume = GM_getValue("volume", 50);
        setVolume(preferredVolume);
    }

    function main(){
        setPreferredVolume();

        getElement("video", function (video) {
            onElementSourceUpdate(video, function () {
                setPreferredVolume();
            });
        });
    };

    main();
})();