
/* ==========================================
   THE SCHOLAR'S DESK
   Version 0.4 - The Focus Room
========================================== */


/* ==========================================
   1. DOM ELEMENTS
========================================== */

const dateElement = document.getElementById("current-date");

const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("start-timer");
const resetButton = document.getElementById("reset-timer");

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyTasks = document.getElementById("empty-tasks");

const pages = document.querySelectorAll(".page");

const navigationLinks = document.querySelectorAll(
    ".sidebar-nav a, .sidebar-footer a"
);

// Kanban elements

const taskModal = document.getElementById("task-modal");
const kanbanTaskForm = document.getElementById("kanban-task-form");

const newTaskButton = document.getElementById("new-task-button");
const closeTaskModal = document.getElementById("close-task-modal");
const cancelTaskModal = document.getElementById("cancel-task-modal");

const editTaskId = document.getElementById("edit-task-id");
const kanbanTaskTitle = document.getElementById("kanban-task-title");
const kanbanTaskDescription = document.getElementById("kanban-task-description");
const kanbanTaskSubject = document.getElementById("kanban-task-subject");
const kanbanTaskPriority = document.getElementById("kanban-task-priority");
const kanbanTaskDue = document.getElementById("kanban-task-due");
const kanbanTaskStatus = document.getElementById("kanban-task-status");

const taskSearch = document.getElementById("task-search");
const filterPriority = document.getElementById("filter-priority");
const filterSubject = document.getElementById("filter-subject");

// Focus Room elements

const focusRoomTime = document.getElementById("focus-room-time");
const focusRoomStart = document.getElementById("focus-room-start");
const focusRoomReset = document.getElementById("focus-room-reset");
const focusRoomSkip = document.getElementById("focus-room-skip");

const focusModeLabel = document.getElementById("focus-mode-label");
const focusRoomMessage = document.getElementById("focus-room-message");
const focusProgressRing = document.getElementById("focus-progress-ring");

const focusModeButtons = document.querySelectorAll(".focus-mode-button");

const focusPreferencesForm = document.getElementById("focus-preferences-form");
const focusDurationInput = document.getElementById("focus-duration");
const shortBreakInput = document.getElementById("short-break-duration");
const longBreakInput = document.getElementById("long-break-duration");
const focusSoundEnabled = document.getElementById("focus-sound-enabled");
const focusPreferencesMessage = document.getElementById("focus-preferences-message");

const focusSessionHistory = document.getElementById("focus-session-history");
const focusHistoryEmpty = document.getElementById("focus-history-empty");

const STATUSES = ["todo", "progress", "completed"];


/* ==========================================
   2. STORAGE HELPERS
========================================== */

function readJSON(key, fallback) {

    try {
        const value = JSON.parse(localStorage.getItem(key));

        return value === null ? fallback : value;

    } catch (error) {

        console.error(`Could not read ${key}:`, error);

        return fallback;

    }

}

function saveJSON(key, value) {

    try {

        localStorage.setItem(key, JSON.stringify(value));

        return true;

    } catch (error) {

        console.error(`Could not save ${key}:`, error);

        return false;

    }

}


/* ==========================================
   3. APPLICATION DATA
========================================== */

let tasks = [];

let draggedTaskId = null;

let totalMinutes = Number(
    localStorage.getItem("scholar-focus-minutes") || 0
);

let sessions = Number(
    localStorage.getItem("scholar-sessions") || 0
);

const DEFAULT_PREFERENCES = {
    focus: 25,
    short: 5,
    long: 15,
    sound: true
};

const storedPreferences = readJSON(
    "scholar-focus-preferences",
    {}
);

let focusPreferences = {
    ...DEFAULT_PREFERENCES,
    ...storedPreferences
};

let sessionHistory = readJSON(
    "scholar-focus-history",
    []
);

if (!Array.isArray(sessionHistory)) {
    sessionHistory = [];
}

// One timer powers both the Dashboard and Focus Room.

let currentMode = "focus";

let remainingSeconds = focusPreferences.focus * 60;

let timerInterval = null;
let endTime = null;

let timerRunning = false;

// The circular progress ring has a radius of 132.

const RING_CIRCUMFERENCE = 2 * Math.PI * 132;

focusProgressRing.style.strokeDasharray =
    RING_CIRCUMFERENCE;


/* ==========================================
   4. LOAD EXISTING TASKS
========================================== */

function loadTasks() {

    const savedTasks = readJSON("scholar-tasks", []);

    if (!Array.isArray(savedTasks)) {
        return [];
    }

    return savedTasks.map(task => {

        const status = STATUSES.includes(task.status)
            ? task.status
            : task.completed ? "completed" : "todo";

        return {
            ...task,

            id: task.id || crypto.randomUUID(),

            text: task.text || task.title || "Untitled Task",

            description: task.description || "",

            subject: task.subject || "",

            priority: ["low", "medium", "high"].includes(task.priority)
                ? task.priority
                : "medium",

            dueDate: task.dueDate || "",

            status: status,

            completed: status === "completed"
        };

    });

}

tasks = loadTasks();


/* ==========================================
   5. SAVE AND REFRESH TASKS
========================================== */

function saveTasks() {

    const saved = saveJSON("scholar-tasks", tasks);

    if (!saved) {
        alert("Your tasks could not be saved.");
    }

    refreshTasks();

}

function refreshTasks() {

    renderDashboardTasks();

    renderKanbanBoard();

    updateStats();

}


/* ==========================================
   6. DATE
========================================== */

function updateDate() {

    dateElement.textContent = new Date().toLocaleDateString(
        "en-IE",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    ).toUpperCase();

}


/* ==========================================
   7. DASHBOARD STATISTICS
========================================== */

function formatMinutes(minutes) {

    const hours = Math.floor(minutes / 60);

    const mins = minutes % 60;

    return `${hours}h ${String(mins).padStart(2, "0")}m`;

}

function updateStats() {

    const completed = tasks.filter(
        task => task.status === "completed"
    ).length;

    document.getElementById("total-focus").textContent =
        formatMinutes(totalMinutes);

    document.getElementById("tasks-completed").textContent =
        `${completed} / ${tasks.length}`;

    document.getElementById("session-count").textContent =
        sessions;

}


/* ==========================================
   8. FOCUS TIMER HELPERS
========================================== */

function getModeDuration(mode = currentMode) {

    return focusPreferences[mode] * 60;

}

