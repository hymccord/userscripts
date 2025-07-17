// ==UserScript==
// @name         BGA Flip 7 Card Counter
// @namespace    https://github.com/hymccord
// @version      0.4.0
// @description  Card counter for Flip 7 on BoardGameArena
// @author       KuRRe8, hymccord
// @downloadURL  https://raw.githubusercontent.com/hymccord/userscripts/main/Flip7/Flip7.user.js
// @updateURL    https://raw.githubusercontent.com/hymccord/userscripts/main/Flip7/Flip7.user.js
// @match        https://boardgamearena.com/*/flipseven?table=*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

"use strict";

// Constants
const GAME_URL_PATTERN =
    /https:\/\/boardgamearena\.com\/\d+\/flipseven\?table=\d+/;
const INITIALIZATION_DELAY = 1500;
const MAX_PLAYERS = 12;
const FLASH_DURATION = 200;

// Selectors
const SELECTORS = {
    playersContainer: ".f7_players_container",
    playerContainer: "#app .f7_players_container > div:nth-child",
    playerName: "#app .f7_player_name > div:nth-child(1)",
    logsContainer: "#logs",
    logEntry: "div[id^='log_']",
    cardElement: ".visible_flippable.f7_token_card.f7_logs",
    flippableFront: ".flippable-front",
    playerNameSpan: "span.playername",
};

// Text patterns for different languages
const TEXT_PATTERNS = {
    newRound: {
        english: /new round/gi,
    },
    shuffle: {
        english: /shuffle/gi,
    },
    bust: {
        english: /bust/gi,
    },
    stay: {
        english: /stay/gi,
    },
    freeze: {
        english: /freezes/gi,
    },
    secondChance: {
        english: /second chance/gi,
    },
    gives: {
        english: /gives/gi,
    }
};

// Game state management
class GameState {
    constructor() {
        this.cardDict = null;
        this.roundCardDict = null;
        this.playerBoardDict = {};
        this.bustedPlayers = {};
        this.stayedPlayers = {};
        this.frozenPlayers = {};
        this.logCounter = 0;
        this.playerNames = [];
    }

    getInitialCardDict() {
        return {
            "12 Card": 12,
            "11 Card": 11,
            "10 Card": 10,
            "9 Card": 9,
            "8 Card": 8,
            "7 Card": 7,
            "6 Card": 6,
            "5 Card": 5,
            "4 Card": 4,
            "3 Card": 3,
            "2 Card": 2,
            "1 Card": 1,
            "0 Card": 1,
            "Second Chance": 3,
            Freeze: 3,
            "Flip 3": 3,
            "+2": 1,
            "+4": 1,
            "+6": 1,
            "+8": 1,
            "+10": 1,
            x2: 1,
        };
    }

    initialize() {
        this.cardDict = this.getInitialCardDict();
        this.roundCardDict = Object.fromEntries(
            Object.keys(this.cardDict).map((k) => [k, 0])
        );
        this.playerBoardDict = {};
        this.resetPlayerStates();

        const playerNames = getPlayerNames();
        gameState.playerNames = playerNames;

        playerNames.forEach((name, idx) => {
            gameState.playerBoardDict[name] = gameState.getInitialPlayerBoardDict();
        });
        console.log("[Flip Seven Counter] Game state initialized");
    }

    getInitialPlayerBoardDict() {
        return Object.fromEntries(
            Object.keys(this.getInitialCardDict()).map((k) => [k, 0])
        );
    }

    resetPlayerStates() {
        this.playerNames.forEach((name) => {
            this.bustedPlayers[name] = false;
            this.stayedPlayers[name] = false;
            this.frozenPlayers[name] = false;
            this.playerBoardDict[name] = this.getInitialPlayerBoardDict();
        });
    }
}

// Global state instance
const gameState = new GameState();

// Utility functions
function isInGameUrl(url) {
    if (!url) return false;
    return GAME_URL_PATTERN.test(url);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    // Replace alert with a better notification system
    console.log(`[Flip Seven Counter] ${message}`);
    // Could be enhanced with a toast notification
}

