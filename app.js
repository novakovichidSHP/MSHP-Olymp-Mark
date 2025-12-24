const STORAGE_KEY = "mshp-olymp-state";
const CONFIG_URL = "config.json";

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const board = document.getElementById("board");
const costsList = document.getElementById("costs");
const lockedCommandsEl = document.getElementById("lockedCommands");
const availableCommandsEl = document.getElementById("availableCommands");
const programEl = document.getElementById("program");
const studentsInput = document.getElementById("students");
const pointsInput = document.getElementById("points");
const scaleInput = document.getElementById("scale");
const runBtn = document.getElementById("run");
const stepBtn = document.getElementById("step");
const clearBtn = document.getElementById("clear");
const resetBtn = document.getElementById("reset");
const backBtn = document.getElementById("back");
const teamHeroes = document.getElementById("teamHeroes");
const heroTemplate = document.getElementById("heroTemplate");

let config = null;
let state = null;
let programPointer = 0;
let isRunning = false;
let robotEl = null;

const gridConfig = {
  columns: 10,
  rows: 8,
  path: [
    { x: 1, y: 6 },
    { x: 2, y: 6 },
    { x: 3, y: 6 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 5, y: 5 },
    { x: 5, y: 4 },
    { x: 5, y: 3 },
    { x: 5, y: 2 },
    { x: 4, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 2, y: 4 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 6, y: 3 },
    { x: 7, y: 3 },
    { x: 8, y: 3 },
    { x: 8, y: 2 },
    { x: 8, y: 4 },
    { x: 7, y: 2 },
    { x: 7, y: 4 }
  ],
  start: { x: 1, y: 6 },
  stone: { x: 6, y: 3 },
  box: { x: 7, y: 3 },
  badguy: { x: 7, y: 2 }
};

const heroes = [
  { id: "vector", name: "Вектор", img: "pictures/vector.png", position: { x: 2, y: 2 } },
  { id: "codeman", name: "Человек-Наук", img: "pictures/codeman.png", position: { x: 4, y: 2 } },
  { id: "supermark", name: "Супер-Марк", img: "pictures/supermark.png", position: { x: 3, y: 5 } },
  { id: "cyberjinn", name: "Киберджинн", img: "pictures/cyberjinn.png", position: { x: 5, y: 4 } },
  { id: "robozeka", name: "Робозека", img: "pictures/robot.png", position: { x: 2, y: 5 } },
  { id: "flashcone", name: "Флеш-шишка", img: "pictures/flashcone.png", position: { x: 4, y: 6 } }
];

const commandDefinitions = [
  { id: "up", label: "Вверх", type: "move" },
  { id: "down", label: "Вниз", type: "move" },
  { id: "left", label: "Влево", type: "move" },
  { id: "right", label: "Вправо", type: "move" },
  { id: "jump", label: "Прыгнуть", type: "jump" },
  { id: "hero", label: "Получить героя", type: "hero" },
  { id: "storage", label: "Открыть хранилище", type: "storage" },
  { id: "box", label: "Открыть ящик", type: "box" }
];

const stageRules = [
  {
    id: "stage1",
    label: "Первая команда",
    commands: ["up", "down", "left", "right"]
  },
  {
    id: "hero",
    label: "Получение героя",
    commands: ["hero"]
  },
  {
    id: "final",
    label: "Финальный этап",
    commands: ["jump", "storage", "box"]
  }
];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    program: [],
    position: gridConfig.start,
    acquiredHeroes: [],
    availableCommands: [],
    boxOpened: false,
    points: 0,
    students: 10,
    selectedProgram: null,
    scale: 100
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function selectProgram(program) {
  state.selectedProgram = program;
  saveState();
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  setupGame();
}

function resetState() {
  state = {
    program: [],
    position: gridConfig.start,
    acquiredHeroes: [],
    availableCommands: [],
    boxOpened: false,
    points: 0,
    students: 10,
    selectedProgram: state.selectedProgram,
    scale: 100
  };
  saveState();
  setupGame();
}

function setupGame() {
  studentsInput.value = state.students;
  pointsInput.value = state.points;
  scaleInput.value = state.scale;
  renderBoard();
  updateThresholds();
  updateCommands();
  renderProgram();
  renderTeam();
  updateScale();
}

function updateScale() {
  board.style.transform = `scale(${state.scale / 100})`;
}

