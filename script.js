let characters = [];
let equipments = [];
const stages = ["光地塔", "水風塔", "火闇塔"];
const selectedAttributes = new Set();
const renderedItems = { characters: [], equipments: [] };

function normalizeAttribute(attribute) {
    return !attribute || attribute === "無" || attribute === "無属性" ? "無属性" : attribute;
}

// 抽選結果のカードを、対象の属性に対応する配色にする。
// 不明な属性は「無属性」にまとめ、クラス名として安全な値だけを使う。
const resultAttributes = new Set(["火", "水", "風", "地", "光", "闇", "無属性"]);
function resultAttributeClass(item) {
    const attribute = normalizeAttribute(item.attribute);
    return `attribute-${resultAttributes.has(attribute) ? attribute : "無属性"}`;
}

function normalizeSearchText(value) {
    return String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja");
}

function isFiltering() {
    return document.getElementById("itemSearch").value.trim() !== "" || selectedAttributes.size > 0;
}


// 保存するのは「未選択のID」のみ。
// JSONに新しく追加されたIDは未選択リストに無いため、自動で選択済みになる。
// 2つの説明パネルはそれぞれ独立して開閉状態を保持する。
const INFO_STORAGE_KEY = "yaminabe-info-panels-v1";
const INFO_PANEL_IDS = ["aboutDetails", "usageDetails"];

function initializeInfoPanels() {
    try {
        const raw = localStorage.getItem(INFO_STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === "object" && !Array.isArray(saved)) {
                for (const id of INFO_PANEL_IDS) {
                    if (typeof saved[id] === "boolean") {
                        document.getElementById(id).open = saved[id];
                    }
                }
            }
        }
    } catch (error) {
        console.warn("説明パネルの開閉状態を読み込めませんでした。", error);
        showStorageWarning();
    }

    for (const id of INFO_PANEL_IDS) {
        document.getElementById(id).addEventListener("toggle", saveInfoPanels);
    }
}

function saveInfoPanels() {
    try {
        const state = {};
        for (const id of INFO_PANEL_IDS) {
            state[id] = document.getElementById(id).open;
        }
        localStorage.setItem(INFO_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn("説明パネルの開閉状態を保存できませんでした。", error);
        showStorageWarning();
    }
}

const STORAGE_KEY = "yaminabe-unselected-v1";
const excludedIds = {
    characters: new Set(),
    equipments: new Set()
};

function showStorageWarning() {
    document.getElementById("storageWarning").hidden = false;
}

function loadSelection() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const saved = JSON.parse(raw);
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;

        for (const type of ["characters", "equipments"]) {
            if (Array.isArray(saved[type])) {
                excludedIds[type] = new Set(
                    saved[type].filter(id => typeof id === "string")
                );
            }
        }
    } catch (error) {
        // 保存領域を使用できない場合も、抽選自体は引き続き利用できる。
        console.warn("選択状態を読み込めませんでした。", error);
        showStorageWarning();
    }
}

function saveSelection() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            characters: [...excludedIds.characters],
            equipments: [...excludedIds.equipments]
        }));
    } catch (error) {
        console.warn("選択状態を保存できませんでした。", error);
        showStorageWarning();
    }
}

async function loadData() {
    characters = await (await fetch("characters.json")).json();
    equipments = await (await fetch("equipments.json")).json();
}

function shuffle(array) {
    const copied = [...array];
    for (let i = copied.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copied[i], copied[j]] = [copied[j], copied[i]];
    }
    return copied;
}

function equipmentName(equipment) {
    return equipment.source
        ? `${equipment.title} (${equipment.source})`
        : equipment.title;
}

// 新しいJSON項目には固有IDを付ける。万一IDが無い場合は名称を暫定キーとする。
// 名称変更後も選択状態を維持したい場合は、必ず固定IDを使用すること。
function itemId(item, type) {
    return String(item.id ?? (type === "characters"
        ? `name:${item.name}`
        : `title:${item.title}`));
}