function clearRoundCardDict() {
    if (!gameState.roundCardDict) {
        console.warn("[Flip Seven Counter] roundCardDict is not initialized");
        return;
    }

    try {
        Object.keys(gameState.roundCardDict).forEach((k) => {
            gameState.roundCardDict[k] = 0;
        });
        console.log("[Flip Seven Counter] Round card data cleared");
    } catch (error) {
        console.error(
            "[Flip Seven Counter] Error clearing round card dict:",
            error
        );
    }
}

// UI Management
class UIManager {
    constructor() {
        this.panel = null;
        this.isCollapsed = false;
        this.isMobile = this.detectMobile();
    }

    detectMobile() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    createCardCounterPanel() {
        if (this.panel) {
            this.panel.remove();
        }

        this.panel = document.createElement("div");
        this.panel.id = "flipseven-card-counter-panel";
        this.applyPanelStyles();
        this.updatePanelContent();

        document.body.appendChild(this.panel);
        this.makePanelDraggable();
        this.addResizeListener();
    }

    applyPanelStyles() {
        if (!this.panel) return;

        const baseStyles = {
            position: "fixed",
            zIndex: "99999",
            background: "rgba(173, 216, 230, 0.9)",
            border: "1px solid #5bb",
            borderRadius: this.isMobile ? "12px" : "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            padding: this.isMobile ? "8px 12px" : "12px 16px",
            fontSize: this.isMobile ? "14px" : "15px",
            color: "#222",
            overflowY: "auto",
            userSelect: "text",
            cursor: this.isMobile ? "default" : "move",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
        };

        if (this.isMobile) {
            Object.assign(baseStyles, {
                top: "10px",
                left: "10px",
                right: "10px",
                width: "calc(100vw - 20px)",
                maxWidth: "400px",
                maxHeight: this.isCollapsed ? "50px" : "70vh",
                transform: "none",
            });
        } else {
            Object.assign(baseStyles, {
                top: "80px",
                right: "20px",
                minWidth: "180px",
                maxHeight: "80vh",
                maxWidth: "300px",
            });
        }

        Object.assign(this.panel.style, baseStyles);
    }

    updatePanelContent(flashKey = null) {
        if (!this.panel || !gameState.cardDict) return;

        const headerHtml = this.renderHeader();
        const cardTable = this.isCollapsed ? "" : this.renderCardDictTable(gameState.cardDict);
        const playersHtml = this.isCollapsed ? "" : this.renderPlayersStatus();

        this.panel.innerHTML = `
            ${headerHtml}
            ${this.isCollapsed ? "" : `<hr style="margin:6px 0;">`}
            <div id="panel-content" style="display: ${this.isCollapsed ? 'none' : 'block'};">
                ${cardTable}
                <div style="height:12px;"></div>
                <div style="font-size: ${this.isMobile ? '1.1em' : '1.2em'}; font-weight: bold; text-align:left;">
                    ${playersHtml}
                </div>
            </div>
        `;

        if (flashKey && !this.isCollapsed) {
            this.flashNumberCell(flashKey);
        }

        this.addCollapseToggleListener();
    }

    renderHeader() {
        const collapseIcon = this.isCollapsed ? "▼" : "▲";
        const toggleButton = this.isMobile ?
            `<button id="collapse-toggle" style="
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 4px 8px;
                margin-left: 8px;
                border-radius: 4px;
                color: #333;
            ">${collapseIcon}</button>` : "";

        return `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <b style="font-size: ${this.isMobile ? '16px' : '15px'};">Flip Seven Counter</b>
                ${toggleButton}
            </div>
        `;
    }

    addCollapseToggleListener() {
        const toggleButton = this.panel?.querySelector("#collapse-toggle");
        if (toggleButton) {
            toggleButton.addEventListener("click", (e) => {
                e.stopPropagation();
                this.toggleCollapse();
            });
        }
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.applyPanelStyles();
        this.updatePanelContent();
    }