function updateThresholds() {
  const programCoefficients = config?.programs[state.selectedProgram];
  if (!programCoefficients) {
    return;
  }
  const thresholds = {
    stage1: programCoefficients.stage1 * state.students,
    hero: programCoefficients.hero * state.students,
    final: programCoefficients.final * state.students
  };

  costsList.innerHTML = "";
  stageRules.forEach((stage) => {
    const item = document.createElement("li");
    const value = thresholds[stage.id];
    item.textContent = `${stage.label}: ${value}`;
    costsList.appendChild(item);
  });

  state.availableCommands = [];
  stageRules.forEach((stage) => {
    if (state.points >= thresholds[stage.id]) {
      state.availableCommands.push(...stage.commands);
    }
  });
  state.availableCommands = [...new Set(state.availableCommands)];
  saveState();
}

function updateCommands() {
  lockedCommandsEl.innerHTML = "";
  availableCommandsEl.innerHTML = "";

  commandDefinitions.forEach((command) => {
    const isAvailable = state.availableCommands.includes(command.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = command.label;
    btn.className = `command-btn ${isAvailable ? "command-btn--available" : "command-btn--locked"}`;
    if (isAvailable) {
      btn.addEventListener("click", () => addToProgram(command.id));
      availableCommandsEl.appendChild(btn);
    } else {
      lockedCommandsEl.appendChild(btn);
    }
  });
}

function renderBoard() {
  board.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid";

  gridConfig.path.forEach((cell) => {
    const cellEl = document.createElement("div");
    cellEl.className = "cell";
    placeAt(cellEl, cell);
    grid.appendChild(cellEl);
  });

  const badguy = createPiece("badguy", "pictures/BADSHISH-3.png", "Плохишиш");
  badguy.classList.add("badguy");
  placeAt(badguy, gridConfig.badguy, -8);
  grid.appendChild(badguy);

  const stone = createPiece("object", "pictures/stone.jpg", "Камень");
  stone.classList.add("object--stone");
  placeAt(stone, gridConfig.stone);
  grid.appendChild(stone);

  const box = createPiece("object", "pictures/box.png", "Ящик");
  box.classList.add("object--box");
  placeAt(box, gridConfig.box);
  const lock = document.createElement("img");
  lock.src = "pictures/lock.jpg";
  lock.alt = "Замок";
  lock.className = "object--lock";
  box.appendChild(lock);
  grid.appendChild(box);

  heroes.forEach((hero) => {
    const heroEl = createPiece("hero", hero.img, hero.name);
    heroEl.dataset.hero = hero.id;
    if (state.acquiredHeroes.includes(hero.id)) {
      heroEl.classList.add("hero--acquired");
    }
    placeAt(heroEl, hero.position);
    grid.appendChild(heroEl);

    if (state.boxOpened && state.acquiredHeroes.includes(hero.id)) {
      const energy = document.createElement("div");
      energy.className = "energy";
      placeAt(energy, { x: hero.position.x + 0.35, y: hero.position.y - 0.15 }, 0, true);
      grid.appendChild(energy);
    }
  });

  robotEl = createPiece("robot", "pictures/mini-robot.png", "Робот");
  robotEl.classList.add("robot");
  placeAt(robotEl, state.position);
  grid.appendChild(robotEl);

  board.appendChild(grid);
}

function createPiece(className, imgSrc, label) {
  const piece = document.createElement("div");
  piece.className = className;
  const img = document.createElement("img");
  img.src = imgSrc;
  img.alt = label;
  piece.appendChild(img);
  return piece;
}

function placeAt(element, position, offsetY = 0, isTiny = false) {
  const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-size"));
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cell-gap"));
  const x = position.x * (size + gap);
  const y = position.y * (size + gap) + offsetY;

  if (element.classList.contains("robot")) {
    element.style.transform = `translate(${x}px, ${y}px)`;
  } else {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }
  if (isTiny) {
    element.style.width = "22px";
    element.style.height = "22px";
  }
}

function renderProgram() {
  programEl.innerHTML = "";
  state.program.forEach((commandId, index) => {
    const command = commandDefinitions.find((item) => item.id === commandId);
    const item = document.createElement("li");
    item.textContent = command ? command.label : commandId;
    if (index === programPointer && isRunning) {
      item.style.fontWeight = "700";
      item.style.color = "var(--primary)";
    }
    programEl.appendChild(item);
  });
}

function renderTeam() {
  teamHeroes.querySelectorAll(".team__hero:not([data-hero='supershish'])").forEach((hero) => hero.remove());
  state.acquiredHeroes.forEach((heroId) => {
    const hero = heroes.find((item) => item.id === heroId);
    if (!hero) return;
    const clone = heroTemplate.content.cloneNode(true);
    const wrapper = clone.querySelector(".hero");
    wrapper.className = "team__hero";
    wrapper.dataset.hero = hero.id;
    wrapper.querySelector("img").src = hero.img;
    wrapper.querySelector("img").alt = hero.name;
    wrapper.querySelector("span").textContent = hero.name;
    teamHeroes.appendChild(clone);
  });
}

function addToProgram(commandId) {
  state.program.push(commandId);
  saveState();
  renderProgram();
}

function clearProgram() {
  state.program = [];
  programPointer = 0;
  isRunning = false;
  saveState();
  renderProgram();
}

function canMoveTo(position) {
  return gridConfig.path.some((cell) => cell.x === position.x && cell.y === position.y);
}

function executeCommand(commandId) {
  const current = state.position;
  let next = null;

  if (["up", "down", "left", "right"].includes(commandId)) {
    const delta = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }[commandId];

    next = { x: current.x + delta.x, y: current.y + delta.y };
    if (next.x === gridConfig.stone.x && next.y === gridConfig.stone.y) {
      return;
    }
    if (canMoveTo(next)) {
      state.position = next;
      moveRobot();
    }
  }

  if (commandId === "jump") {
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ];

    directions.forEach((dir) => {
      const stonePos = { x: current.x + dir.x, y: current.y + dir.y };
      const landing = { x: current.x + dir.x * 2, y: current.y + dir.y * 2 };
      if (stonePos.x === gridConfig.stone.x && stonePos.y === gridConfig.stone.y && canMoveTo(landing)) {
        state.position = landing;
        moveRobot();
      }
    });
  }

  if (commandId === "hero") {
    const hero = heroes.find(
      (item) => item.position.x === current.x && item.position.y === current.y
    );
    if (hero && !state.acquiredHeroes.includes(hero.id)) {
      state.acquiredHeroes.push(hero.id);
      saveState();
      renderBoard();
      renderTeam();
      flashHero(hero.id);
    }
  }

  if (commandId === "storage") {
    alert("Хранилище открыто! Теперь можно открыть ящик.");
  }

  if (commandId === "box") {
    if (current.x === gridConfig.box.x && current.y === gridConfig.box.y) {
      state.boxOpened = true;
      saveState();
      renderBoard();
    }
  }
}