function createCheckLists() {
    const characterList = document.getElementById("characterList");
    const equipmentList = document.getElementById("equipmentList");
    characterList.replaceChildren();
    equipmentList.replaceChildren();
    renderedItems.characters = [];
    renderedItems.equipments = [];

    function appendItem(parent, item, type) {
        const label = document.createElement("label");
        label.className = "checkItem";
        label.classList.add(`attribute-${normalizeAttribute(item.attribute)}`);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = type === "characters" ? "characterCheck" : "equipmentCheck";
        checkbox.value = itemId(item, type);
        checkbox.checked = !excludedIds[type].has(checkbox.value);

        // JSONの名称をHTMLとして解釈せず、テキストとして表示する。
        label.append(checkbox, document.createTextNode(type === "characters"
            ? item.name
            : equipmentName(item)));
        parent.appendChild(label);
        renderedItems[type].push({ label, checkbox, item });
    }

    characters.forEach(item => appendItem(characterList, item, "characters"));
    equipments.forEach(item => appendItem(equipmentList, item, "equipments"));
}

// 検索と属性ボタンは両リストに共通。複数属性はOR、検索との組み合わせはAND。
function applyFilters() {
    const term = normalizeSearchText(document.getElementById("itemSearch").value.trim());
    const filtering = isFiltering();

    for (const type of ["characters", "equipments"]) {
        let visibleCount = 0;
        let visibleCheckedCount = 0;
        let totalCheckedCount = 0;

        for (const { label, checkbox, item } of renderedItems[type]) {
            const fields = [item.name, item.title, item.source];
            const matchesTerm = !term || fields.some(field => normalizeSearchText(field).includes(term));
            const matchesAttribute = selectedAttributes.size === 0 || selectedAttributes.has(normalizeAttribute(item.attribute));
            const visible = matchesTerm && matchesAttribute;
            label.hidden = !visible;
            if (visible) {
                visibleCount++;
                if (checkbox.checked) visibleCheckedCount++;
            }
            if (checkbox.checked) totalCheckedCount++;
        }

        const total = renderedItems[type].length;
        const prefix = type === "characters" ? "character" : "equipment";
        document.getElementById(`${prefix}Count`).textContent = filtering
            ? `表示 ${visibleCount} / ${total}件（表示中の選択 ${visibleCheckedCount}件）`
            : `全 ${total}件（選択 ${totalCheckedCount}件）`;
        document.getElementById(`${prefix}Empty`).hidden = visibleCount !== 0;

        const plural = type === "characters" ? "Characters" : "Equipments";
        const selectButton = document.getElementById(`checkAll${plural}`);
        const clearButton = document.getElementById(`uncheckAll${plural}`);
        selectButton.textContent = filtering ? "表示項目を全選択" : "全選択";
        clearButton.textContent = filtering ? "表示項目を全解除" : "全解除";
        selectButton.disabled = visibleCount === 0;
        clearButton.disabled = visibleCount === 0;
    }

    document.getElementById("clearFilters").disabled = !filtering;
}

function toggleAttribute(button) {
    const attribute = button.dataset.attribute;
    if (selectedAttributes.has(attribute)) selectedAttributes.delete(attribute);
    else selectedAttributes.add(attribute);
    const pressed = selectedAttributes.has(attribute);
    button.classList.toggle("isActive", pressed);
    button.setAttribute("aria-pressed", String(pressed));
    applyFilters();
}

function clearFilters() {
    document.getElementById("itemSearch").value = "";
    selectedAttributes.clear();
    document.querySelectorAll(".attributeFilterButton").forEach(button => {
        button.classList.remove("isActive");
        button.setAttribute("aria-pressed", "false");
    });
    applyFilters();
}

function updateSelection(type, selector) {
    // JSONから一時的に削除された項目の未選択状態も保持する。
    const next = new Set(excludedIds[type]);
    document.querySelectorAll(selector).forEach(check => {
        if (check.checked) next.delete(check.value);
        else next.add(check.value);
    });
    excludedIds[type] = next;
    saveSelection();
    applyFilters();
}

function setAllChecks(type, selector, checked) {
    const filtering = isFiltering();
    // 条件がある間は「表示中」の項目のみ操作。非表示の選択状態は変更しない。
    // 条件がない全選択は、過去にJSONから削除されたIDも含めて未選択設定をクリアする。
    if (!filtering && checked) excludedIds[type].clear();
    document.querySelectorAll(selector).forEach(check => {
        if (!filtering || !check.closest(".checkItem").hidden) {
            check.checked = checked;
        }
    });
    updateSelection(type, selector);
}