    renderPlayersStatus() {
        const maxNameLength = this.isMobile ? 8 : 6;

        return Object.keys(gameState.playerBoardDict)
            .map((name, idx) => {
                const shortName = name.length > maxNameLength ? name.slice(0, maxNameLength) : name;
                const escapedShortName = escapeHtml(shortName);

                if (gameState.bustedPlayers[name]) {
                    return this.createPlayerStatusHtml(
                        escapedShortName,
                        "Busted",
                        "#888"
                    );
                } else if (gameState.frozenPlayers[name]) {
                    return this.createPlayerStatusHtml(
                        escapedShortName,
                        "Frozen",
                        "#888"
                    );
                } else if (gameState.stayedPlayers[name]) {
                    return this.createPlayerStatusHtml(
                        escapedShortName,
                        "Stayed",
                        "#888"
                    );
                } else {
                    const rate = this.getPlayerSafeRate(name);
                    const rateColor = this.getRateColor(rate);
                    return this.createPlayerStatusHtml(
                        escapedShortName,
                        `${rate}%`,
                        rateColor
                    );
                }
            })
            .join("");
    }

    createPlayerStatusHtml(name, status, color) {
        const maxWidth = this.isMobile ? "8em" : "6em";
        const fontSize = this.isMobile ? "0.9em" : "0.95em";

        return `
            <div style="margin-bottom:3px; display: flex; justify-content: space-between; align-items: center;">
                <span style="display:inline-block;max-width:${maxWidth};overflow:hidden;text-overflow:ellipsis;vertical-align:middle;">
                    ${name}
                </span>
                <span style="color:${color};font-size:${fontSize}; font-weight: bold;">
                    ${status}
                </span>
            </div>
        `;
    }

    getRateColor(rate) {
        if (rate < 30) return "#b94a48";
        if (rate < 50) return "#bfae3b";
        return "#4a7b5b";
    }

    renderCardDictTable(dict) {
        const totalLeft = Object.values(dict).reduce((a, b) => a + b, 0) || 1;
        const fontSize = this.isMobile ? "13px" : "14px";
        const padding = this.isMobile ? "3px 4px" : "2px 6px";

        const rows = Object.entries(dict)
            .map(([key, value]) => {
                const percent = Math.round((value / totalLeft) * 100);
                const numColor = this.getCardCountColor(value);
                const percentColor = "#888";

                return `
                    <tr>
                        <td style="padding:${padding}; font-size:${fontSize};">${escapeHtml(key)}</td>
                        <td class="flipseven-anim-num" data-key="${escapeHtml(key)}"
                            style="padding:${padding};text-align:right;color:${numColor};font-weight:bold;font-size:${fontSize};">
                            ${value}
                            <span style="font-size:0.85em;color:${percentColor};">
                                (${percent}%)
                            </span>
                        </td>
                    </tr>
                `;
            })
            .join("");

        return `<table style="border-collapse:collapse;width:100%;font-size:${fontSize};">${rows}</table>`;
    }

    getCardCountColor(count) {
        if (count === 1 || count === 2) return "#2ecc40";
        if (count >= 3 && count <= 5) return "#ffdc00";
        if (count > 5) return "#ff4136";
        return "#888";
    }

    flashNumberCell(key) {
        const cell = this.panel?.querySelector(
            `.flipseven-anim-num[data-key="${escapeHtml(key)}"]`
        );

        if (cell) {
            cell.style.transition = "background 0.2s";
            cell.style.background = "#fff7b2";
            setTimeout(() => {
                cell.style.background = "";
            }, FLASH_DURATION);
        }
    }

    getSafeRate() {
        if (!gameState.cardDict || !gameState.playerBoardDict) return 100;

        let safe = 0;
        let total = 0;

        for (const cardName in gameState.cardDict) {
            if (gameState.playerBoardDict.every((dict) => dict[cardName] === 0)) {
                safe += gameState.cardDict[cardName];
            }
            total += gameState.cardDict[cardName];
        }

        return total === 0 ? 100 : Math.round((safe / total) * 100);
    }