function formatSeconds(seconds) {

    const minutes = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}`
    );

}

function updateTimerDisplay() {

    const formatted = formatSeconds(remainingSeconds);

    // Dashboard timer

    timerDisplay.textContent = formatted;

    // Focus Room timer

    focusRoomTime.textContent = formatted;

    // Circular progress

    const duration = getModeDuration();

    const progress = duration > 0
        ? remainingSeconds / duration
        : 0;

    const offset =
        RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));

    focusProgressRing.style.strokeDashoffset = offset;

    // Button labels

    let buttonText;

    if (timerRunning) {

        buttonText = "Pause";

    } else if (remainingSeconds < duration) {

        buttonText = "Resume";

    } else {

        buttonText = currentMode === "focus"
            ? "Begin Focus"
            : "Begin Break";

    }

    startButton.textContent = buttonText;

    focusRoomStart.textContent = timerRunning
        ? "Pause Session"
        : buttonText === "Resume"
            ? "Resume Session"
            : "Begin Session";

}

function updateFocusModeUI() {

    const labels = {
        focus: "FOCUS SESSION",
        short: "SHORT BREAK",
        long: "LONG BREAK"
    };

    const messages = {
        focus: "Time to immerse yourself.",
        short: "A little rest for a busy mind.",
        long: "Step away and recharge."
    };

    focusModeLabel.textContent = labels[currentMode];

    focusRoomMessage.textContent = messages[currentMode];

    focusModeButtons.forEach(button => {

        const active = button.dataset.mode === currentMode;

        button.classList.toggle("active", active);

        button.setAttribute("aria-pressed", String(active));

    });

    updateTimerDisplay();

}


/* ==========================================
   9. START, PAUSE AND RESET TIMER
========================================== */

function startTimer() {

    if (timerRunning) {
        return;
    }

    endTime = Date.now() + remainingSeconds * 1000;

    timerRunning = true;

    timerInterval = setInterval(tickTimer, 250);

    updateTimerDisplay();

}

function pauseTimer() {

    if (!timerRunning) {
        return;
    }

    remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
    );

    clearInterval(timerInterval);

    timerInterval = null;
    endTime = null;
    timerRunning = false;

    updateTimerDisplay();

}

function resetTimer() {

    clearInterval(timerInterval);

    timerInterval = null;
    endTime = null;
    timerRunning = false;

    remainingSeconds = getModeDuration();

    updateTimerDisplay();

}

function toggleTimer() {

    if (timerRunning) {

        pauseTimer();

    } else {

        startTimer();

    }

}

function tickTimer() {

    if (!timerRunning) return;

    remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
    );

    updateTimerDisplay();

    if (remainingSeconds === 0) {

        finishTimerSession();

    }

}

startButton.addEventListener("click", toggleTimer);
focusRoomStart.addEventListener("click", toggleTimer);

resetButton.addEventListener("click", resetTimer);
focusRoomReset.addEventListener("click", resetTimer);


/* ==========================================
   10. SWITCH TIMER MODES
========================================== */

function switchTimerMode(mode) {

    if (!["focus", "short", "long"].includes(mode)) {
        return;
    }

    if (timerRunning) {

        const confirmed = confirm(
            "Switching modes will reset your current timer. Continue?"
        );

        if (!confirmed) return;

    }

    clearInterval(timerInterval);

    timerInterval = null;
    endTime = null;
    timerRunning = false;

    currentMode = mode;

    remainingSeconds = getModeDuration();

    updateFocusModeUI();

}

focusModeButtons.forEach(button => {

    button.addEventListener("click", () => {

        switchTimerMode(button.dataset.mode);

    });

});


/* ==========================================
   11. SKIP TIMER
========================================== */

focusRoomSkip.addEventListener("click", () => {

    if (timerRunning) {

        const confirmed = confirm(
            "Skip this session? It won't count as completed."
        );

        if (!confirmed) return;

    }

    if (currentMode === "focus") {

        switchTimerMode("short");

    } else {

        switchTimerMode("focus");

    }

});


/* ==========================================
   12. SESSION COMPLETION
========================================== */

function finishTimerSession() {

    clearInterval(timerInterval);

    timerInterval = null;
    endTime = null;
    timerRunning = false;

    const finishedMode = currentMode;

    if (finishedMode === "focus") {

        const durationMinutes = focusPreferences.focus;

        totalMinutes += durationMinutes;
        sessions++;

        localStorage.setItem(
            "scholar-focus-minutes",
            totalMinutes
        );

        localStorage.setItem(
            "scholar-sessions",
            sessions
        );

        sessionHistory.unshift({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            duration: durationMinutes,
            mode: "focus"
        });

        saveJSON(
            "scholar-focus-history",
            sessionHistory
        );

        updateStats();
        updateFocusRoomStats();
        renderSessionHistory();

    }

    remainingSeconds = getModeDuration();

    updateTimerDisplay();

    if (focusPreferences.sound) {
        playCompletionSound();
    }

    if (finishedMode === "focus") {

        alert(
            "Focus session complete! Beautiful work. Time for a break. ✨"
        );

        // Automatically prepare the short break.
        // The break does not start until you press Begin.

        switchTimerMode("short");

    } else {

        alert(
            "Break complete! Ready to return to your studies? 🤎"
        );

        switchTimerMode("focus");

    }

}


/* ==========================================
   13. COMPLETION SOUND
========================================== */

let audioContext = null;

function playCompletionSound() {

    try {

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const now = audioContext.currentTime;

        [523.25, 659.25, 783.99].forEach((frequency, index) => {

            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            const start = now + index * 0.16;

            oscillator.type = "sine";
            oscillator.frequency.value = frequency;

            gain.gain.setValueAtTime(0.0001, start);

            gain.gain.exponentialRampToValueAtTime(
                0.12,
                start + 0.025
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                start + 0.5
            );

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(start);
            oscillator.stop(start + 0.52);

        });

    } catch (error) {

        console.warn("Completion sound unavailable:", error);

    }

}


/* ==========================================
   14. TIMER PREFERENCES
========================================== */

function loadFocusPreferences() {

    focusDurationInput.value = focusPreferences.focus;
    shortBreakInput.value = focusPreferences.short;
    longBreakInput.value = focusPreferences.long;

    focusSoundEnabled.checked = focusPreferences.sound;

}

focusPreferencesForm.addEventListener("submit", event => {

    event.preventDefault();

    const focus = Number(focusDurationInput.value);
    const short = Number(shortBreakInput.value);
    const long = Number(longBreakInput.value);

    const valid =
        Number.isInteger(focus) && focus >= 1 && focus <= 180 &&
        Number.isInteger(short) && short >= 1 && short <= 60 &&
        Number.isInteger(long) && long >= 1 && long <= 90;

    if (!valid) {

        focusPreferencesMessage.textContent =
            "Please enter valid durations.";

        return;

    }

    if (timerRunning) {

        const confirmed = confirm(
            "Saving new durations will reset the current timer. Continue?"
        );

        if (!confirmed) return;

    }

    focusPreferences = {
        focus: focus,
        short: short,
        long: long,
        sound: focusSoundEnabled.checked
    };

    saveJSON(
        "scholar-focus-preferences",
        focusPreferences
    );

    resetTimer();

    focusPreferencesMessage.textContent =
        "Preferences saved successfully. ✨";

});


/* ==========================================
   15. FOCUS ROOM DAILY STATISTICS
========================================== */

function localDateKey(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

function getSessionDateKey(session) {

    return localDateKey(new Date(session.date));

}

function calculateStreak() {

    const studyDays = new Set(
        sessionHistory
            .filter(session => session.mode === "focus")
            .map(getSessionDateKey)
    );

    let date = new Date();

    // A streak remains active if the most recent
    // study day was today or yesterday.

    if (!studyDays.has(localDateKey(date))) {

        date.setDate(date.getDate() - 1);

        if (!studyDays.has(localDateKey(date))) {
            return 0;
        }

    }

    let streak = 0;

    while (studyDays.has(localDateKey(date))) {

        streak++;

        date.setDate(date.getDate() - 1);

    }

    return streak;

}

function updateFocusRoomStats() {

    const today = localDateKey(new Date());

    const todaySessions = sessionHistory.filter(session => {

        return (
            session.mode === "focus" &&
            getSessionDateKey(session) === today
        );

    });

    const todayMinutes = todaySessions.reduce(
        (total, session) => total + session.duration,
        0
    );

    const streak = calculateStreak();

    document.getElementById("focus-today").textContent =
        formatMinutes(todayMinutes);

    document.getElementById("focus-today-sessions").textContent =
        todaySessions.length;

    document.getElementById("focus-streak").textContent =
        `${streak} ${streak === 1 ? "day" : "days"}`;

}


/* ==========================================
   16. SESSION HISTORY
========================================== */

function renderSessionHistory() {

    focusSessionHistory.innerHTML = "";

    const recentSessions = sessionHistory
        .filter(session => session.mode === "focus")
        .slice(0, 10);

    focusHistoryEmpty.hidden = recentSessions.length > 0;

    recentSessions.forEach(session => {

        const li = document.createElement("li");

        const details = document.createElement("div");
        details.className = "focus-history-details";

        const title = document.createElement("strong");
        title.textContent = "Focus Session";

        const date = document.createElement("span");

        date.textContent = new Date(session.date)
            .toLocaleString("en-IE", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

        details.append(title, date);

        const duration = document.createElement("span");

        duration.className = "focus-history-duration";

        duration.textContent = `${session.duration} min`;

        li.append(details, duration);

        focusSessionHistory.appendChild(li);

    });

}


/* ==========================================
   17. DASHBOARD TASK LIST
========================================== */

function renderDashboardTasks() {

    taskList.innerHTML = "";

    emptyTasks.hidden = tasks.length > 0;

    tasks.forEach(task => {

        const li = document.createElement("li");

        const checkbox = document.createElement("input");
        const label = document.createElement("span");
        const deleteButton = document.createElement("button");

        checkbox.type = "checkbox";
        checkbox.checked = task.status === "completed";

        checkbox.setAttribute(
            "aria-label",
            `Complete ${task.text}`
        );

        label.textContent = task.text;

        deleteButton.textContent = "×";
        deleteButton.className = "delete-task";

        deleteButton.setAttribute(
            "aria-label",
            `Delete ${task.text}`
        );

        if (task.status === "completed") {
            li.classList.add("completed");
        }

        checkbox.addEventListener("change", () => {

            updateTaskStatus(
                task.id,
                checkbox.checked ? "completed" : "todo"
            );

        });

        deleteButton.addEventListener("click", () => {

            deleteTask(task.id);

        });

        li.append(checkbox, label, deleteButton);

        taskList.appendChild(li);

    });

}

taskForm.addEventListener("submit", event => {

    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) return;

    tasks.push({
        id: crypto.randomUUID(),
        text: text,
        description: "",
        subject: "",
        priority: "medium",
        dueDate: "",
        status: "todo",
        completed: false
    });

    taskInput.value = "";

    saveTasks();

});


/* ==========================================
   18. TASK OPERATIONS
========================================== */

function updateTaskStatus(taskId, newStatus) {

    if (!STATUSES.includes(newStatus)) return;

    const task = tasks.find(item => item.id === taskId);

    if (!task) return;

    task.status = newStatus;
    task.completed = newStatus === "completed";

    saveTasks();

}

function deleteTask(taskId) {

    const task = tasks.find(item => item.id === taskId);

    if (!task) return;

    const confirmed = confirm(
        `Delete "${task.text}"?`
    );

    if (!confirmed) return;

    tasks = tasks.filter(item => item.id !== taskId);

    saveTasks();

}


/* ==========================================
   19. TASK EDITOR MODAL
========================================== */

function openTaskModal(taskId = null) {

    kanbanTaskForm.reset();
    editTaskId.value = "";

    document.getElementById("task-modal-title").textContent =
        taskId ? "Edit Task" : "New Task";

    if (taskId) {

        const task = tasks.find(item => item.id === taskId);

        if (!task) return;

        editTaskId.value = task.id;
        kanbanTaskTitle.value = task.text;
        kanbanTaskDescription.value = task.description;
        kanbanTaskSubject.value = task.subject;
        kanbanTaskPriority.value = task.priority;
        kanbanTaskDue.value = task.dueDate;
        kanbanTaskStatus.value = task.status;

    } else {

        kanbanTaskPriority.value = "medium";
        kanbanTaskStatus.value = "todo";

    }

    taskModal.showModal();
    kanbanTaskTitle.focus();

}

function closeModal() {

    taskModal.close();

}

newTaskButton.addEventListener("click", () => {
    openTaskModal();
});

closeTaskModal.addEventListener("click", closeModal);
cancelTaskModal.addEventListener("click", closeModal);

taskModal.addEventListener("click", event => {

    if (event.target === taskModal) {
        closeModal();
    }

});


/* ==========================================
   20. SAVE TASK FROM MODAL
========================================== */

kanbanTaskForm.addEventListener("submit", event => {

    event.preventDefault();

    const text = kanbanTaskTitle.value.trim();

    if (!text) return;

    const status = kanbanTaskStatus.value;

    const taskData = {
        text: text,
        description: kanbanTaskDescription.value.trim(),
        subject: kanbanTaskSubject.value.trim(),
        priority: kanbanTaskPriority.value,
        dueDate: kanbanTaskDue.value,
        status: status,
        completed: status === "completed"
    };

    const existingId = editTaskId.value;

    if (existingId) {

        const task = tasks.find(
            item => item.id === existingId
        );

        if (task) {
            Object.assign(task, taskData);
        }

    } else {

        tasks.push({
            id: crypto.randomUUID(),
            ...taskData
        });

    }

    saveTasks();
    closeModal();

});


/* ==========================================
   21. KANBAN STATISTICS
========================================== */

function updateKanbanStats() {

    const progress = tasks.filter(
        task => task.status === "progress"
    ).length;

    const completed = tasks.filter(
        task => task.status === "completed"
    ).length;

    document.getElementById("kanban-total").textContent =
        tasks.length;

    document.getElementById("kanban-progress").textContent =
        progress;

    document.getElementById("kanban-completed").textContent =
        completed;

}


/* ==========================================
   22. SUBJECT FILTER
========================================== */

function updateSubjectFilter() {

    const selectedSubject = filterSubject.value;

    const subjects = [...new Set(
        tasks
            .map(task => task.subject)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    filterSubject.innerHTML = "";

    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Subjects";

    filterSubject.appendChild(allOption);

    subjects.forEach(subject => {

        const option = document.createElement("option");

        option.value = subject;
        option.textContent = subject;

        filterSubject.appendChild(option);

    });

    filterSubject.value = subjects.includes(selectedSubject)
        ? selectedSubject
        : "all";

}


/* ==========================================
   23. FILTER TASKS
========================================== */

function getFilteredTasks() {

    const search = taskSearch.value.trim().toLowerCase();

    const priority = filterPriority.value;
    const subject = filterSubject.value;

    return tasks.filter(task => {

        const matchesSearch =
            task.text.toLowerCase().includes(search) ||
            task.description.toLowerCase().includes(search) ||
            task.subject.toLowerCase().includes(search);

        const matchesPriority =
            priority === "all" ||
            task.priority === priority;

        const matchesSubject =
            subject === "all" ||
            task.subject === subject;

        return (
            matchesSearch &&
            matchesPriority &&
            matchesSubject
        );

    });

}

taskSearch.addEventListener("input", renderKanbanBoard);
filterPriority.addEventListener("change", renderKanbanBoard);
filterSubject.addEventListener("change", renderKanbanBoard);


/* ==========================================
   24. DUE DATES
========================================== */

function formatDueDate(dateString) {

    if (!dateString) return "";

    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}

function isOverdue(task) {

    if (!task.dueDate || task.status === "completed") {
        return false;
    }

    return task.dueDate < localDateKey(new Date());

}


/* ==========================================
   25. CREATE KANBAN CARD
========================================== */

function createKanbanCard(task) {

    const card = document.createElement("article");

    card.className = "kanban-card";
    card.draggable = true;
    card.dataset.taskId = task.id;

    const title = document.createElement("h3");

    title.className = "kanban-card-title";
    title.textContent = task.text;

    card.appendChild(title);

    if (task.description) {

        const description = document.createElement("p");

        description.className = "kanban-card-description";
        description.textContent = task.description;

        card.appendChild(description);

    }

    const meta = document.createElement("div");
    meta.className = "kanban-card-meta";

    if (task.subject) {

        const subject = document.createElement("span");

        subject.className = "task-subject";
        subject.textContent = task.subject;

        meta.appendChild(subject);

    }

    const priority = document.createElement("span");

    priority.className = `task-priority ${task.priority}`;

    priority.textContent =
        task.priority.charAt(0).toUpperCase() +
        task.priority.slice(1) +
        " Priority";

    meta.appendChild(priority);

    if (task.dueDate) {

        const due = document.createElement("span");

        due.className = "task-due";

        if (isOverdue(task)) {
            due.classList.add("overdue");
        }

        due.textContent =
            `Due ${formatDueDate(task.dueDate)}`;

        meta.appendChild(due);

    }

    card.appendChild(meta);

    // Status dropdown

    const moveSelect = document.createElement("select");

    moveSelect.className = "kanban-move-select";

    moveSelect.setAttribute(
        "aria-label",
        `Change status of ${task.text}`
    );

    [
        ["todo", "To Do"],
        ["progress", "In Progress"],
        ["completed", "Completed"]
    ].forEach(([value, label]) => {

        const option = document.createElement("option");

        option.value = value;
        option.textContent = label;

        moveSelect.appendChild(option);

    });

    moveSelect.value = task.status;

    moveSelect.addEventListener("change", () => {

        updateTaskStatus(task.id, moveSelect.value);

    });

    card.appendChild(moveSelect);

    // Action buttons

    const actions = document.createElement("div");

    actions.className = "kanban-card-actions";

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "kanban-edit-button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
        openTaskModal(task.id);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "kanban-delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
        deleteTask(task.id);
    });

    actions.append(editButton, deleteButton);

    card.appendChild(actions);

    // Drag and drop

    card.addEventListener("dragstart", event => {

        draggedTaskId = task.id;

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);

        card.classList.add("dragging");

    });

    card.addEventListener("dragend", () => {

        draggedTaskId = null;

        document.querySelectorAll(".drag-over").forEach(
            column => column.classList.remove("drag-over")
        );

        card.classList.remove("dragging");

    });

    return card;

}


/* ==========================================
   26. RENDER KANBAN BOARD
========================================== */

function renderKanbanBoard() {

    updateSubjectFilter();
    updateKanbanStats();

    const filteredTasks = getFilteredTasks();

    STATUSES.forEach(status => {

        const list = document.getElementById(
            `${status}-list`
        );

        const emptyMessage = document.getElementById(
            `${status}-empty`
        );

        const count = document.getElementById(
            `${status}-count`
        );

        list.innerHTML = "";

        const columnTasks = filteredTasks.filter(
            task => task.status === status
        );

        columnTasks.forEach(task => {

            list.appendChild(createKanbanCard(task));

        });

        count.textContent = columnTasks.length;

        emptyMessage.hidden = columnTasks.length > 0;

    });

}


/* ==========================================
   27. KANBAN DRAG AND DROP
========================================== */

document.querySelectorAll(".kanban-column").forEach(column => {

    column.addEventListener("dragover", event => {

        if (!draggedTaskId) return;

        event.preventDefault();

        event.dataTransfer.dropEffect = "move";

        column.classList.add("drag-over");

    });

    column.addEventListener("dragleave", event => {

        if (!column.contains(event.relatedTarget)) {

            column.classList.remove("drag-over");

        }

    });

    column.addEventListener("drop", event => {

        event.preventDefault();

        column.classList.remove("drag-over");

        const taskId =
            event.dataTransfer.getData("text/plain") ||
            draggedTaskId;

        const newStatus = column.dataset.status;

        if (taskId && STATUSES.includes(newStatus)) {

            updateTaskStatus(taskId, newStatus);

        }

        draggedTaskId = null;

    });

});


/* ==========================================
   28. PAGE NAVIGATION
========================================== */

function showPage(pageId) {

    const targetPage = document.getElementById(pageId);

    if (
        !targetPage ||
        !targetPage.classList.contains("page")
    ) {
        return;
    }

    pages.forEach(page => {
        page.hidden = true;
    });

    targetPage.hidden = false;

    navigationLinks.forEach(link => {

        const isActive =
            link.getAttribute("href") === `#${pageId}`;

        link.classList.toggle("active", isActive);

        if (isActive) {

            link.setAttribute("aria-current", "page");

        } else {

            link.removeAttribute("aria-current");

        }

    });

    if (pageId === "focus-page") {

        updateFocusRoomStats();
        renderSessionHistory();

    }

    window.scrollTo(0, 0);

}

