// ==UserScript==
// @name         MouseHunt - Folklore Forest Map Color Coder
// @author       in59te, Xellis
// @namespace    https://greasyfork.org/en/users/739524-in59te
// @version      0.10
// @description  Color codes mice on Folklore Forest maps according to type
// @match        http://www.mousehuntgame.com/*
// @match        https://www.mousehuntgame.com/*
// ==/UserScript==
// Based off original script by Tsitu

// Input the chest names you want this script to match
const mapRewards = [
    // "Rare Empyrean Sky Palace Treasure Chest", // EXAMPLE
    "Farming and Fishing Treasure Chest",
    "Folklore Forest Prelude Treasure Chest",
];

function buildGroups() {
    mapMiceGroups = [
        new MouseGroup("SB Only", [
            "Crazed Cultivator",
            "Matriarch Gander",
            "Covetous Coastguard"
        ], "#FFFFFF"), // white
        new MouseGroup("Seed", [
            "Root Rummager",
            "Grit Grifter",
        ], "#0FF380" ), // light green
        new MouseGroup("Farm Spec", [
            "Land Loafer",
            "Loathsome Locust",
            "Monstrous Midge"
        ], "#0B6222"), // dark green
        new MouseGroup("Pest", [
            "Angry Aphid",
            "Wily Weevil",
            "Mighty Mite"
        ], "#0EA635"), // med green
        new MouseGroup("Pd Std", [
            "Beachcomber",
            "Sand Sifter",
            "Tackle Tracker"
        ], "#5BF8DC"), // light blue
        new MouseGroup("Grub", [
            "Pompous Perch",
            "Careless Catfish",
            "Melodramatic Minnow"
        ], "#0F97F7"), // normal blue
        new MouseGroup("Clam", [
            "Sinister Squid",
            "Nefarious Nautilus",
            "Vicious Vampire Squid"
        ], "#07568C"), // dark blue
        new MouseGroup("Storm", [
            "Architeuthulhu of the Abyss"
        ], "#8428CC"), // some shade of purple
        new MouseGroup("Std w/o write", [
            "Brothers Grimmaus",
            "Hans Cheesetian Squeakersen",
            "Madame d'Ormouse"
        ], "#CDCDCD"), // grey
        new MouseGroup("Std w write", [
            "Humphrey Dumphrey",
            "Little Bo Squeak",
            "Little Miss Fluffet"
        ], "#FC5E78"), // cherry
        new MouseGroup("1DD", [
            "Fibbocchio",
            "Pinkielina",
            "Princess and the Olive"
        ], "#FDFAA2"), // yellow
        new MouseGroup("2DD", [
            "Flamboyant Flautist",
            "Greenbeard",
            "Ice Regent"
        ], "#F8943A"), //orange
        new MouseGroup("FDD", [
            "Bitter Grammarian",
            "Mythweaver"
        ], "#D6A80B") // gold
    ];
}
var mapMiceGroups = []

function colorize() {
    buildGroups();
    const isChecked = localStorage.getItem("highlightPref") === "uncaught-only";

    if (document.querySelectorAll(".treasureMapView-goals-group-goal").length === 0) {
        return;
    }

    document.querySelectorAll(".treasureMapView-goals-group-goal").forEach(el => {
        el.querySelector("span").style = "color: black; font-size: 11px;";

        const mouseName = el.querySelector(".treasureMapView-goals-group-goal-name")
        .textContent;

        for (const group of mapMiceGroups) {
            if (group.mice.indexOf(mouseName) === -1) {
                continue;
            }

            const mouseCaught = el.classList.contains("complete");

            el.style.backgroundColor = !mouseCaught || !isChecked ? group.color : "";
            if (!mouseCaught) {
                group.count++;
            }
        }
    });

    // Remove existing GWH Map related elements before proceeding
    document.querySelectorAll(".ff-map").forEach(el => el.remove());

    const masterDiv = document.createElement("div");
    masterDiv.className = "ff-map";
    masterDiv.style =
        "display: inline-flex; margin-bottom: 10px; width: 100%; text-align: center; line-height: 1.5; overflow: hidden";
    const spanStyle =
          "; width: auto; padding: 5px; font-weight: bold; font-size: 10px; text-shadow: 0px 0px 11px white; color: black";

    var groupHeaderSpans = [];

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
    highlightBox.checked = isChecked;
    highlightBox.addEventListener("click", function () {
        if (highlightBox.checked) {
            localStorage.setItem("highlightPref", "uncaught-only");
        } else {
            localStorage.setItem("highlightPref", "all");
        }
        colorize();
    });

    const highlightDiv = document.createElement("div");
    highlightDiv.className = "ff-map";
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