    getPlayerSafeRate(playerName) {
        if (
            !gameState.cardDict ||
            !gameState.playerBoardDict ||
            !gameState.playerBoardDict[playerName]
        ) {
            return 100;
        }

        let total = Object.values(gameState.cardDict).reduce(
            (a, b) => a + b, 0
        );
        let safe = total - Object.entries(gameState.cardDict)
            .filter(([key]) => key.endsWith(" Card") && gameState.playerBoardDict[playerName][key] > 0)
            .reduce((sum, [key, count]) => sum + count, 0);

        return total === 0 ? 100 : Math.round((safe / total) * 100);
    }

    makePanelDraggable() {
        if (!this.panel || this.isMobile) return; // Disable dragging on mobile

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const handleMouseDown = (e) => {
            if (e.target.id === "collapse-toggle") return; // Don't drag when clicking toggle

            isDragging = true;
            const rect = this.panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.body.style.userSelect = "none";
        };

        const handleMouseMove = (e) => {
            if (isDragging && this.panel) {
                this.panel.style.left = `${e.clientX - offsetX}px`;
                this.panel.style.top = `${e.clientY - offsetY}px`;
                this.panel.style.right = "";
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
            document.body.style.userSelect = "";
        };

        this.panel.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }

    addResizeListener() {
        window.addEventListener("resize", () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.detectMobile();

            if (wasMobile !== this.isMobile) {
                this.applyPanelStyles();
                this.updatePanelContent();
            }
        });
    }
}

const uiManager = new UIManager();

// Game monitoring
class GameMonitor {
    constructor() {
        this.observers = [];
    }

    extractCardKeyFromElement(element) {
        const classList = element.className.split(" ");
        const spriteClass = classList.find((cls) => cls.startsWith("sprite-c"));

        if (spriteClass) {
            const num = spriteClass.replace("sprite-c", "");
            if (/^\d+$/.test(num)) {
                return `${num} Card`;
            }
        }
        return null;
    }