navigationLinks.forEach(link => {

    link.addEventListener("click", event => {

        const pageId =
            link.getAttribute("href").substring(1);

        const targetPage =
            document.getElementById(pageId);

        if (
            !targetPage ||
            !targetPage.classList.contains("page")
        ) {
            return;
        }

        event.preventDefault();

        if (window.location.hash === `#${pageId}`) {

            showPage(pageId);

        } else {

            window.location.hash = pageId;

        }

    });

});

window.addEventListener("hashchange", () => {

    const pageId =
        window.location.hash.substring(1) || "dashboard";

    showPage(pageId);

});

function initializeNavigation() {

    const requestedPage =
        window.location.hash.substring(1) || "dashboard";

    const targetPage =
        document.getElementById(requestedPage);

    if (
        targetPage &&
        targetPage.classList.contains("page")
    ) {

        showPage(requestedPage);

    } else {

        showPage("dashboard");

    }

}


/* ==========================================
   29. INITIALIZE APPLICATION
========================================== */

function initializeApp() {

    updateDate();

    loadFocusPreferences();

    updateFocusModeUI();

    refreshTasks();

    updateFocusRoomStats();

    renderSessionHistory();

    initializeNavigation();

}

initializeApp();

/* ==========================================
   THE SCHOLAR'S DESK
   Version 0.5 - The Calendar
========================================== */


/* ==========================================
   30. CALENDAR ELEMENTS
========================================== */

const calendarGrid = document.getElementById("calendar-grid");

const calendarMonthTitle = document.getElementById(
    "calendar-month-title"
);

const calendarPrevButton = document.getElementById(
    "calendar-prev"
);

const calendarNextButton = document.getElementById(
    "calendar-next"
);

const calendarTodayButton = document.getElementById(
    "calendar-today"
);

const calendarNewTaskButton = document.getElementById(
    "calendar-new-task"
);

const calendarAddDayTaskButton = document.getElementById(
    "calendar-add-day-task"
);

const calendarSelectedTitle = document.getElementById(
    "calendar-selected-title"
);

const calendarSelectedSubtitle = document.getElementById(
    "calendar-selected-subtitle"
);

const calendarDayTasks = document.getElementById(
    "calendar-day-tasks"
);

const calendarDayEmpty = document.getElementById(
    "calendar-day-empty"
);

const calendarUpcomingList = document.getElementById(
    "calendar-upcoming-list"
);

const calendarUpcomingEmpty = document.getElementById(
    "calendar-upcoming-empty"
);


/* ==========================================
   31. CALENDAR STATE
========================================== */

let calendarCurrentDate = new Date();

let calendarSelectedDate = localDateKey(new Date());

const CALENDAR_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];


/* ==========================================
   32. CALENDAR DATE HELPERS
========================================== */

function calendarDateKey(year, month, day) {

    const monthString = String(
        month + 1
    ).padStart(2, "0");

    const dayString = String(
        day
    ).padStart(2, "0");

    return `${year}-${monthString}-${dayString}`;

}

function calendarParseDate(dateString) {

    if (!dateString) return null;

    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    return new Date(year, month - 1, day);

}

function calendarFormatDate(dateString, options = {}) {

    const date = calendarParseDate(dateString);

    if (!date) return "";

    return date.toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options
    });

}

function calendarGetToday() {

    return localDateKey(new Date());

}


/* ==========================================
   33. CALENDAR MONTH NAVIGATION
========================================== */

function calendarChangeMonth(amount) {

    calendarCurrentDate = new Date(
        calendarCurrentDate.getFullYear(),
        calendarCurrentDate.getMonth() + amount,
        1
    );

    renderCalendar();

}

calendarPrevButton.addEventListener("click", () => {

    calendarChangeMonth(-1);

});

calendarNextButton.addEventListener("click", () => {

    calendarChangeMonth(1);

});

calendarTodayButton.addEventListener("click", () => {

    const today = new Date();

    calendarCurrentDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    calendarSelectedDate = localDateKey(today);

    renderCalendar();

});


/* ==========================================
   34. TASKS FOR A SPECIFIC DATE
========================================== */

function calendarGetTasksForDate(dateString) {

    return tasks
        .filter(task => task.dueDate === dateString)
        .sort((a, b) => {

            const priorityOrder = {
                high: 0,
                medium: 1,
                low: 2
            };

            if (a.status === "completed" &&
                b.status !== "completed") {
                return 1;
            }

            if (b.status === "completed" &&
                a.status !== "completed") {
                return -1;
            }

            return (
                priorityOrder[a.priority] -
                priorityOrder[b.priority]
            );

        });

}


/* ==========================================
   35. CREATE CALENDAR EVENT
========================================== */

function calendarCreateEvent(task) {

    const eventButton = document.createElement("button");

    eventButton.type = "button";

    eventButton.className = "calendar-event";

    eventButton.classList.add(
        task.status === "completed"
            ? "completed"
            : task.priority
    );

    eventButton.textContent = task.text;

    eventButton.title =
        `${task.text} - ${task.priority} priority`;

    eventButton.setAttribute(
        "aria-label",
        `Edit task: ${task.text}`
    );

    eventButton.addEventListener("click", event => {

        event.stopPropagation();

        openTaskModal(task.id);

    });

    return eventButton;

}


/* ==========================================
   36. CREATE CALENDAR DAY
========================================== */

function calendarCreateDay(date, otherMonth = false) {

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const dateString = calendarDateKey(
        year,
        month,
        day
    );

    const dayElement = document.createElement("div");

    dayElement.className = "calendar-day";
    dayElement.setAttribute("role", "gridcell");
    dayElement.tabIndex = 0;

    dayElement.dataset.date = dateString;

    if (otherMonth) {
        dayElement.classList.add("other-month");
    }

    if (dateString === calendarGetToday()) {
        dayElement.classList.add("today");
    }

    if (dateString === calendarSelectedDate) {
        dayElement.classList.add("selected");
        dayElement.setAttribute("aria-selected", "true");
    } else {
        dayElement.setAttribute("aria-selected", "false");
    }

    dayElement.setAttribute(
        "aria-label",
        calendarFormatDate(dateString, {
            weekday: "long",
            month: "long"
        })
    );

    // Day number

    const dayNumber = document.createElement("span");

    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;

    dayElement.appendChild(dayNumber);

    // Tasks for this day

    const dayTasks = calendarGetTasksForDate(dateString);

    const eventsContainer = document.createElement("div");

    eventsContainer.className = "calendar-day-events";

    // Show up to three tasks in the month grid.

    const visibleTasks = dayTasks.slice(0, 3);

    visibleTasks.forEach(task => {

        eventsContainer.appendChild(
            calendarCreateEvent(task)
        );

    });

    if (dayTasks.length > 3) {

        const more = document.createElement("span");

        more.className = "calendar-more-events";

        more.textContent =
            `+${dayTasks.length - 3} more`;

        eventsContainer.appendChild(more);

    }

    dayElement.appendChild(eventsContainer);

    // Select date

    function selectThisDate() {

        calendarSelectedDate = dateString;

        // Clicking an adjacent month's date
        // moves the calendar to that month.

        if (otherMonth) {

            calendarCurrentDate = new Date(
                year,
                month,
                1
            );

        }

        renderCalendar();

    }

    dayElement.addEventListener("click", selectThisDate);

    dayElement.addEventListener("keydown", event => {

        if (
            event.target === dayElement &&
            (event.key === "Enter" || event.key === " ")
        ) {

            event.preventDefault();

            selectThisDate();

        }

    });

    return dayElement;

}


/* ==========================================
   37. RENDER MONTHLY CALENDAR
========================================== */