function flashHero(heroId) {
  const heroEl = board.querySelector(`.hero[data-hero='${heroId}']`);
  if (heroEl) {
    heroEl.classList.add("hero--flash");
    setTimeout(() => heroEl.classList.remove("hero--flash"), 800);
  }
}

function moveRobot() {
  placeAt(robotEl, state.position);
  saveState();
}

async function runProgram() {
  if (isRunning || state.program.length === 0) {
    return;
  }
  isRunning = true;
  programPointer = 0;
  renderProgram();

  for (let i = 0; i < state.program.length; i += 1) {
    programPointer = i;
    renderProgram();
    executeCommand(state.program[i]);
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  isRunning = false;
  programPointer = 0;
  renderProgram();
}

function stepProgram() {
  if (state.program.length === 0) {
    return;
  }
  if (programPointer >= state.program.length) {
    programPointer = 0;
  }
  executeCommand(state.program[programPointer]);
  programPointer += 1;
  renderProgram();
}

function handleInputChange() {
  state.students = Number(studentsInput.value);
  state.points = Number(pointsInput.value);
  saveState();
  updateThresholds();
  updateCommands();
}

function handleScale() {
  state.scale = Number(scaleInput.value);
  saveState();
  updateScale();
}

function handleReset() {
  const confirmed = confirm("Сбросить прогресс игры?");
  if (confirmed) {
    resetState();
  }
}

async function init() {
  const response = await fetch(CONFIG_URL);
  config = await response.json();
  state = loadState();

  document.querySelectorAll("[data-program]").forEach((button) => {
    button.addEventListener("click", () => selectProgram(button.dataset.program));
  });

  backBtn.addEventListener("click", () => {
    menu.classList.remove("hidden");
    game.classList.add("hidden");
  });

  studentsInput.addEventListener("input", handleInputChange);
  pointsInput.addEventListener("input", handleInputChange);
  scaleInput.addEventListener("input", handleScale);
  clearBtn.addEventListener("click", clearProgram);
  runBtn.addEventListener("click", runProgram);
  stepBtn.addEventListener("click", stepProgram);
  resetBtn.addEventListener("click", handleReset);

  if (state.selectedProgram) {
    menu.classList.add("hidden");
    game.classList.remove("hidden");
    setupGame();
  }
}

init();