    startLogMonitor() {
        const logsContainer = document.getElementById("logs");

        if (!logsContainer) {
            console.warn("[Flip Seven Counter] Logs container not found");
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((node) => {
                        if (this.isLogElement(node)) {
                            this.processLogElement(node);
                        }
                    });
                }
            });
        });

        // Process existing logs in reverse order
        const existingLogs = Array.from(
            logsContainer.querySelectorAll(SELECTORS.logEntry)
        );
        existingLogs
            .reverse()
            .forEach((logElem) => this.processLogElement(logElem));

        observer.observe(logsContainer, {
            childList: true,
            subtree: false,
        });

        this.observers.push(observer);
    }

    isLogElement(node) {
        return (
            node.nodeType === Node.ELEMENT_NODE &&
            node.id &&
            node.id.startsWith("log_")
        );
    }

    processLogElement(logElem) {
        const firstDiv = logElem.querySelector("div");
        if (!firstDiv?.innerText) {
            gameState.logCounter++;
            return;
        }

        const logText = firstDiv.innerText.trim();
        console.log(`[Flip Seven Counter] Processing log: ${logText}`);

        const playerName = this.getPlayerNameFromLog(logElem);
        // Check different log types
        if (this.isNewRoundLog(logText)) {
            this.handleNewRound();
        } else if (this.isShuffleLog(logText)) {
            this.handleShuffle();
        } else if (this.isBustLog(logText)) {
            this.handlePlayerBust(playerName);
        } else if (this.isStayLog(logText)) {
            this.handlePlayerStay(playerName);
        } else if (this.isFreezeLog(logText)) {
            this.handlePlayerFreeze(playerName);
        } else if (this.isSecondChanceLog(logText)) {
            this.handleSecondChance(playerName);
        } else if (this.isGiftLog(logText)) {
            this.handlePlayerGift(logElem);
        } else {
            this.handleCardPlayed(playerName, logElem);
        }

        // if 0 cards left, shuffle
        if (Object.values(gameState.cardDict).reduce((a, b) => a + b, 0) === 0) {
            this.handleShuffle();
        }

        uiManager.updatePanelContent();

        gameState.logCounter++;
    }

    isNewRoundLog(text) {
        return TEXT_PATTERNS.newRound.english.test(text);
    }

    isShuffleLog(text) {
        return TEXT_PATTERNS.shuffle.english.test(text);
    }

    isBustLog(text) {
        return TEXT_PATTERNS.bust.english.test(text);
    }

    isStayLog(text) {
        return TEXT_PATTERNS.stay.english.test(text);
    }

    isFreezeLog(text) {
        return TEXT_PATTERNS.freeze.english.test(text);
    }

    isSecondChanceLog(text) {
        return TEXT_PATTERNS.secondChance.english.test(text);
    }

    isGiftLog(text) {
        return TEXT_PATTERNS.gives.english.test(text);
    }

    handleNewRound() {
        clearRoundCardDict();
        gameState.resetPlayerStates();
    }

    handleShuffle() {
        gameState.cardDict = gameState.getInitialCardDict();
        for (const key in gameState.roundCardDict) {
            if (gameState.cardDict.hasOwnProperty(key)) {
                gameState.cardDict[key] = Math.max(
                    0,
                    gameState.cardDict[key] - gameState.roundCardDict[key]
                );
            }
        }
    }

    handlePlayerBust(playerName) {
        gameState.bustedPlayers[playerName] = true;
    }

    handlePlayerStay(playerName) {
        gameState.stayedPlayers[playerName] = true;
    }

    handlePlayerFreeze(playerName) {
        gameState.frozenPlayers[playerName] = true;
    }

    handleSecondChance(playerName) {
        gameState.playerBoardDict[playerName]["Second Chance"]--;
        console.log(
            "[Flip Seven Counter] Second Chance card discarded, remaining:",
            gameState.cardDict["Second Chance"]
        );

        // remove card where count is 2
        for (const key in gameState.playerBoardDict[playerName]) {
            if (gameState.playerBoardDict[playerName][key] === 2) {
                gameState.playerBoardDict[playerName][key] = 1;
                console.log(
                    `[Flip Seven Counter] Removed ${key} from ${playerName}'s board`
                );
            }
        }
    }

    handlePlayerGift(logElem) {
        const cardElem = logElem.querySelector(SELECTORS.cardElement);
        if (!cardElem) return;

        const cardName = this.getCardNameFromLog(cardElem);
        const gifteeName = this.getGifteeNameFromLog(logElem);
        this.updateCardCounts(gifteeName, cardName);
    }

    handleCardPlayed(playerName, logElem) {
        const cardElem = logElem.querySelector(SELECTORS.cardElement);
        if (!cardElem) return;

        const cardName = this.getCardNameFromLog(cardElem);
        if (this.isValidCardName(cardName)) {
            this.updateCardCounts(playerName, cardName);
        }
    }

    getCardNameFromLog(cardElem) {
        let frontDiv = cardElem;

        // Navigate to the sprite element
        if (frontDiv.children[0]?.children[0]) {
            frontDiv = frontDiv.children[0].children[0];
        } else {
            return null;
        }

        if (!frontDiv.className) return null;

        const classList = frontDiv.className.split(" ");
        const spriteClass = classList.find((cls) => cls.startsWith("sprite-"));

        if (!spriteClass) return null;

        return this.mapSpriteClassToCardKey(spriteClass);
    }

    getPlayerNameFromLog(logElem) {
        const nameSpan = logElem.querySelector(SELECTORS.playerNameSpan);
        return nameSpan ? nameSpan.textContent.trim() : null;
    }

    getGifteeNameFromLog(logElem) {
        const nameSpan = logElem.querySelectorAll(SELECTORS.playerNameSpan)[1];
        return nameSpan ? nameSpan.textContent.trim() : null;
    }

    mapSpriteClassToCardKey(spriteClass) {
        // Number cards (sprite-c[number])
        const numberMatch = spriteClass.match(/^sprite-c(\d+)$/);
        if (numberMatch) {
            return `${numberMatch[1]} Card`;
        }

        // Special cards (sprite-s[number] for +2, +4, etc.)
        const specialMatch = spriteClass.match(/^sprite-s(\d+)$/);
        if (specialMatch) {
            return `+${specialMatch[1]}`;
        }

        // Other special cards
        const specialCards = {
            "sprite-sf": "Freeze",
            "sprite-sch": "Second Chance",
            "sprite-sf3": "Flip 3",
            "sprite-sx2": "x2",
        };

        return specialCards[spriteClass] || null;
    }

    isValidCardName(cardName) {
        return cardName != null && gameState.cardDict.hasOwnProperty(cardName);
    }

    updateCardCounts(playerName, cardName) {
        if (gameState.cardDict[cardName] > 0) {
            gameState.cardDict[cardName]--;
        }
        gameState.roundCardDict[cardName]++;
        gameState.playerBoardDict[playerName][cardName]++;

        console.log(
            `[Flip Seven Counter] Card played: ${cardName}. Remaining ${cardName}s: ${gameState.cardDict[cardName]}`
        );
        uiManager.updatePanelContent(cardName);
    }

    cleanup() {
        this.observers.forEach((observer) => observer.disconnect());
        this.observers = [];
    }
}