function renderCalendar() {

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    calendarMonthTitle.textContent =
        `${CALENDAR_MONTHS[month]} ${year}`;

    calendarGrid.innerHTML = "";

    const firstDayOfMonth = new Date(
        year,
        month,
        1
    );

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    // JavaScript uses Sunday = 0.
    // We want Monday = 0.

    const firstWeekday =
        (firstDayOfMonth.getDay() + 6) % 7;

    // Previous month's trailing days

    for (let i = firstWeekday; i > 0; i--) {

        const date = new Date(
            year,
            month,
            1 - i
        );

        calendarGrid.appendChild(
            calendarCreateDay(date, true)
        );

    }

    // Current month's days

    for (let day = 1; day <= daysInMonth; day++) {

        const date = new Date(
            year,
            month,
            day
        );

        calendarGrid.appendChild(
            calendarCreateDay(date)
        );

    }

    // Fill remaining cells to complete the last week.

    const remainder = calendarGrid.children.length % 7;

    if (remainder !== 0) {

        const extraDays = 7 - remainder;

        for (let day = 1; day <= extraDays; day++) {

            const date = new Date(
                year,
                month + 1,
                day
            );

            calendarGrid.appendChild(
                calendarCreateDay(date, true)
            );

        }

    }

    renderCalendarSelectedDay();
    renderCalendarUpcoming();
    updateCalendarStats();

}


/* ==========================================
   38. SELECTED DAY PANEL
========================================== */

function renderCalendarSelectedDay() {

    const date = calendarParseDate(
        calendarSelectedDate
    );

    calendarSelectedTitle.textContent =
        date.toLocaleDateString("en-IE", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    const dayTasks = calendarGetTasksForDate(
        calendarSelectedDate
    );

    calendarSelectedSubtitle.textContent =
        dayTasks.length === 0
            ? "A little room to breathe."
            : `${dayTasks.length} ${
                dayTasks.length === 1 ? "task" : "tasks"
            } scheduled for this day.`;

    calendarDayTasks.innerHTML = "";

    calendarDayEmpty.hidden = dayTasks.length > 0;

    dayTasks.forEach(task => {

        const li = document.createElement("li");

        li.className = "calendar-task-item";

        if (task.status === "completed") {
            li.classList.add("completed");
        }

        const info = document.createElement("div");

        info.className = "calendar-task-info";

        const title = document.createElement("strong");

        title.className = "calendar-task-title";
        title.textContent = task.text;

        info.appendChild(title);

        const meta = document.createElement("div");

        meta.className = "calendar-task-meta";

        if (task.subject) {

            const subject = document.createElement("span");

            subject.className = "calendar-task-subject";
            subject.textContent = task.subject;

            meta.appendChild(subject);

        }

        const priority = document.createElement("span");

        priority.className =
            `calendar-task-priority ${task.priority}`;

        priority.textContent =
            task.priority.charAt(0).toUpperCase() +
            task.priority.slice(1);

        meta.appendChild(priority);

        if (task.status === "completed") {

            const completed = document.createElement("span");

            completed.className = "calendar-task-subject";
            completed.textContent = "✓ Completed";

            meta.appendChild(completed);

        }

        info.appendChild(meta);

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "calendar-task-edit";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {

            openTaskModal(task.id);

        });

        li.append(info, editButton);

        calendarDayTasks.appendChild(li);

    });

}


/* ==========================================
   39. UPCOMING DEADLINES PANEL
========================================== */

function renderCalendarUpcoming() {

    calendarUpcomingList.innerHTML = "";

    const today = calendarGetToday();

    const upcomingTasks = tasks
        .filter(task => {

            return (
                task.dueDate &&
                task.dueDate >= today &&
                task.status !== "completed"
            );

        })
        .sort((a, b) => {

            return a.dueDate.localeCompare(b.dueDate);

        })
        .slice(0, 6);

    calendarUpcomingEmpty.hidden =
        upcomingTasks.length > 0;

    upcomingTasks.forEach(task => {

        const li = document.createElement("li");

        li.className = "calendar-upcoming-item";

        const info = document.createElement("div");

        info.className = "calendar-task-info";

        const title = document.createElement("strong");

        title.className = "calendar-task-title";
        title.textContent = task.text;

        const meta = document.createElement("div");

        meta.className = "calendar-task-meta";

        if (task.subject) {

            const subject = document.createElement("span");

            subject.className = "calendar-task-subject";
            subject.textContent = task.subject;

            meta.appendChild(subject);

        }

        const priority = document.createElement("span");

        priority.className =
            `calendar-task-priority ${task.priority}`;

        priority.textContent = task.priority;

        meta.appendChild(priority);

        info.append(title, meta);

        const dateButton = document.createElement("button");

        dateButton.type = "button";
        dateButton.className = "calendar-task-edit";

        dateButton.textContent = calendarFormatDate(
            task.dueDate
        );

        dateButton.title = "View this date in the calendar";

        dateButton.addEventListener("click", () => {

            calendarGoToDate(task.dueDate);

        });

        li.append(info, dateButton);

        calendarUpcomingList.appendChild(li);

    });

}


/* ==========================================
   40. CALENDAR STATISTICS
========================================== */

function updateCalendarStats() {

    const today = calendarGetToday();

    const weekEnd = new Date();

    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekEndString = localDateKey(weekEnd);

    const unfinishedTasks = tasks.filter(task => {

        return (
            task.dueDate &&
            task.status !== "completed"
        );

    });

    const upcomingCount = unfinishedTasks.filter(task => {

        return task.dueDate >= today;

    }).length;

    const weekCount = unfinishedTasks.filter(task => {

        return (
            task.dueDate >= today &&
            task.dueDate <= weekEndString
        );

    }).length;

    const overdueCount = unfinishedTasks.filter(task => {

        return task.dueDate < today;

    }).length;

    document.getElementById(
        "calendar-upcoming-count"
    ).textContent = upcomingCount;

    document.getElementById(
        "calendar-week-count"
    ).textContent = weekCount;

    document.getElementById(
        "calendar-overdue-count"
    ).textContent = overdueCount;

}


/* ==========================================
   41. JUMP TO A SPECIFIC DATE
========================================== */

function calendarGoToDate(dateString) {

    const date = calendarParseDate(dateString);

    if (!date) return;

    calendarCurrentDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
    );

    calendarSelectedDate = dateString;

    renderCalendar();

}


/* ==========================================
   42. CREATE TASK FROM CALENDAR
========================================== */

function calendarOpenNewTask(dateString = null) {

    openTaskModal();

    if (dateString) {

        kanbanTaskDue.value = dateString;

    }

}

calendarNewTaskButton.addEventListener("click", () => {

    calendarOpenNewTask(calendarSelectedDate);

});

calendarAddDayTaskButton.addEventListener("click", () => {

    calendarOpenNewTask(calendarSelectedDate);

});


/* ==========================================
   43. CONNECT CALENDAR TO KANBAN
========================================== */

// Every time a task is created, edited,
// completed, moved, or deleted, the
// calendar must update automatically.
//
// We wrap the existing saveTasks function
// rather than creating a second task system.

const originalSaveTasks = saveTasks;

saveTasks = function () {

    originalSaveTasks();

    renderCalendar();

};


/* ==========================================
   44. INITIALIZE CALENDAR
========================================== */

function initializeCalendar() {

    const today = new Date();

    calendarCurrentDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    calendarSelectedDate = localDateKey(today);

    renderCalendar();

}

initializeCalendar();

/* ==========================================
   THE SCHOLAR'S DESK
   Version 0.6 - The Library
========================================== */


/* ==========================================
   45. LIBRARY ELEMENTS
========================================== */

const libraryBookGrid = document.getElementById(
    "library-book-grid"
);

const libraryEmpty = document.getElementById(
    "library-empty"
);

const librarySearch = document.getElementById(
    "library-search"
);

const libraryFilterButtons = document.querySelectorAll(
    ".library-filter"
);

const libraryAddBookButton = document.getElementById(
    "library-add-book"
);

const libraryEmptyAddButton = document.getElementById(
    "library-empty-add"
);

const libraryTotal = document.getElementById(
    "library-total"
);

const libraryReading = document.getElementById(
    "library-reading"
);

const libraryFinished = document.getElementById(
    "library-finished"
);


/* ==========================================
   46. BOOK MODAL ELEMENTS
========================================== */

const bookModal = document.getElementById(
    "book-modal"
);

const bookForm = document.getElementById(
    "book-form"
);

const bookModalTitle = document.getElementById(
    "book-modal-title"
);

const bookModalClose = document.getElementById(
    "book-modal-close"
);

const bookModalCancel = document.getElementById(
    "book-modal-cancel"
);

const bookEditId = document.getElementById(
    "book-edit-id"
);

const bookTitleInput = document.getElementById(
    "book-title"
);

const bookAuthorInput = document.getElementById(
    "book-author"
);

const bookCoverInput = document.getElementById(
    "book-cover"
);

const bookStatusInput = document.getElementById(
    "book-status"
);

const bookRatingInput = document.getElementById(
    "book-rating"
);

const bookTotalPagesInput = document.getElementById(
    "book-total-pages"
);

const bookCurrentPageInput = document.getElementById(
    "book-current-page"
);

const bookNotesInput = document.getElementById(
    "book-notes"
);

const bookQuoteInput = document.getElementById(
    "book-quote"
);


/* ==========================================
   47. LIBRARY STORAGE
========================================== */

const LIBRARY_STORAGE_KEY = "scholar-library";

function loadLibraryBooks() {

    try {

        const savedBooks = localStorage.getItem(
            LIBRARY_STORAGE_KEY
        );

        if (!savedBooks) {
            return [];
        }

        const parsedBooks = JSON.parse(savedBooks);

        return Array.isArray(parsedBooks)
            ? parsedBooks
            : [];

    } catch (error) {

        console.error(
            "Unable to load library:",
            error
        );

        return [];

    }

}

let libraryBooks = loadLibraryBooks();

let activeLibraryFilter = "all";

function saveLibraryBooks() {

    try {

        localStorage.setItem(
            LIBRARY_STORAGE_KEY,
            JSON.stringify(libraryBooks)
        );

        renderLibrary();

        return true;

    } catch (error) {

        console.error(
            "Unable to save library:",
            error
        );

        alert(
            "Your book could not be saved. " +
            "Please check your browser storage."
        );

        return false;

    }

}


/* ==========================================
   48. LIBRARY HELPERS
========================================== */

function libraryCreateId() {

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();

    }

    return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2)
    );

}

function libraryGetStatusLabel(status) {

    const labels = {
        want: "Want to Read",
        reading: "Reading",
        finished: "Finished"
    };

    return labels[status] || "Want to Read";

}

function libraryGetProgress(book) {

    const totalPages = Number(book.totalPages) || 0;

    const currentPage = Number(book.currentPage) || 0;

    if (book.status === "finished") {
        return 100;
    }

    if (totalPages <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            0,
            Math.round(
                (currentPage / totalPages) * 100
            )
        )
    );

}


/* ==========================================
   49. LIBRARY STATISTICS
========================================== */

function updateLibraryStats() {

    libraryTotal.textContent = libraryBooks.length;

    libraryReading.textContent = libraryBooks.filter(
        book => book.status === "reading"
    ).length;

    libraryFinished.textContent = libraryBooks.filter(
        book => book.status === "finished"
    ).length;

}


/* ==========================================
   50. LIBRARY FILTERS
========================================== */

