// ==UserScript==
// @name         MouseHunt - <Region> Map Color Coder
// @author       Xellis
// @namespace    https://github.com/inkahootz/
// @version      0.1
// @description  Color codes mice on <REGION> maps according to type
// @match        https://www.mousehuntgame.com/*
// ==/UserScript==
// Based off original script by Tsitu

/*
    =====
    README
    =====
    Edit any of these as needed for you map region.
*/
const customDivClassName = "<REGION/EVENT>-map";
// Input the chest names you want this script to match. The rare version is not necessary due to string matching but you can still include it.
const mapRewards = [
    // "Empyrean Sky Palace Treasure Chest", // EXAMPLE
];

function buildGroups() {
    /* Insert Groups as needed.

        EXAMPLE
        new MouseGroup("Header Display Name" [
            "List",
            "of",
            "Mice"
        ], "#COLOR), // colorcomment

        EMPTY for copy/paste:
        new MouseGroup("", [

        ], "#"), //

    */
    mapMiceGroups = [
        /*
        // EXAMPLE
        new MouseGroup("Indigenous" [
            "White",
            "Cowardly",
            "Tiny"
        ], "#FF0000), // red
        */
    ];
}

/*
    ======
    README
    ======
    You shouldn't typically need to edit below here.
*/
var mapMiceGroups = []

function colorize() {
    buildGroups();
    const colorUncaughtOnly = localStorage.getItem("highlightPref") === "uncaught-only";
    if (document.querySelectorAll(".treasureMapView-goals-group-goal").length === 0) {
        return;
    }

    document.querySelectorAll(".treasureMapView-goals-group-goal").forEach(el => {
        el.querySelector("span").style = "color: black;";

        const mouseName = el.querySelector(".treasureMapView-goals-group-goal-name").textContent;

        for (const group of mapMiceGroups) {
            if (group.mice.indexOf(mouseName) === -1) {
                continue;
            }

            const mouseCaught = el.classList.contains("complete");

            el.style.backgroundColor = !mouseCaught || !colorUncaughtOnly ? group.color : "";
            if (!mouseCaught) {
                group.count++;
            }
        }
    });

    // Remove previous related elements before proceeding
    document.querySelectorAll(customDivClassName).forEach(el => el.remove());

    const masterDiv = document.createElement("div");
    masterDiv.className = customDivClassName;
    masterDiv.style =
        "display: inline-flex; margin-bottom: 10px; width: 100%; text-align: center; line-height: 1.5; overflow: hidden";
    const spanStyle =
          "; width: auto; padding: 5px; font-weight: bold; font-size: 10px; text-shadow: 0px 0px 11px white; color: black";

    var groupHeaderSpans = [];

    // Create each colored header and append to main div
    for (const group of mapMiceGroups) {
        masterDiv.appendChild(group.createGroupHeaderElement(spanStyle));
    }

    // Highlight uncaught only feature
    const highlightLabel = document.createElement("label");
    highlightLabel.htmlFor = "tsitu-highlight-box";
    highlightLabel.innerText = "Highlight uncaught mice only";

    const highlightBox = document.createElement("input");
    highlightBox.type = "checkbox";
    highlightBox.name = "tsitu-highlight-box";
    highlightBox.style.verticalAlign = "middle";
    highlightBox.checked = colorUncaughtOnly;
    highlightBox.addEventListener("click", function () {
        if (highlightBox.checked) {
            localStorage.setItem("highlightPref", "uncaught-only");
        } else {
            localStorage.setItem("highlightPref", "all");
        }
        colorize();
    });

    const highlightDiv = document.createElement("div");
    highlightDiv.className = customDivClassName;
    highlightDiv.style = "float: right; position: relative; z-index: 1";
    highlightDiv.appendChild(highlightBox);
    highlightDiv.appendChild(highlightLabel);

    // Assemble masterDiv
    groupHeaderSpans.forEach(el => masterDiv.appendChild(el));

    // Inject into DOM
    const insertEl = document.querySelector(
        ".treasureMapView-leftBlock .treasureMapView-block-content"
    );
    if (
        insertEl &&
        document.querySelector(
            ".treasureMapRootView-header-navigation-item.tasks.active" // On "Active Maps"
        )
    ) {
        insertEl.insertAdjacentElement("afterbegin", highlightDiv);
        insertEl.insertAdjacentElement("afterbegin", masterDiv);
    }

    // "Goals" button
    document.querySelector("[data-type='show_goals']").onclick = function () {
        colorize();
    };
}

class MouseGroup {
    count = 0;

    /**
     * Create a mouse group
     * @param {string} groupName - The short name displayed in the colored summary box
     * @param {string[]} mice Array of mice name for given group
     * @param {string} color A string assigned the background-color of the colored elements
     */
    constructor(groupName, mice, color) {
        this.mice = mice;
        this.groupName = groupName;
        this.color = color;
    }

    createGroupHeaderElement(spanStyle) {
        const span = document.createElement("span");
        span.style = `background-color: ${this.getHeaderColor()} ${spanStyle}`;
        span.innerHTML = `${this.groupName}<br>${this.count}`;

        return span;
    }

    getHeaderColor() {
        return this.count > 0 ? this.color : "#949494"; // light gray
    }
}

// Listen to XHRs, opening a map always at least triggers board.php
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function() {
    this.addEventListener("load", function () {
        const mapEl = document.querySelector(".treasureMapView-mapMenu-rewardName");
    if (mapEl) {
      const mapName = mapEl.textContent;
      if (mapName && mapRewards.some(m => mapName.indexOf(m)) > -1) {
        colorize();
      }
    }
  });
  originalOpen.apply(this, arguments);
};