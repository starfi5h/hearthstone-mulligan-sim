# [Hearthstone Mulligan Simulator](https://starfi5h.github.io/hearthstone-mulligan-sim/)

A web-based tool designed for Hearthstone players to practice opening hands (mulligans), test deck consistency, and simulate early-game decision-making without needing to launch the game.

## Key Features

*   **Deck Import:** Instantly load any standard Hearthstone deck string.
*   **Mulligan Practice:** Simulate "Going First" (3 cards) or "Going Second" (4 cards + The Coin). Test keep/replace decisions.
*   **Sandbox Gameplay:** Draw cards, play cards, and end turns to see how mana curve plays out.
*   **Deck Manipulation:** Manual trigger Discover, Dredge, etc.
*   **Drag & Drop Interactions:** Intuitive gestures to discard cards, search the deck, or place cards at the bottom.
*   **Statistics:** Built-in counters to track "Success" rates (e.g., "How often do I have card X by turn 3?").
*   **Multilingual:** Supports English, Traditional Chinese, and Simplified Chinese.

---

## How to Use

### 1. Getting Started
1.  Copy a **Deck String** from Hearthstone or a deck-building website (starts with `AAE...`).
2.  Paste it into the input box at the top.
3.  Click **Load Deck**.

### 2. The Mulligan Phase
1.  Click **Going First** or **Going Second**.
2.  Click on the cards you want to **replace** (a red X will appear).
3.  Click **Confirm** to shuffle those cards back and draw replacements.

### 3. Simulation & Actions
Once the game starts, you have a dashboard of tools:
*   **Play Card:** Click a card in hand to play it. The app tracks mana spent this turn.
    *  Only few special cards has effect triggered when played. The rest have to tirgger the effect manually.
*   **Dredge:** Inspect the bottom 3 cards and pick one to place on top.
*   **Draw:** Draw the top card. Use the sub-buttons to draw the next **Minion** or **Spell**.
*   **Discover:** Look at 3 random cards from your deck.
    *   *Click Card Image:* Moves the card from deck to hand.
    *   *Click "Add Copy":* Adds a copy to hand (card remains in deck).
*   **End Turn:** Increments the turn counter and resets mana spent.

### 4. Drag & Drop Action
*   **Discard:** Drag a card from your **Hand** to the empty background.
*   **Destroy:** Drag a card from the **Deck List** to the empty background.
*   **Search/Tutor:** Drag a card from the **Deck List** into your **Hand** area to draw that specific card.
*   **Sink (Bottom):** Drag a card from your **Hand** onto the **Deck List** to put it at the very bottom of the deck.

### 5. Tracking Stats
Use the **Success Counter** section at the top to track your testing results.
*   Define what a "Success" is (e.g., Play the combo before X turns).
*   After a mulligan or simulation is considered finished, click **+1** on a counter.
*   The tool calculates the percentage automatically.
*   Click **Reset** to clear data.

---
---

# [爐石起手調度模擬器 (Hearthstone Mulligan Sim)](https://starfi5h.github.io/hearthstone-mulligan-sim/)

這是一個網頁工具，讓你無需開啟遊戲即可練習起手留牌（Mulligan）、測試套牌的抽濾流暢度，以及模擬前幾個回合的決策。

## 主要功能

*   **匯入套牌：** 支援貼上爐石套牌代碼（Deck String）快速載入。
*   **起手模擬：** 選擇「先手」（3張牌）或「後手」（4張牌+幸運幣），測試留牌與換牌決策。
*   **沙盒操作：** 自由抽牌、打出卡牌、結束回合，觀察水晶曲線是否順暢。
*   **牌堆操作：** 手動觸發發現、探底等操作。
*   **拖曳手勢：** 支援直覺的拖放操作來丟棄卡牌、檢索牌堆或將卡牌置底。
*   **統計計數器：** 內建計數器，方便測試特定起手的成功率（例如：「第3回合前抽到核心牌的機率」）。
*   **多語言支援：** 介面支援繁體中文、簡體中文與英文。

---

## 使用說明

### 1. 開始使用
1.  從爐石戰記遊戲內或任何牌組網站複製 **套牌代碼**（以 `AAE...` 開頭）。
2.  貼上到頂部的輸入框中。
3.  點擊 **載入套牌**。

### 2. 起手調度 (Mulligan)
1.  選擇 **先手起手** 或 **後手起手**。
2.  點擊你想要 **替換** 的手牌（卡片上會出現紅色叉叉）。
3.  點擊 **確認**，系統會將選定的牌洗回並抽出新牌。

### 3. 模擬與操作
進入對局模擬後，下方控制台提供多種功能：
*   **打出卡牌：** 點擊手牌即可打出，系統會記錄本回合消耗的法力水晶。
    *  只有少數有特殊效果卡牌打出後會自動觸發效果。其餘的要手動點擊下方按鈕觸發。
*   **探底 (Dredge)：** 檢視牌堆底部的3張牌，並選擇一張置頂。
*   **發現 (Discover)：** 從牌堆中三選一。使用下方的小按鈕可指定發現**隨從** 或 **法術**。
    *   *點擊卡圖：* 將該牌從牌堆移入手牌。
    *   *點擊「獲得複製」：* 獲得一張複製品，原牌保留在牌堆中。
*   **抽牌 (Draw)：** 抽一張牌。使用下方的小按鈕可指定抽一張 **隨從** 或 **法術**。
*   **結束回合：** 增加回合數並重置已消耗費用。

### 4. 拖曳操作 (Drag & Drop)
*   **丟棄 (Discard)：** 將卡牌從 **手牌區** 拖曳到空白背景處。
*   **摧毀 (Destroy)：** 將卡牌從 **右側牌庫列表** 拖曳到空白背景處（直接移除該牌）。
*   **檢索 (Search/Tutor)：** 將卡牌從 **右側牌庫列表** 拖曳到 **手牌區**（定向檢索該張牌）。
*   **置底 (Sink)：** 將卡牌從 **手牌區** 拖曳到 **右側牌庫列表**（將該牌放回牌庫最底部）。

### 5. 統計數據
利用頂部的 **成功計數器 (Success Counter)** 來記錄測試結果。
*   自行定義什麼是「成功」（例如：在第X回合前打出combo）。
*   完成模擬後，點擊 **+1**。
*   系統會自動計算百分比。
*   點擊 **重設 (Reset)** 可清空數據。