function getFilteredLibraryBooks() {

    const searchTerm = librarySearch.value
        .trim()
        .toLowerCase();

    return libraryBooks.filter(book => {

        const matchesStatus =
            activeLibraryFilter === "all" ||
            book.status === activeLibraryFilter;

        const searchableText = [
            book.title,
            book.author,
            book.notes
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            searchableText.includes(searchTerm);

        return matchesStatus && matchesSearch;

    });

}

librarySearch.addEventListener("input", () => {

    renderLibrary();

});

libraryFilterButtons.forEach(button => {

    button.addEventListener("click", () => {

        activeLibraryFilter = button.dataset.filter;

        libraryFilterButtons.forEach(filterButton => {

            const isActive =
                filterButton === button;

            filterButton.classList.toggle(
                "active",
                isActive
            );

            filterButton.setAttribute(
                "aria-pressed",
                String(isActive)
            );

        });

        renderLibrary();

    });

});


/* ==========================================
   51. CREATE BOOK COVER
========================================== */

function libraryCreateCover(book) {

    const cover = document.createElement("div");

    cover.className = "library-book-cover";

    function showPlaceholder() {

        cover.replaceChildren();

        const placeholder = document.createElement("div");

        placeholder.className =
            "library-book-placeholder";

        const icon = document.createElement("span");

        icon.className =
            "library-book-placeholder-icon";

        icon.textContent = "✦";

        const title = document.createElement("span");

        title.className =
            "library-book-placeholder-title";

        title.textContent = book.title;

        const author = document.createElement("span");

        author.className =
            "library-book-placeholder-author";

        author.textContent = book.author;

        placeholder.append(
            icon,
            title,
            author
        );

        cover.appendChild(placeholder);

    }

    if (book.cover) {

        const image = document.createElement("img");

        image.src = book.cover;

        image.alt = `Cover of ${book.title}`;

        image.loading = "lazy";

        image.addEventListener("error", () => {

            showPlaceholder();

        });

        cover.appendChild(image);

    } else {

        showPlaceholder();

    }

    // Reading status ribbon

    const statusBadge = document.createElement("span");

    statusBadge.className =
        `library-status-badge ${book.status}`;

    statusBadge.textContent =
        libraryGetStatusLabel(book.status);

    cover.appendChild(statusBadge);

    return cover;

}


/* ==========================================
   52. CREATE READING PROGRESS
========================================== */

function libraryCreateProgress(book) {

    const section = document.createElement("div");

    section.className = "library-progress-section";

    const heading = document.createElement("div");

    heading.className = "library-progress-heading";

    const label = document.createElement("span");

    label.textContent = "Reading Progress";

    const percentage = document.createElement("strong");

    const progress = libraryGetProgress(book);

    percentage.textContent = `${progress}%`;

    heading.append(label, percentage);

    const track = document.createElement("div");

    track.className = "library-progress-track";

    track.setAttribute("role", "progressbar");

    track.setAttribute(
        "aria-label",
        `Reading progress for ${book.title}`
    );

    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");

    track.setAttribute(
        "aria-valuenow",
        String(progress)
    );

    const fill = document.createElement("div");

    fill.className = "library-progress-fill";

    fill.style.width = `${progress}%`;

    track.appendChild(fill);

    const pages = document.createElement("p");

    pages.className = "library-progress-pages";

    const total = Number(book.totalPages) || 0;

    const current = Number(book.currentPage) || 0;

    if (total > 0) {

        pages.textContent =
            `${Math.min(current, total)} / ${total} pages`;

    } else {

        pages.textContent = "Page count not set";

    }

    section.append(
        heading,
        track,
        pages
    );

    return section;

}


/* ==========================================
   53. CREATE BOOK CARD
========================================== */

function libraryCreateBookCard(book) {

    const card = document.createElement("article");

    card.className = "library-book-card";

    card.dataset.bookId = book.id;

    // Cover

    card.appendChild(
        libraryCreateCover(book)
    );

    // Information

    const info = document.createElement("div");

    info.className = "library-book-info";

    const title = document.createElement("h3");

    title.className = "library-book-title";
    title.textContent = book.title;

    const author = document.createElement("p");

    author.className = "library-book-author";
    author.textContent = `by ${book.author}`;

    info.append(title, author);

    // Rating

    const rating = document.createElement("div");

    rating.className = "library-book-rating";

    const stars = Number(book.rating) || 0;

    if (stars > 0) {

        rating.textContent =
            "★".repeat(stars) +
            "☆".repeat(5 - stars);

        rating.setAttribute(
            "aria-label",
            `${stars} out of 5 stars`
        );

    } else {

        rating.textContent = "Not yet rated";
        rating.classList.add("empty");

    }

    info.appendChild(rating);

    // Progress

    info.appendChild(
        libraryCreateProgress(book)
    );

    // Action buttons

    const actions = document.createElement("div");

    actions.className = "library-book-actions";

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "library-book-edit";
    editButton.textContent = "View / Edit";

    editButton.addEventListener("click", () => {

        openBookModal(book.id);

    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "library-book-delete";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {

        deleteLibraryBook(book.id);

    });

    actions.append(
        editButton,
        deleteButton
    );

    info.appendChild(actions);

    card.appendChild(info);

    return card;

}


/* ==========================================
   54. RENDER LIBRARY
========================================== */

function renderLibrary() {

    updateLibraryStats();

    const filteredBooks = getFilteredLibraryBooks();

    libraryBookGrid.replaceChildren();

    filteredBooks.forEach(book => {

        libraryBookGrid.appendChild(
            libraryCreateBookCard(book)
        );

    });

    const hasBooks = libraryBooks.length > 0;

    const hasResults = filteredBooks.length > 0;

    libraryEmpty.hidden = hasResults;

    if (!hasResults) {

        const emptyHeading = libraryEmpty.querySelector(
            "h3"
        );

        const emptyDescription = libraryEmpty.querySelector(
            "p"
        );

        if (!hasBooks) {

            emptyHeading.textContent =
                "Your bookshelf awaits.";

            emptyDescription.textContent =
                "Every great library begins with a single book.";

            libraryEmptyAddButton.hidden = false;

        } else {

            emptyHeading.textContent =
                "No books found.";

            emptyDescription.textContent =
                "Try another search or reading status.";

            libraryEmptyAddButton.hidden = true;

        }

    }

}


/* ==========================================
   55. OPEN BOOK MODAL
========================================== */

function openBookModal(bookId = null) {

    bookForm.reset();

    bookEditId.value = "";

    bookModalTitle.textContent = "Add a Book";

    bookStatusInput.value = "want";
    bookRatingInput.value = "0";

    bookTotalPagesInput.value = "0";
    bookCurrentPageInput.value = "0";

    if (bookId) {

        const book = libraryBooks.find(
            item => item.id === bookId
        );

        if (!book) return;

        bookModalTitle.textContent = "Edit Book";

        bookEditId.value = book.id;

        bookTitleInput.value = book.title || "";
        bookAuthorInput.value = book.author || "";
        bookCoverInput.value = book.cover || "";

        bookStatusInput.value = book.status || "want";

        bookRatingInput.value = String(
            book.rating || 0
        );

        bookTotalPagesInput.value =
            book.totalPages || 0;

        bookCurrentPageInput.value =
            book.currentPage || 0;

        bookNotesInput.value = book.notes || "";
        bookQuoteInput.value = book.quote || "";

    }

    bookModal.showModal();

    bookTitleInput.focus();

}


/* ==========================================
   56. CLOSE BOOK MODAL
========================================== */

function closeBookModal() {

    bookModal.close();

}

bookModalClose.addEventListener(
    "click",
    closeBookModal
);

bookModalCancel.addEventListener(
    "click",
    closeBookModal
);

libraryAddBookButton.addEventListener("click", () => {

    openBookModal();

});

libraryEmptyAddButton.addEventListener("click", () => {

    openBookModal();

});


/* ==========================================
   57. SAVE BOOK
========================================== */

bookForm.addEventListener("submit", event => {

    event.preventDefault();

    const title = bookTitleInput.value.trim();

    const author = bookAuthorInput.value.trim();

    if (!title || !author) {

        alert("Please enter a book title and author.");

        return;

    }

    const totalPages = Number(
        bookTotalPagesInput.value
    );

    const currentPage = Number(
        bookCurrentPageInput.value
    );

    if (
        !Number.isSafeInteger(totalPages) ||
        !Number.isSafeInteger(currentPage) ||
        totalPages < 0 ||
        currentPage < 0
    ) {

        alert(
            "Please enter valid, non-negative page numbers."
        );

        return;

    }

    if (
        totalPages > 0 &&
        currentPage > totalPages
    ) {

        alert(
            "Your current page cannot exceed " +
            "the total number of pages."
        );

        return;

    }

    const status = bookStatusInput.value;

    const updatedCurrentPage =
        status === "finished" && totalPages > 0
            ? totalPages
            : currentPage;

    const bookData = {

        title: title,

        author: author,

        cover: bookCoverInput.value.trim(),

        status: status,

        rating: Number(bookRatingInput.value),

        totalPages: totalPages,

        currentPage: updatedCurrentPage,

        notes: bookNotesInput.value.trim(),

        quote: bookQuoteInput.value.trim()

    };

    const existingId = bookEditId.value;

    const previousBooks = [...libraryBooks];

    if (existingId) {

        const index = libraryBooks.findIndex(
            book => book.id === existingId
        );

        if (index === -1) return;

        libraryBooks[index] = {

            ...libraryBooks[index],
            ...bookData,

            updatedAt: new Date().toISOString()

        };

    } else {

        const newBook = {

            id: libraryCreateId(),

            ...bookData,

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()

        };

        libraryBooks.push(newBook);

    }

    if (saveLibraryBooks()) {

        closeBookModal();

    } else {

        libraryBooks = previousBooks;

    }

});


/* ==========================================
   58. DELETE BOOK
========================================== */

function deleteLibraryBook(bookId) {

    const book = libraryBooks.find(
        item => item.id === bookId
    );

    if (!book) return;

    const confirmed = confirm(
        `Remove "${book.title}" from your library?`
    );

    if (!confirmed) return;

    const previousBooks = [...libraryBooks];

    libraryBooks = libraryBooks.filter(
        item => item.id !== bookId
    );

    if (!saveLibraryBooks()) {

        libraryBooks = previousBooks;

    }

}


/* ==========================================
   59. INITIALIZE LIBRARY
========================================== */

function initializeLibrary() {

    renderLibrary();

}

initializeLibrary();

/* ==========================================
   THE SCHOLAR'S DESK
   Version 0.7 - The Study Journal
========================================== */

(() => {
    "use strict";

    /* ======================================
       78. JOURNAL ELEMENTS
    ====================================== */

    const journal = {
        newButton: document.getElementById("journal-new-note"),
        emptyNewButton: document.getElementById("journal-empty-new-note"),
        search: document.getElementById("journal-search"),
        subjectFilter: document.getElementById("journal-subject-filter"),
        filters: document.querySelectorAll(".journal-filter"),
        list: document.getElementById("journal-notes-list"),
        listEmpty: document.getElementById("journal-list-empty"),
        editorEmpty: document.getElementById("journal-editor-empty"),
        workspace: document.getElementById("journal-editor-workspace"),

        title: document.getElementById("journal-note-title"),
        subject: document.getElementById("journal-note-subject"),
        status: document.getElementById("journal-note-status"),
        content: document.getElementById("journal-note-content"),

        toolbar: document.getElementById("journal-toolbar"),
        textStyle: document.getElementById("journal-text-style"),
        pin: document.getElementById("journal-pin-note"),
        exportNote: document.getElementById("journal-export-note"),
        deleteNote: document.getElementById("journal-delete-note"),

        saveIndicator: document.getElementById("journal-save-indicator"),
        wordCount: document.getElementById("journal-word-count"),
        lastEdited: document.getElementById("journal-last-edited"),

        total: document.getElementById("journal-total-notes"),
        subjects: document.getElementById("journal-subject-count"),
        revision: document.getElementById("journal-revision-count"),

        exportAll: document.getElementById("journal-export-all")
    };

    const STORAGE_KEY = "scholar-study-journal-v1";

    const VALID_STATUSES = ["normal", "revision", "mastered"];

    const ALLOWED_TAGS = new Set([
        "P", "DIV", "BR", "H1", "H2", "H3",
        "STRONG", "B", "EM", "I", "U",
        "S", "STRIKE", "UL", "OL", "LI",
        "BLOCKQUOTE", "SPAN", "FONT", "A"
    ]);

    let notes = [];
    let selectedNoteId = null;
    let activeFilter = "all";
    let saveTimer = null;
    let storageAvailable = true;
    let journalDirty = false;
    let savedSelection = null;


    /* ======================================
       79. STORAGE AND SAFE HTML
    ====================================== */

    function cleanHTML(html) {
        const template = document.createElement("template");
        template.innerHTML = String(html || "");

        const blockedTags = new Set([
            "SCRIPT", "STYLE", "IFRAME", "OBJECT",
            "EMBED", "SVG", "MATH", "FORM",
            "INPUT", "BUTTON", "VIDEO", "AUDIO"
        ]);

        function cleanNode(parent) {
            for (const node of [...parent.childNodes]) {
                if (node.nodeType === Node.COMMENT_NODE) {
                    node.remove();
                    continue;
                }

                if (node.nodeType !== Node.ELEMENT_NODE) {
                    continue;
                }

                const tag = node.tagName;

                if (blockedTags.has(tag)) {
                    node.remove();
                    continue;
                }

                cleanNode(node);

                if (!ALLOWED_TAGS.has(tag)) {
                    node.replaceWith(...node.childNodes);
                    continue;
                }

                const attributes = [...node.attributes];

                for (const attribute of attributes) {
                    const name = attribute.name.toLowerCase();
                    const value = attribute.value;

                    let allowed = false;

                    if (tag === "A" && name === "href") {
                        try {
                            const url = new URL(value, location.href);
                            allowed = ["http:", "https:"].includes(url.protocol);
                        } catch {
                            allowed = false;
                        }
                    }

                    if (name === "style") {
                        const safeStyles = [];

                        for (const declaration of value.split(";")) {
                            const separator = declaration.indexOf(":");

                            if (separator === -1) continue;

                            const property = declaration
                                .slice(0, separator)
                                .trim()
                                .toLowerCase();

                            const styleValue = declaration
                                .slice(separator + 1)
                                .trim()
                                .toLowerCase();

                            if (
                                ["background-color", "color"].includes(property) &&
                                /^(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\)|[a-z]+)$/.test(styleValue)
                            ) {
                                safeStyles.push(`${property}: ${styleValue}`);
                            }

                            if (
                                property === "text-align" &&
                                ["left", "right", "center", "justify"].includes(styleValue)
                            ) {
                                safeStyles.push(`${property}: ${styleValue}`);
                            }
                        }

                        if (safeStyles.length) {
                            node.setAttribute("style", safeStyles.join("; "));
                            allowed = true;
                        }
                    }

                    if (!allowed) {
                        node.removeAttribute(attribute.name);
                    }
                }
            }
        }

        cleanNode(template.content);

        return template.innerHTML;
    }

    function normalizeNote(note) {
        if (!note || typeof note !== "object") return null;

        return {
            id: String(note.id || createId()),
            title: String(note.title || "").slice(0, 200),
            subject: String(note.subject || "").slice(0, 100),
            status: VALID_STATUSES.includes(note.status)
                ? note.status
                : "normal",
            content: cleanHTML(note.content),
            pinned: note.pinned === true,
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString()
        };
    }

    function createId() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function loadNotes() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) return [];

            const parsed = JSON.parse(stored);

            if (!Array.isArray(parsed)) {
                throw new Error("Invalid journal data");
            }

            return parsed.map(normalizeNote).filter(Boolean);
        } catch (error) {
            console.error("Could not load journal:", error);
            storageAvailable = false;

            alert(
                "The Study Journal could not read its saved data. " +
                "Please do not clear your browser storage. " +
                "Check the console before continuing."
            );

            return [];
        }
    }

    function persistNotes() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            storageAvailable = true;
            journalDirty = false;
            return true;
        } catch (error) {
            console.error("Journal save failed:", error);
            storageAvailable = false;
            journalDirty = true;
            showSaveStatus("Save failed. Export a backup.", "error");
            return false;
        }
    }


    /* ======================================
       80. FORMATTING AND DATES
    ====================================== */

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown date";
        }

        return date.toLocaleDateString("en-IE", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function plainText(html) {
        const container = document.createElement("div");
        container.innerHTML = cleanHTML(html);
        return container.textContent || "";
    }

    function countWords(text) {
        const trimmed = text.trim();

        return trimmed
            ? trimmed.split(/\s+/u).length
            : 0;
    }

    function updateWordCount() {
        const count = countWords(journal.content.innerText || "");

        journal.wordCount.textContent =
            `${count} ${count === 1 ? "word" : "words"}`;
    }

    function showSaveStatus(message, state = "") {
        journal.saveIndicator.textContent = message;
        journal.saveIndicator.className = "journal-save-indicator";

        if (state) {
            journal.saveIndicator.classList.add(state);
        }
    }

    function currentNote() {
        return notes.find(note => note.id === selectedNoteId) || null;
    }


    /* ======================================
       81. STATISTICS AND SUBJECTS
    ====================================== */

    function updateStatistics() {
        journal.total.textContent = notes.length;

        const subjects = new Set(
            notes
                .map(note => note.subject.trim().toLowerCase())
                .filter(Boolean)
        );

        journal.subjects.textContent = subjects.size;

        journal.revision.textContent = notes.filter(
            note => note.status === "revision"
        ).length;
    }

    function updateSubjectFilter() {
        const previous = journal.subjectFilter.value;

        const subjects = [...new Set(
            notes.map(note => note.subject.trim()).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));

        journal.subjectFilter.replaceChildren();

        const all = new Option("All Subjects", "all");
        journal.subjectFilter.appendChild(all);

        for (const subject of subjects) {
            journal.subjectFilter.appendChild(
                new Option(subject, subject)
            );
        }

        journal.subjectFilter.value = subjects.includes(previous)
            ? previous
            : "all";
    }


    /* ======================================
       82. NOTE ARCHIVE
    ====================================== */

    function getVisibleNotes() {
        const query = journal.search.value.trim().toLowerCase();
        const subject = journal.subjectFilter.value;

        return notes
            .filter(note => {
                const matchesSubject =
                    subject === "all" || note.subject === subject;

                const matchesFilter =
                    activeFilter === "all" ||
                    (activeFilter === "pinned" && note.pinned) ||
                    (activeFilter === "revision" && note.status === "revision");

                const searchable = [
                    note.title,
                    note.subject,
                    plainText(note.content)
                ].join(" ").toLowerCase();

                return (
                    matchesSubject &&
                    matchesFilter &&
                    searchable.includes(query)
                );
            })
            .sort((a, b) => {
                if (a.pinned !== b.pinned) {
                    return a.pinned ? -1 : 1;
                }

                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });
    }

    function createNoteCard(note) {
        const card = document.createElement("button");

        card.type = "button";
        card.className = "journal-note-card";

        if (note.id === selectedNoteId) {
            card.classList.add("active");
        }

        const top = document.createElement("div");
        top.className = "journal-card-top";

        const subject = document.createElement("span");
        subject.className = "journal-card-subject";
        subject.textContent = note.subject || "Uncategorised";

        top.appendChild(subject);

        if (note.pinned) {
            const pin = document.createElement("span");
            pin.className = "journal-card-pin";
            pin.textContent = "✦";
            pin.setAttribute("aria-label", "Pinned");
            top.appendChild(pin);
        }

        const title = document.createElement("h3");
        title.className = "journal-card-title";
        title.textContent = note.title || "Untitled Note";

        const preview = document.createElement("p");
        preview.className = "journal-card-preview";
        preview.textContent =
            plainText(note.content).trim() ||
            "A blank page waiting for ideas...";

        const bottom = document.createElement("div");
        bottom.className = "journal-card-bottom";

        const date = document.createElement("span");
        date.className = "journal-card-date";
        date.textContent = formatDate(note.updatedAt);

        bottom.appendChild(date);

        if (note.status !== "normal") {
            const badge = document.createElement("span");
            badge.className = `journal-card-status ${note.status}`;
            badge.textContent = note.status === "revision"
                ? "Needs Revision"
                : "Mastered";

            bottom.appendChild(badge);
        }

        card.append(top, title, preview, bottom);

        card.addEventListener("click", () => {
            openNote(note.id);
        });

        return card;
    }

    function renderArchive() {
        updateStatistics();
        updateSubjectFilter();

        journal.list.replaceChildren();

        const visible = getVisibleNotes();

        for (const note of visible) {
            journal.list.appendChild(createNoteCard(note));
        }

        journal.listEmpty.hidden = visible.length > 0;

        if (!visible.length) {
            const heading = journal.listEmpty.querySelector("h3");
            const message = journal.listEmpty.querySelector("p");

            if (!notes.length) {
                heading.textContent = "Your archive awaits.";
                message.textContent = "Begin with your first study note.";
            } else {
                heading.textContent = "No matching notes.";
                message.textContent = "Try another search or filter.";
            }
        }
    }


    /* ======================================
       83. OPEN AND CREATE NOTES
    ====================================== */

    function showEmptyEditor() {
        selectedNoteId = null;
        journal.editorEmpty.hidden = false;
        journal.workspace.hidden = true;
        renderArchive();
    }

    function openNote(id) {
        flushPendingSave();

        const note = notes.find(item => item.id === id);

        if (!note) return;

        selectedNoteId = note.id;

        journal.editorEmpty.hidden = true;
        journal.workspace.hidden = false;

        journal.title.value = note.title;
        journal.subject.value = note.subject;
        journal.status.value = note.status;
        journal.content.innerHTML = cleanHTML(note.content);

        journal.pin.classList.toggle("active", note.pinned);
        journal.pin.setAttribute("aria-pressed", String(note.pinned));
        journal.pin.setAttribute(
            "aria-label",
            note.pinned ? "Unpin note" : "Pin note"
        );

        journal.lastEdited.textContent =
            `Edited ${formatDate(note.updatedAt)}`;

        journal.textStyle.value = "p";
        savedSelection = null;

        updateWordCount();
        showSaveStatus("All changes saved", "saved");
        renderArchive();
    }

    function createNote() {
        flushPendingSave();

        const now = new Date().toISOString();

        const note = {
            id: createId(),
            title: "",
            subject: "",
            status: "normal",
            content: "",
            pinned: false,
            createdAt: now,
            updatedAt: now
        };

        notes.unshift(note);

        if (!persistNotes()) {
            notes.shift();
            alert(
                "The note could not be created. " +
                "Please free some browser storage first."
            );
            return;
        }

        openNote(note.id);
        journal.title.focus();
    }


    /* ======================================
       84. AUTOSAVE
    ====================================== */

    function captureEditor() {
        const note = currentNote();

        if (!note) return;

        note.title = journal.title.value.trim().slice(0, 200);
        note.subject = journal.subject.value.trim().slice(0, 100);
        note.status = VALID_STATUSES.includes(journal.status.value)
            ? journal.status.value
            : "normal";

        note.content = cleanHTML(journal.content.innerHTML);
        note.updatedAt = new Date().toISOString();

        journalDirty = true;
        showSaveStatus("Unsaved changes", "saving");
        updateWordCount();
    }

    function saveCurrentNote() {
        if (!selectedNoteId) return true;

        captureEditor();

        if (persistNotes()) {
            const note = currentNote();

            journal.lastEdited.textContent =
                `Edited ${formatDate(note.updatedAt)}`;

            showSaveStatus("All changes saved", "saved");
            renderArchive();
            return true;
        }

        return false;
    }

    function scheduleSave() {
        captureEditor();

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            saveTimer = null;
            saveCurrentNote();
        }, 650);
    }

    function flushPendingSave() {
        if (saveTimer !== null) {
            clearTimeout(saveTimer);
            saveTimer = null;
        }

        if (journalDirty && selectedNoteId) {
            return saveCurrentNote();
        }

        return true;
    }

    document.addEventListener("scholar:flush-journal", event => {
        event.detail.saved = flushPendingSave();
    });

    for (const field of [journal.title, journal.subject]) {
        field.addEventListener("input", scheduleSave);
    }

    journal.content.addEventListener("input", scheduleSave);

    journal.status.addEventListener("change", () => {
        saveCurrentNote();
    });

    journal.content.addEventListener("blur", () => {
        flushPendingSave();
    });

    window.addEventListener("beforeunload", event => {
        flushPendingSave();

        if (journalDirty) {
            event.preventDefault();
            event.returnValue = "";
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            flushPendingSave();
        }
    });


    /* ======================================
       85. RICH TEXT FORMATTING
    ====================================== */

    function rememberSelection() {
        const selection = window.getSelection();

        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        if (journal.content.contains(range.commonAncestorContainer)) {
            savedSelection = range.cloneRange();
        }
    }

    function restoreSelection() {
        journal.content.focus();

        if (!savedSelection) return;

        try {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedSelection);
        } catch {
            savedSelection = null;
        }
    }

    journal.content.addEventListener("keyup", rememberSelection);
    journal.content.addEventListener("mouseup", rememberSelection);

    journal.toolbar.addEventListener("mousedown", event => {
        if (event.target.closest("button")) {
            event.preventDefault();
        }
    });

    function applyCommand(command, value = null) {
        if (!currentNote()) return;

        restoreSelection();

        document.execCommand(command, false, value);

        rememberSelection();
        scheduleSave();
    }

    journal.toolbar.querySelectorAll("[data-command]").forEach(button => {
        button.addEventListener("click", () => {
            applyCommand(
                button.dataset.command,
                button.dataset.value || null
            );
        });
    });

    journal.textStyle.addEventListener("change", () => {
        if (!currentNote()) return;

        restoreSelection();

        document.execCommand(
            "formatBlock",
            false,
            journal.textStyle.value
        );

        rememberSelection();
        scheduleSave();
    });

    journal.content.addEventListener("paste", event => {
        event.preventDefault();

        const text = event.clipboardData.getData("text/plain");

        document.execCommand("insertText", false, text);

        scheduleSave();
    });


    /* ======================================
       86. PIN AND DELETE
    ====================================== */

    journal.pin.addEventListener("click", () => {
        const note = currentNote();

        if (!note) return;

        flushPendingSave();

        note.pinned = !note.pinned;
        note.updatedAt = new Date().toISOString();

        journalDirty = true;

        if (persistNotes()) {
            journal.pin.classList.toggle("active", note.pinned);
            journal.pin.setAttribute("aria-pressed", String(note.pinned));
            journal.pin.setAttribute(
                "aria-label",
                note.pinned ? "Unpin note" : "Pin note"
            );

            renderArchive();
        }
    });

    journal.deleteNote.addEventListener("click", () => {
        const note = currentNote();

        if (!note) return;

        const confirmed = confirm(
            `Permanently delete "${note.title || "Untitled Note"}"?\n\n` +
            "This cannot be undone."
        );

        if (!confirmed) return;

        clearTimeout(saveTimer);
        saveTimer = null;

        const oldNotes = [...notes];

        notes = notes.filter(item => item.id !== note.id);

        if (persistNotes()) {
            showEmptyEditor();
        } else {
            notes = oldNotes;
        }
    });


    /* ======================================
       87. EXPORT HELPERS
    ====================================== */

    function safeFilename(name) {
        return (
            String(name || "Untitled Note")
                .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
                .trim()
                .slice(0, 80) || "Untitled Note"
        );
    }

    function downloadFile(filename, contents, mimeType) {
        const blob = new Blob([contents], {
            type: mimeType
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function escapeHTML(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }


    /* ======================================
       88. EXPORT INDIVIDUAL NOTE
    ====================================== */

    journal.exportNote.addEventListener("click", () => {
        flushPendingSave();

        const note = currentNote();

        if (!note) return;

        const title = note.title || "Untitled Note";

        const documentHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)}</title>
<style>
body {
    max-width: 820px;
    margin: 50px auto;
    padding: 30px;
    font-family: Georgia, serif;
    color: #352b24;
    line-height: 1.8;
}
h1, h2, h3 {
    color: #3d2c23;
}
blockquote {
    border-left: 4px solid #a47b52;
    padding-left: 20px;
    color: #5a4130;
}
.meta {
    color: #7b6958;
    font-size: 14px;
}
</style>
</head>
<body>
<h1>${escapeHTML(title)}</h1>
<p class="meta">
${escapeHTML(note.subject || "Uncategorised")}
 | ${escapeHTML(formatDate(note.updatedAt))}
</p>
<hr>
${cleanHTML(note.content)}
</body>
</html>`;

        downloadFile(
            `${safeFilename(title)}.html`,
            documentHTML,
            "text/html;charset=utf-8"
        );
    });


    /* ======================================
       89. EXPORT FULL JOURNAL BACKUP
    ====================================== */

    journal.exportAll.addEventListener("click", () => {
        flushPendingSave();

        const backup = {
            application: "The Scholar's Desk",
            version: "0.7",
            exportedAt: new Date().toISOString(),
            notes: notes.map(note => ({
                ...note,
                content: cleanHTML(note.content)
            }))
        };

        const date = new Date().toISOString().slice(0, 10);

        downloadFile(
            `scholars-desk-journal-${date}.json`,
            JSON.stringify(backup, null, 2),
            "application/json;charset=utf-8"
        );
    });


    /* ======================================
       90. SEARCH AND FILTER EVENTS
    ====================================== */

    journal.search.addEventListener("input", renderArchive);

    journal.subjectFilter.addEventListener("change", renderArchive);

    journal.filters.forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter;

            journal.filters.forEach(item => {
                const active = item === button;

                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            renderArchive();
        });
    });


    /* ======================================
       91. NEW NOTE BUTTONS
    ====================================== */

    journal.newButton.addEventListener("click", createNote);

    journal.emptyNewButton.addEventListener("click", createNote);


    /* ======================================
       92. INITIALISE JOURNAL
    ====================================== */

    function initialiseJournal() {
        notes = loadNotes();

        renderArchive();
        showEmptyEditor();
    }

    initialiseJournal();

})();

/* ==========================================
   THE SCHOLAR'S DESK
   Version 0.8 - Settings & Personalisation
   APPEND TO THE END OF script.js
========================================== */

(function initialiseScholarSettings() {
    "use strict";

    const STORAGE_KEYS = [
        "scholar-tasks",
        "scholar-focus-minutes",
        "scholar-sessions",
        "scholar-focus-preferences",
        "scholar-focus-history",
        "scholar-library",
        "scholar-study-journal-v1",
        "scholar-settings-v1"
    ];

    const SETTINGS_KEY = "scholar-settings-v1";
    const BACKUP_MARKER = "the-scholars-desk";
    const BACKUP_VERSION = 1;

    const $ = (id) => document.getElementById(id);

    const exportButton = $("settings-export-backup");
    const importInput = $("settings-import-file");
    const importPreview = $("settings-import-preview");
    const importFilename = $("settings-import-filename");
    const importSummary = $("settings-import-summary");
    const restoreButton = $("settings-restore-backup");
    const cancelButton = $("settings-cancel-restore");
    const backupMessage = $("settings-backup-message");
    const lastBackupLabel = $("settings-last-backup");

    const themeRadios = document.querySelectorAll(
        'input[name="settings-theme"]'
    );

    const reducedMotion = $("settings-reduced-motion");
    const appearanceMessage = $("settings-appearance-message");

    const personalForm = $("settings-personalisation-form");
    const displayNameInput = $("settings-display-name");
    const welcomeMessageInput = $("settings-welcome-message");
    const personalMessage = $("settings-personal-message");

    const storageUsed = $("settings-storage-used");
    const refreshStorage = $("settings-refresh-storage");

    const taskCount = $("settings-task-count");
    const noteCount = $("settings-note-count");
    const bookCount = $("settings-book-count");

    let pendingBackup = null;

    const defaultSettings = {
        theme: "classic",
        reducedMotion: false,
        displayName: "Scholar",
        welcomeMessage:
            "A quiet space for your brightest ideas.",
        lastBackup: null
    };

    function showMessage(element, message, error = false) {
        if (!element) return;

        element.textContent = message;
        element.style.color = error
            ? "#F5C3B9"
            : "var(--accent-gold)";
    }

    function readStoredJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (error) {
            console.warn("Could not read:", key, error);
            return fallback;
        }
    }

    function loadSettings() {
        const saved = readStoredJSON(SETTINGS_KEY, {});

        return {
            ...defaultSettings,
            ...(saved &&
            typeof saved === "object" &&
            !Array.isArray(saved)
                ? saved
                : {})
        };
    }

    let settings = loadSettings();

    function saveSettings() {
        try {
            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );
            return true;
        } catch (error) {
            console.error("Settings save failed:", error);
            return false;
        }
    }

    /* ==========================================
       93. APPEARANCE
    ========================================== */

    function applyAppearance() {
        const theme = settings.theme === "dark"
            ? "dark"
            : "classic";

        document.documentElement.dataset.theme = theme;
        document.body.dataset.theme = theme;

        document.documentElement.classList.toggle(
            "reduce-motion",
            settings.reducedMotion === true
        );

        document.body.classList.toggle(
            "reduce-motion",
            settings.reducedMotion === true
        );

        themeRadios.forEach((radio) => {
            radio.checked = radio.value === theme;
        });

        if (reducedMotion) {
            reducedMotion.checked =
                settings.reducedMotion === true;
        }
    }

    themeRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (!radio.checked) return;

            settings.theme = radio.value;
            applyAppearance();

            showMessage(
                appearanceMessage,
                saveSettings()
                    ? "Your new theme has been saved."
                    : "Theme applied, but could not be saved.",
                false
            );
        });
    });

    if (reducedMotion) {
        reducedMotion.addEventListener("change", () => {
            settings.reducedMotion =
                reducedMotion.checked;

            applyAppearance();

            showMessage(
                appearanceMessage,
                saveSettings()
                    ? "Animation preference saved."
                    : "Could not save animation preference."
            );
        });
    }

    /* ==========================================
       94. PERSONALISATION
    ========================================== */

    function applyPersonalisation() {
        const dashboard = $("dashboard");

        if (!dashboard) return;

        const heading = dashboard.querySelector(
            ".dashboard-header h1"
        );

        const subtitle = dashboard.querySelector(
            ".dashboard-header .subtitle"
        );

        if (heading) {
            heading.textContent =
                `Welcome back, ${settings.displayName}.`;
        }

        if (subtitle) {
            subtitle.textContent =
                settings.welcomeMessage;
        }
    }

    function populatePersonalisation() {
        if (displayNameInput) {
            displayNameInput.value =
                settings.displayName;
        }

        if (welcomeMessageInput) {
            welcomeMessageInput.value =
                settings.welcomeMessage;
        }
    }

    if (personalForm) {
        personalForm.addEventListener("submit", (event) => {
            event.preventDefault();

            settings.displayName =
                displayNameInput.value.trim().slice(0, 60) ||
                "Scholar";

            settings.welcomeMessage =
                welcomeMessageInput.value.trim().slice(0, 160) ||
                defaultSettings.welcomeMessage;

            applyPersonalisation();
            populatePersonalisation();

            const saved = saveSettings();

            showMessage(
                personalMessage,
                saved
                    ? "Your personalisation has been saved!"
                    : "Changes applied, but saving failed.",
                !saved
            );
        });
    }

    /* ==========================================
       95. WORKSPACE STATISTICS
    ========================================== */

    function countStoredItems(key) {
        const data = readStoredJSON(key, []);

        return Array.isArray(data)
            ? data.length
            : 0;
    }

    function updateWorkspaceStatistics() {
        if (taskCount) {
            taskCount.textContent =
                countStoredItems("scholar-tasks");
        }

        if (noteCount) {
            noteCount.textContent =
                countStoredItems("scholar-study-journal-v1");
        }

        if (bookCount) {
            bookCount.textContent =
                countStoredItems("scholar-library");
        }
    }

    /* ==========================================
       96. STORAGE INFORMATION
    ========================================== */

    function formatBytes(bytes) {
        if (bytes < 1024) {
            return `${bytes} bytes`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    function updateStorageInformation() {
        let bytes = 0;

        try {
            STORAGE_KEYS.forEach((key) => {
                const value = localStorage.getItem(key);

                if (value !== null) {
                    bytes += new Blob([key, value]).size;
                }
            });

            if (storageUsed) {
                storageUsed.textContent =
                    formatBytes(bytes);
            }
        } catch (error) {
            if (storageUsed) {
                storageUsed.textContent = "Unavailable";
            }
        }

        updateWorkspaceStatistics();
    }

    if (refreshStorage) {
        refreshStorage.addEventListener(
            "click",
            updateStorageInformation
        );
    }

    /* ==========================================
       97. LAST BACKUP INFORMATION
    ========================================== */

    function updateLastBackupLabel() {
        if (!lastBackupLabel) return;

        if (!settings.lastBackup) {
            lastBackupLabel.textContent =
                "No backup recorded yet. Keep a copy somewhere safe.";
            return;
        }

        const date = new Date(settings.lastBackup);

        lastBackupLabel.textContent =
            Number.isNaN(date.getTime())
                ? "Backups are saved as JSON files."
                : `Last backup exported: ${date.toLocaleString()}`;
    }

    /* ==========================================
       98. BACKUP DATA VALIDATION
    ========================================== */

    function validateData(data) {
        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            throw new Error("Invalid backup data.");
        }

        const arrayKeys = [
            "scholar-tasks",
            "scholar-focus-history",
            "scholar-library",
            "scholar-study-journal-v1"
        ];

        const numberKeys = [
            "scholar-focus-minutes",
            "scholar-sessions"
        ];

        for (const key of arrayKeys) {
            if (data[key] === null) continue;

            if (!Array.isArray(data[key])) {
                throw new Error(
                    `Invalid data format for ${key}.`
                );
            }
        }

        for (const key of numberKeys) {
            if (data[key] === null) continue;

            const value = data[key];

            if (
                typeof value !== "number" ||
                !Number.isSafeInteger(value) ||
                value < 0
            ) {
                throw new Error(
                    `Invalid number for ${key}.`
                );
            }
        }

        const objectKeys = [
            "scholar-focus-preferences",
            SETTINGS_KEY
        ];

        for (const key of objectKeys) {
            if (data[key] === null) continue;

            if (
                typeof data[key] !== "object" ||
                Array.isArray(data[key])
            ) {
                throw new Error(
                    `Invalid settings format for ${key}.`
                );
            }
        }

        for (const key of arrayKeys) {
            if (data[key] === null) continue;
            if (!data[key].every(item =>
                item !== null && typeof item === "object" && !Array.isArray(item)
            )) {
                throw new Error(`Invalid entries in ${key}.`);
            }
        }

        const preferences = data["scholar-focus-preferences"];
        if (preferences !== null) {
            for (const field of ["focus", "short", "long"]) {
                if (preferences[field] !== undefined &&
                    (!Number.isFinite(preferences[field]) || preferences[field] <= 0)) {
                    throw new Error("Invalid focus preferences.");
                }
            }
        }

        const appSettings = data[SETTINGS_KEY];
        if (appSettings !== null) {
            if (appSettings.theme !== undefined &&
                !["classic", "dark"].includes(appSettings.theme)) {
                throw new Error("Invalid appearance theme.");
            }
            if (appSettings.displayName !== undefined &&
                typeof appSettings.displayName !== "string") {
                throw new Error("Invalid display name.");
            }
            if (appSettings.welcomeMessage !== undefined &&
                typeof appSettings.welcomeMessage !== "string") {
                throw new Error("Invalid welcome message.");
            }
        }
    }

    function validateBackup(backup) {
        if (
            !backup ||
            backup.application !== BACKUP_MARKER ||
            backup.version !== BACKUP_VERSION
        ) {
            throw new Error(
                "This is not a supported Scholar's Desk backup."
            );
        }

        if (
            !backup.data ||
            typeof backup.data !== "object" ||
            Array.isArray(backup.data)
        ) {
            throw new Error("Backup data is missing.");
        }

        const keys = Object.keys(backup.data);

        if (
            keys.length !== STORAGE_KEYS.length ||
            !STORAGE_KEYS.every((key) =>
                Object.prototype.hasOwnProperty.call(
                    backup.data,
                    key
                )
            )
        ) {
            throw new Error(
                "This backup is incomplete or has unexpected data keys."
            );
        }

        if (backup.exportedAt !== undefined &&
            !Number.isFinite(Date.parse(backup.exportedAt))) {
            throw new Error("Invalid backup export date.");
        }

        validateData(backup.data);
    }

    /* ==========================================
       99. COMPLETE BACKUP EXPORT
    ========================================== */

    function downloadJSON(filename, data) {
        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportCompleteBackup() {
        try {
            /*
             * Blur the active editor so any pending
             * change/blur handlers can finish.
             */
            if (
                document.activeElement &&
                typeof document.activeElement.blur === "function"
            ) {
                document.activeElement.blur();
            }

            const flush = new CustomEvent("scholar:flush-journal", {
                detail: { saved: true }
            });
            document.dispatchEvent(flush);
            if (!flush.detail.saved) {
                throw new Error("Journal changes could not be saved.");
            }

            const data = {};

            STORAGE_KEYS.forEach((key) => {
                const raw = localStorage.getItem(key);

                data[key] =
                    raw === null ? null : JSON.parse(raw);
            });

            validateData(data);

            const now = new Date();

            const backup = {
                application: BACKUP_MARKER,
                version: BACKUP_VERSION,
                exportedAt: now.toISOString(),
                data
            };

            const date = now.toISOString().slice(0, 10);

            downloadJSON(
                `scholars-desk-backup-${date}.json`,
                backup
            );

            settings.lastBackup = now.toISOString();
            saveSettings();
            updateLastBackupLabel();

            showMessage(
                backupMessage,
                "Backup download started. Keep your JSON file somewhere safe!"
            );

        } catch (error) {
            console.error("Backup export failed:", error);

            showMessage(
                backupMessage,
                `Could not export the backup: ${error.message}. Your saved data has not been changed.`,
                true
            );
        }
    }

    if (exportButton) {
        exportButton.addEventListener(
            "click",
            exportCompleteBackup
        );
    }

    /* ==========================================
       100. IMPORT PREVIEW
    ========================================== */

    function resetImport() {
        pendingBackup = null;

        if (importInput) importInput.value = "";
        if (importPreview) importPreview.hidden = true;
        if (restoreButton) restoreButton.disabled = true;
        if (importSummary) importSummary.replaceChildren();
    }

    function addSummaryItem(label, value) {
        if (!importSummary) return;

        const item = document.createElement("li");
        item.textContent = `${label}: ${value}`;

        importSummary.appendChild(item);
    }

    function showImportPreview(backup, filename) {
        const data = backup.data;

        if (importFilename) {
            importFilename.textContent = filename;
        }

        if (importSummary) {
            importSummary.replaceChildren();
        }

        const count = (key) =>
            Array.isArray(data[key])
                ? data[key].length
                : 0;

        addSummaryItem(
            "Tasks",
            count("scholar-tasks")
        );

        addSummaryItem(
            "Study notes",
            count("scholar-study-journal-v1")
        );

        addSummaryItem(
            "Books",
            count("scholar-library")
        );

        addSummaryItem(
            "Focus history entries",
            count("scholar-focus-history")
        );

        addSummaryItem(
            "Exported",
            backup.exportedAt
                ? new Date(backup.exportedAt).toLocaleString()
                : "Unknown"
        );

        pendingBackup = backup;

        if (importPreview) {
            importPreview.hidden = false;
        }

        if (restoreButton) {
            restoreButton.disabled = false;
        }
    }

    if (importInput) {
        importInput.addEventListener("click", () => {
            importInput.value = "";
        });

        importInput.addEventListener("change", async () => {
            const file = importInput.files?.[0];

            if (!file) return;

            pendingBackup = null;
            const selectedFile = file;

            if (importPreview) importPreview.hidden = true;
            if (restoreButton) restoreButton.disabled = true;

            try {
                if (file.size > 20 * 1024 * 1024) {
                    throw new Error(
                        "Backup file is larger than 20 MB."
                    );
                }

                const text = await file.text();
                if (importInput.files?.[0] !== selectedFile) return;
                const backup = JSON.parse(text);

                validateBackup(backup);

                showImportPreview(backup, file.name);

                showMessage(
                    backupMessage,
                    "Backup validated. Review the preview before restoring."
                );

            } catch (error) {
                console.error("Backup import failed:", error);

                showMessage(
                    backupMessage,
                    error.message || "Could not read backup.",
                    true
                );
            }
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            resetImport();
            showMessage(
                backupMessage,
                "Backup restore cancelled."
            );
        });
    }

    /* ==========================================
       101. SAFE RESTORE
    ========================================== */

    function restoreCompleteBackup() {
        if (!pendingBackup) return;

        try {
            validateBackup(pendingBackup);
        } catch (error) {
            showMessage(
                backupMessage,
                error.message,
                true
            );
            return;
        }

        const confirmed = window.confirm(
            "Restore this backup?\n\n" +
            "This will REPLACE your current Scholar's Desk " +
            "tasks, books, study notes, focus history and settings.\n\n" +
            "Please export your current workspace first.\n\n" +
            "Continue?"
        );

        if (!confirmed) return;

        /*
         * Snapshot existing values before writing.
         * If a write fails, restore the snapshot.
         */
        const previous = {};

        try {
            STORAGE_KEYS.forEach((key) => {
                previous[key] = localStorage.getItem(key);
            });

            STORAGE_KEYS.forEach((key) => {
                const value = pendingBackup.data[key];

                if (value === null) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(
                        key,
                        JSON.stringify(value)
                    );
                }
            });

        } catch (error) {
            console.error("Restore failed:", error);

            try {
                STORAGE_KEYS.forEach((key) => {
                    if (previous[key] === null) {
                        localStorage.removeItem(key);
                    } else {
                        localStorage.setItem(
                            key,
                            previous[key]
                        );
                    }
                });
            } catch (rollbackError) {
                console.error(
                    "Rollback failed:",
                    rollbackError
                );

                alert(
                    "Restore and rollback failed. " +
                    "Do not clear your browser data. " +
                    "Keep your backup files and check the console."
                );

                return;
            }

            showMessage(
                backupMessage,
                "Restore failed. Previous saved data was restored.",
                true
            );

            return;
        }

        alert(
            "Backup restored successfully! " +
            "The Scholar's Desk will now reload."
        );

        window.location.reload();
    }

    if (restoreButton) {
        restoreButton.addEventListener(
            "click",
            restoreCompleteBackup
        );
    }

    /* ==========================================
       102. INITIALISE SETTINGS
    ========================================== */

    applyAppearance();
    applyPersonalisation();
    populatePersonalisation();
    updateLastBackupLabel();
    updateStorageInformation();

    /*
     * Refresh the statistics whenever the
     * Settings page becomes visible.
     */
    document.querySelectorAll(
        'a[href="#settings"]'
    ).forEach((link) => {
        link.addEventListener(
            "click",
            () => setTimeout(
                updateStorageInformation,
                0
            )
        );
    });

})();