function draw() {
    const checkedCharacters = new Set(
        [...document.querySelectorAll(".characterCheck:checked")].map(check => check.value)
    );
    const checkedEquipments = new Set(
        [...document.querySelectorAll(".equipmentCheck:checked")].map(check => check.value)
    );
    const enabledCharacters = characters.filter(item => checkedCharacters.has(itemId(item, "characters")));
    const enabledEquipments = equipments.filter(item => checkedEquipments.has(itemId(item, "equipments")));

    if (enabledCharacters.length < 3) {
        alert("キャラクターを3人以上選択してください。");
        return;
    }
    if (enabledEquipments.length < 6) {
        alert("ロスレコを6個以上選択してください。");
        return;
    }

    const selectedCharacters = shuffle(enabledCharacters).slice(0, 3);
    const selectedEquipments = shuffle(enabledEquipments).slice(0, 6);
    const selectedStage = stages[Math.floor(Math.random() * stages.length)];

    const stageResult = document.getElementById("stageResult");
    stageResult.innerHTML = `
        <div class="card stageCard stage-${selectedStage}">
            <div class="role">挑戦ステージ</div>
            <div class="name">${selectedStage}</div>
        </div>
    `;
    stageResult.hidden = false;

    document.getElementById("characterResult").innerHTML = `
        <div class="card mainCharacter ${resultAttributeClass(selectedCharacters[0])}">
            <div class="role">主力</div>
            <div class="name">${selectedCharacters[0].name}</div>
        </div>

        <div class="card supportCharacter ${resultAttributeClass(selectedCharacters[1])}">
            <div class="role">支援</div>
            <div class="name">${selectedCharacters[1].name}</div>
        </div>

        <div class="card supportCharacter ${resultAttributeClass(selectedCharacters[2])}">
            <div class="role">支援</div>
            <div class="name">${selectedCharacters[2].name}</div>
        </div>
    `;

    document.getElementById("equipmentResult").innerHTML = `
        <div class="card mainEquipment ${resultAttributeClass(selectedEquipments[0])}">
            <div class="role">メイン①</div>
            <div class="name">${equipmentName(selectedEquipments[0])}</div>
        </div>

        <div class="card mainEquipment ${resultAttributeClass(selectedEquipments[1])}">
            <div class="role">メイン②</div>
            <div class="name">${equipmentName(selectedEquipments[1])}</div>
        </div>

        <div class="card mainEquipment ${resultAttributeClass(selectedEquipments[2])}">
            <div class="role">メイン③</div>
            <div class="name">${equipmentName(selectedEquipments[2])}</div>
        </div>

        <div class="card subEquipment ${resultAttributeClass(selectedEquipments[3])}">
            <div class="role">サブ①</div>
            <div class="name">${equipmentName(selectedEquipments[3])}</div>
        </div>

        <div class="card subEquipment ${resultAttributeClass(selectedEquipments[4])}">
            <div class="role">サブ②</div>
            <div class="name">${equipmentName(selectedEquipments[4])}</div>
        </div>

        <div class="card subEquipment ${resultAttributeClass(selectedEquipments[5])}">
            <div class="role">サブ③</div>
            <div class="name">${equipmentName(selectedEquipments[5])}</div>
        </div>
    `;
}

window.addEventListener("load", async () => {
    initializeInfoPanels();
    try {
        await loadData();
        loadSelection();
        createCheckLists();
        applyFilters();
    } catch (error) {
        console.error("データの読み込みに失敗しました。", error);
        alert("データを読み込めませんでした。ページを再読み込みしてください。");
        return;
    }

    document.getElementById("drawButton").addEventListener("click", draw);
    document.getElementById("itemSearch").addEventListener("input", applyFilters);
    document.querySelectorAll(".attributeFilterButton").forEach(button => {
        button.addEventListener("click", () => toggleAttribute(button));
    });
    document.getElementById("clearFilters").addEventListener("click", clearFilters);

    document.getElementById("characterList").addEventListener("change", event => {
        if (event.target.matches(".characterCheck")) {
            updateSelection("characters", ".characterCheck");
        }
    });
    document.getElementById("equipmentList").addEventListener("change", event => {
        if (event.target.matches(".equipmentCheck")) {
            updateSelection("equipments", ".equipmentCheck");
        }
    });

    document.getElementById("checkAllCharacters").addEventListener("click", () => {
        setAllChecks("characters", ".characterCheck", true);
    });
    document.getElementById("uncheckAllCharacters").addEventListener("click", () => {
        setAllChecks("characters", ".characterCheck", false);
    });
    document.getElementById("checkAllEquipments").addEventListener("click", () => {
        setAllChecks("equipments", ".equipmentCheck", true);
    });
    document.getElementById("uncheckAllEquipments").addEventListener("click", () => {
        setAllChecks("equipments", ".equipmentCheck", false);
    });
});
