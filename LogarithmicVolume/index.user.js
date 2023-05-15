// ==UserScript==
// @name         Logarithmic Volume
// @namespace    https://github.com/hymccord
// @version      2.0
// @description  Makes most volume slider exponential so it's easier to select lower volumes. Add user excludes if your media player already supports it (e.g jellyfin).
// @author       Hank McCord
// @downloadURL  https://raw.githubusercontent.com/hymccord/userscripts/main/logarithmicvolume/index.user.js
// @updateURL    https://raw.githubusercontent.com/hymccord/userscripts/main/logarithmicvolume/index.user.js
// @icon         https://github.com/hymccord/userscripts/raw/main/LogarithmicVolume/icon.png
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

const {get, set} = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
    get () {
        const amp = get.call(this);
        return amplitudeToPerceptual(amp);
    },
    set (perceptualVolume) {
        let amp = perceptualToAmplitude(perceptualVolume);

        if (amp < 0.005)
        {
            amp = 0;
        }

        // console.log('manipulated volume to  ', amp.toFixed(10), 'from', perceptualVolume.toFixed(2));

        set.call(this, amp);
    }
});

/*
 * These are utilities to help make our volume controls feel more natural.
 * Our hearing follows a logarithmic scale. We perceive less difference
 * between loud sounds than we do between soft sounds. We want our volume
 * controls to mirror how we perceive sound.
 *
 * In order to make our controls more natural, we'll use an exponential scale.
 * We'll present the user a scale between 0 and 100%, but the percentage is
 * actually selecting a percentage of VOLUME_DYNAMIC_RANGE_DB, which is
 * denominated in decibels. For example, if this range is 60dB, then 50%
 * corresponds to 50% * 60 = 30dB. However, this range is actually -60 to 0,
 * so we subtract 60dB, so 30 - 60 = -30. From here, we just convert decibels
 * to amplitude using an established formula, amplitude = 10 ^ (db /20),
 * so for example 10 ^ (-30/20) = 10 ^ (-1.5) = 0.03. So 50% perceived loudness
 * yields about 3% of the total amplitude.
 *
 * There are two more things to note. First, we tend to express everything as
 * percentages everywhere, so these functions take a percentage in and express
 * a percentage out. So in the previous example, perceptualToAmplitude(50%) = 3%.
 * Second, we allow users to boost the volume of other users, and we use a different
 * scale for perceived > 100%. We scale these to a different "boost" range.
 */

const DEFAULT_VOLUME_DYNAMIC_RANGE_DB = 50;
const DEFAULT_VOLUME_BOOST_DYNAMIC_RANGE_DB = 6;

/*
 * perceptualToAmplitude takes a user-presented control value and converts to amplitude
 * perceptual: Number between 0 and 2 * normalizedMax
 * normalizedMax: Normalization of perceptual value, choose 1 for decimals or 100 for percentages
 * range: Dynamic range of perceptual value from 0 to normalizedMax
 * boostRange: Dynamic range of perceptual value from normalizedMax to 2 * normalizedMax
 * returns: Number between 0 and 2 * normalizedMax
 */
function perceptualToAmplitude(
  perceptual,
  normalizedMax = 1,
  range = DEFAULT_VOLUME_DYNAMIC_RANGE_DB,
  boostRange = DEFAULT_VOLUME_BOOST_DYNAMIC_RANGE_DB
) {
  if (perceptual === 0) {
    return 0;
  }
  let db;
  if (perceptual > normalizedMax) {
    db = ((perceptual - normalizedMax) / normalizedMax) * boostRange;
  } else {
    db = (perceptual / normalizedMax) * range - range;
  }
  return normalizedMax * Math.pow(10, db / 20);
}

/*
 * amplitudeToPerceptual takes a volume amplitude and converts to user-presented control
 * amp: Number between 0 and 2 * normalizedMax
 * normalizedMax: Normalization of amp value, choose 1 for decimals or 100 for percentages
 * range: Dynamic range of amp value from 0 to normalizedMax
 * boostRange: Dynamic range of amp value from normalizedMax to 2 * normalizedMax
 * returns: Number between 0 and 2 * normalizedMax
 */
function amplitudeToPerceptual(
  amp,
  normalizedMax = 1,
  range = DEFAULT_VOLUME_DYNAMIC_RANGE_DB,
  boostRange = DEFAULT_VOLUME_BOOST_DYNAMIC_RANGE_DB
) {
  if (amp === 0) {
    return 0;
  }
  const db = 20 * Math.log10(amp / normalizedMax);
  let perceptual;
  if (db > 0) {
    perceptual = db / boostRange + 1;
  } else {
    perceptual = (range + db) / range;
  }
  return normalizedMax * perceptual;
}
