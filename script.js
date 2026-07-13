let characters = [];
let equipments = [];
const stages = [
    "光地塔",
    "水風塔",
    "火闇塔"
];

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

    if (equipment.source) {
        return `${equipment.title} (${equipment.source})`;
    }

    return equipment.title;

}

function createCheckLists() {

    const characterList = document.getElementById("characterList");
    const equipmentList = document.getElementById("equipmentList");

    characterList.innerHTML = "";
    equipmentList.innerHTML = "";

    characters.forEach((character, index) => {

        const label = document.createElement("label");

        label.className = "checkItem";

        if (character.attribute) {
            label.classList.add(`attribute-${character.attribute}`);
        }

        label.innerHTML = `
            <input
                type="checkbox"
                class="characterCheck"
                value="${index}"
                checked>
            ${character.name}
        `;

        characterList.appendChild(label);

    });

    equipments.forEach((equipment, index) => {

        const label = document.createElement("label");

        label.className = "checkItem";

        if (equipment.attribute) {
            label.classList.add(`attribute-${equipment.attribute}`);
        }
        label.innerHTML = `
            <input
                type="checkbox"
                class="equipmentCheck"
                value="${index}"
                checked>
            ${equipmentName(equipment)}
        `;

        equipmentList.appendChild(label);

    });

}

function setAllChecks(className, checked) {

    document.querySelectorAll(className).forEach(check => {

        check.checked = checked;

    });

}

function draw() {

    const enabledCharacters = characters.filter((character, index) =>
        document.querySelectorAll(".characterCheck")[index].checked
    );

    const enabledEquipments = equipments.filter((equipment, index) =>
        document.querySelectorAll(".equipmentCheck")[index].checked
    );

    if (enabledCharacters.length < 3) {

        alert("キャラクターを3人以上選択してください。");
        return;

    }

    if (enabledEquipments.length < 6) {

        alert("ロスレコを6個以上選択してください。");
        return;

    }

    const selectedCharacters =
        shuffle(enabledCharacters).slice(0, 3);

    const selectedEquipments =
        shuffle(enabledEquipments).slice(0, 6);

    const selectedStage =
    stages[Math.floor(Math.random() * stages.length)];

    document.getElementById("characterResult").innerHTML = `
        <div class="card stageCard">
            <div class="role">挑戦ステージ</div>
            <div class="name">${selectedStage}</div>
        </div>

        <div class="card mainCharacter">
            <div class="role">主力</div>
            <div class="name">${selectedCharacters[0].name}</div>
        </div>

        <div class="card supportCharacter">
            <div class="role">支援</div>
            <div class="name">${selectedCharacters[1].name}</div>
        </div>

        <div class="card supportCharacter">
            <div class="role">支援</div>
            <div class="name">${selectedCharacters[2].name}</div>
        </div>
    `;

    document.getElementById("equipmentResult").innerHTML = `
        <div class="card mainEquipment">
            <div class="role">メイン①</div>
            <div class="name">${equipmentName(selectedEquipments[0])}</div>
        </div>

        <div class="card mainEquipment">
            <div class="role">メイン②</div>
            <div class="name">${equipmentName(selectedEquipments[1])}</div>
        </div>

        <div class="card mainEquipment">
            <div class="role">メイン③</div>
            <div class="name">${equipmentName(selectedEquipments[2])}</div>
        </div>
                <div class="card subEquipment">
            <div class="role">サブ①</div>
            <div class="name">${equipmentName(selectedEquipments[3])}</div>
        </div>

        <div class="card subEquipment">
            <div class="role">サブ②</div>
            <div class="name">${equipmentName(selectedEquipments[4])}</div>
        </div>

        <div class="card subEquipment">
            <div class="role">サブ③</div>
            <div class="name">${equipmentName(selectedEquipments[5])}</div>
        </div>
    `;

}

window.onload = async () => {

    await loadData();

    createCheckLists();

    document
        .getElementById("drawButton")
        .addEventListener("click", draw);

    document
        .getElementById("checkAllCharacters")
        .addEventListener("click", () => {

            setAllChecks(".characterCheck", true);

        });

    document
        .getElementById("uncheckAllCharacters")
        .addEventListener("click", () => {

            setAllChecks(".characterCheck", false);

        });

    document
        .getElementById("checkAllEquipments")
        .addEventListener("click", () => {

            setAllChecks(".equipmentCheck", true);

        });

    document
        .getElementById("uncheckAllEquipments")
        .addEventListener("click", () => {

            setAllChecks(".equipmentCheck", false);

        });

};