// ==UserScript==
// @name         Logarithmic Volume
// @namespace    https://github.com/InKahootz
// @version      1.0
// @description  Makes most volume slider exponential so it's easier to select lower volumes. Add user excludes if your media player already supports it (e.g jellyfin).
// @author       Hank McCord
// @downloadURL  https://raw.githubusercontent.com/InKahootz/userscripts/main/logarithmicvolume/index.user.js
// @icon         https://github.com/InKahootz/userscripts/raw/main/LogarithmicVolume/icon.png
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // https://www.dr-lex.be/info-stuff/volumecontrols.html
    /* Dynamic range | a | b | Approximation * /
    /* 50 dB */
    const a = 3.1623e-3; const b = 5.757; /* x3 */
    /* 60 dB */
    // const a = 1e-3; const b = 6.908; /* x4 */
    /* 70 dB */
    // const a = 3.1623e-4; const b = 8.059; /* x5 */
    /* 80 dB */
    // const a = 1e-4; const b = 9.210; /* x6 */
    /* 90 dB */
    // const a = 3.1623e-5; const b = 10.36; /* x6 */
    /* 100 dB */
    // const a = 1e-5; const b = 11.51; /* x7 */

    const storedOriginalVolumes = new WeakMap();
    const {get, set} = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
        get () {
            const lowVolume = get.call(this);
            const calculatedOriginalVolume = Math.log(lowVolume / a) / b

            // The calculated value has some accuracy issues which can lead to problems for implementations that expect exact values.
            // To avoid this, I'll store the unmodified volume to return it when read here.
            // This mostly solves the issue, but the initial read has no stored value and the volume can also change though external influences.
            // To avoid ill effects, I check if the stored volume is somewhere in the same range as the calculated volume.
            const storedOriginalVolume = storedOriginalVolumes.get(this);
            const storedDeviation = Math.abs(storedOriginalVolume - calculatedOriginalVolume);

            const originalVolume = storedDeviation < 0.01 ? storedOriginalVolume : calculatedOriginalVolume;
            //console.log('manipulated volume from', lowVolume.toFixed(2), 'to  ', originalVolume.toFixed(2), storedDeviation);
            return originalVolume;
        },
        set (originalVolume) {
            // Some sites' players mess up when a value > 1 is returned.
            const adjustedVol = Math.min(a * Math.exp(b * originalVolume), 1);
            storedOriginalVolumes.set(this, originalVolume);
            //console.log('manipulated volume to  ', adjustedVol.toFixed(10), 'from', originalVolume.toFixed(2));

            if (adjustedVol < 0.005)
            {
                set.call(this, 0);
            }
            else
            {
                set.call(this, adjustedVol);
            }
        }
    });
})();