const gameMonitor = new GameMonitor();

// Game initialization and navigation handling
function initializeGame() {
    try {
        gameState.initialize();
        uiManager.createCardCounterPanel();
        gameMonitor.startLogMonitor();
        console.log("[Flip Seven Counter] Game initialized successfully");
    } catch (error) {
        console.error("[Flip Seven Counter] Error initializing game:", error);
    }
}

function getPlayerNames() {
    try {
        const playerElements = document.querySelectorAll(SELECTORS.playerName);
        return Array.from(playerElements, (element) =>
            element.textContent.trim()
        ).filter(Boolean);
    } catch (error) {
        console.error("[Flip Seven Counter] Error getting player names:", error);
        return [];
    }
}

function runGameLogic() {
    setTimeout(() => {
        try {
            const playerNames = getPlayerNames();

            if (playerNames.length === 0) {
                console.warn("[Flip Seven Counter] No players found, retrying...");
                setTimeout(runGameLogic, INITIALIZATION_DELAY);
                return;
            }

            showNotification(`Entered game room. Players: ${playerNames.join(", ")}`);

            initializeGame();
        } catch (error) {
            console.error("[Flip Seven Counter] Error in game logic:", error);
        }
    }, INITIALIZATION_DELAY);
}

// Navigation handling
class NavigationHandler {
    constructor() {
        this.setupUrlChangeListeners();
    }

    setupUrlChangeListeners() {
        // Store original methods
        this.originalPushState = history.pushState;
        this.originalReplaceState = history.replaceState;

        // Override history methods
        history.pushState = (...args) => {
            this.originalPushState.apply(history, args);
            setTimeout(() => this.handleUrlChange(), 0);
        };

        history.replaceState = (...args) => {
            this.originalReplaceState.apply(history, args);
            setTimeout(() => this.handleUrlChange(), 0);
        };

        // Listen for popstate events
        window.addEventListener("popstate", () => this.handleUrlChange());

        // Check initial URL
        if (isInGameUrl(window.location.href)) {
            runGameLogic();
        }
    }

    handleUrlChange() {
        try {
            if (isInGameUrl(window.location.href)) {
                // Clean up previous game state
                gameMonitor.cleanup();
                runGameLogic();
            }
        } catch (error) {
            console.error("[Flip Seven Counter] Error handling URL change:", error);
        }
    }

    cleanup() {
        // Restore original methods
        history.pushState = this.originalPushState;
        history.replaceState = this.originalReplaceState;
        gameMonitor.cleanup();
    }
}

// Initialize the navigation handler
const navigationHandler = new NavigationHandler();
