/*******************************************************************************

    uBlock Origin - a comprehensive, efficient content blocker
    Copyright (C) 2014-present Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

/* global CodeMirror, uBlockDashboard */

import "./codemirror/ubo-static-filtering.js";
import { dom, qs$ } from "./dom.js";
import { i18n$ } from "./i18n.js";
import { onBroadcast } from "./broadcast.js";
import * as screenshotDB from './screenshotDB.js';

/******************************************************************************/

const cmEditor = CodeMirror(qs$("#userFilters"), {
  autoCloseBrackets: true,
  autofocus: true,
  extraKeys: {
    "Ctrl-Space": "autocomplete",
    Tab: "toggleComment",
  },
  foldGutter: true,
  gutters: [
    "CodeMirror-linenumbers",
    "CodeMirror-lintgutter",
    "toggle-button-gutter",
    "trash-button-gutter",
    "view-button-gutter",

  ],
  lineNumbers: true,
  lineWrapping: true,
  matchBrackets: true,
  maxScanLines: 1,
  styleActiveLine: {
    nonEmpty: true,
  },
});

let toggleStates = [];
let toDelete = false;

function helperIsLineCommented(lineNumber) {
  const lineContent = cmEditor.getLine(lineNumber);
  if (lineContent !== undefined && lineContent !== null) {
    return lineContent.trim().startsWith("!");
  }
  return false;
}

function helperIsLineWithDate(lineContent) {
  // Regex pattern to match a line that starts with a date in YYYY-MM-DD format
  // const datePattern = /^! \d{4}-\d{2}-\d{2}/;
  // return datePattern.test(lineContent.trim());

  const datePattern =
    /^! \b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b \d{1,2}, \d{4}/;
  return datePattern.test(lineContent.trim());
}

function createViewButton(lineNumber) {
  const button = document.createElement("radio-button");
  button.className = "view-button";

  const viewTooltip = CreateTooltipElement('viewTooltip',  'View');
  button.addEventListener('mouseenter', function(){
      viewTooltip.style.display = 'block';
      positionTooltip(button, viewTooltip);
  });
  
  button.addEventListener('mouseleave', function(){
      viewTooltip.style.display = 'none';
  });

  const lineContent = cmEditor.getLine(lineNumber);
  if (helperIsLineWithDate(lineContent)) return null;

  button.addEventListener("click",async function () {
    console.log(`View button clicked on line ${lineNumber}: ${lineContent}`);
    // Add your functionality here for the view button.
    await screenshotDB.showScreenshotFromDB(cmEditor.getLine(lineNumber));
  });

  return button;
}


// Function to create a toggle button element
function createToggleButton(lineNumber) {
  const button = document.createElement("radio-button");
  button.className = "filter-button off";

  const lineContent = cmEditor.getLine(lineNumber);
  const toggleTooltip = CreateTooltipElement('toggleTooltip',  '');
  if (helperIsLineWithDate(lineContent)) return null;

  function updateButtonAppearance() {
    if (toggleStates[lineNumber]) {
      //filter disactivated
      button.classList.add("on");
      button.classList.remove("off");
      toggleTooltip.textContent = "Enable";
      //TODO
      //make view button disable
      
    } else {
      //filter activated
      button.classList.add("off");
      button.classList.remove("on");
      toggleTooltip.textContent = "Disable";
    }
    toggleTooltip.style.display = 'none';
  }

  if (typeof toggleStates[lineNumber] === "undefined") {
    toggleStates[lineNumber] = helperIsLineCommented(lineNumber);
  }

  updateButtonAppearance();

  button.addEventListener('mouseenter', function(){
      toggleTooltip.style.display = 'block';
      positionTooltip(button, toggleTooltip);
  });
  
  button.addEventListener('mouseleave', function(){
      toggleTooltip.style.display = 'none';
  });

  button.addEventListener("click", function () {
    toDelete = false;
    toggleStates[lineNumber] = !toggleStates[lineNumber];
    cmEditor.setCursor({ line: lineNumber, ch: 0 }); // Move cursor to the beginning of the line
    cmEditor.execCommand("toggleComment");
    applyChanges();
    updateButtonAppearance();
  });

  return button;
}

function createTrashButton(lineNumber) {
  const button = document.createElement("radio-button");
  button.className = "trash-button";

  const trashTooltip = CreateTooltipElement('trashTooltip',  'Delete');
  button.addEventListener('mouseenter', function(){
      trashTooltip.style.display = 'block';
      positionTooltip(button, trashTooltip);
  });
  
  button.addEventListener('mouseleave', function(){
      trashTooltip.style.display = 'none';
  });

  const lineContent = cmEditor.getLine(lineNumber);
  if (helperIsLineWithDate(lineContent)) return null;

  button.addEventListener("click", function () {
    toDelete = true;
    trashTooltip.style.display = 'none';
    cmEditor.replaceRange(
      "",
      { line: lineNumber, ch: 0 },
      { line: lineNumber + 1, ch: 0 }
    );
    updateButtons();
    applyChanges();
  });

  return button;
}

function CreateTooltipElement(id, message){
  const tooltip = document.createElement('div');
  tooltip.id = id;
  tooltip.className = 'tooltip';
  tooltip.textContent = message;
  document.body.appendChild(tooltip); // Append to body or a container element
  return tooltip;
}

function positionTooltip(button, tooltip){
  const rect = button.getBoundingClientRect();
  tooltip.style.left = rect.left + 'px';
  tooltip.style.top = (rect.top - tooltip.offsetHeight) + 'px';
}

// Function to update buttons in the gutter
function updateButtons() {
  const totalLines = cmEditor.lineCount();
  toggleStates = toggleStates.slice(0, totalLines);

  for (let i = 0; i < totalLines; i++) {
    const lineContent = cmEditor.getLine(i);

    if (lineContent && lineContent.trim()) {
      const buttonElement = createToggleButton(i);
      const trashButtonElement = createTrashButton(i);
      const viewButtonElement = createViewButton(i);

      cmEditor.setGutterMarker(i, "toggle-button-gutter", buttonElement);
      cmEditor.setGutterMarker(i, "trash-button-gutter", trashButtonElement);
      cmEditor.setGutterMarker(i, "view-button-gutter", viewButtonElement);
    } else {
      cmEditor.setGutterMarker(i, "toggle-button-gutter", null);
    }
  }

  // Reset toggleStates array to match the current number of lines
  toggleStates.length = totalLines;
}

// Initial update of buttons
updateButtons();

cmEditor.on("beforeChange", async function (instance, change) {
  console.log(instance);
  const from = change.from.line;
  const lineText = cmEditor.getLine(from);
  if(toDelete /* && line is not in any template */)
  {
    await screenshotDB.deleteRecordFromDB(lineText.trim('\n'));
  }
  const addedLines = change.text.length - 1; // Subtract 1 to account for the original line
  const removedLines = change.to.line - change.from.line;

  // Create a new array of toggleStates excluding the state of the removed lines
  const newToggleStates = [];
  for (let i = 0; i < toggleStates.length; i++) {
    // replace for with for each or filter by index
    if (i < from || i >= from + removedLines) {
      newToggleStates.push(toggleStates[i]);
    }
  }

  // Adjust toggleStates array length if lines were added
  if (addedLines > 0) {
    newToggleStates.splice(from, 0, ...Array(addedLines)); // Insert placeholders for new lines
  }

  toggleStates = newToggleStates; // Copy the new array back to toggleStates
});

// Update buttons whenever content changes
cmEditor.on("changes", updateButtons);

// Template management
let templates = loadTemplatesFromLocalStorage();

document.getElementById("createTemplate").addEventListener("click", () => {
  document.getElementById("createTemplateDialog").classList.remove("hidden");
});

document.getElementById("saveTemplate").addEventListener("click", saveTemplate);

document.getElementById("cancelTemplate").addEventListener("click", () => {
  document.getElementById("createTemplateDialog").classList.add("hidden");
});

document
  .getElementById("deleteTemplate")
  .addEventListener("click", deleteTemplate);

document.getElementById("editTemplate").addEventListener("click", editTemplate);

document
  .getElementById("saveEditTemplate")
  .addEventListener("click", saveEditedTemplate);

document.getElementById("applyTemplate").addEventListener("click", () => {
  const selectedTemplate = document.getElementById("templateList").value;
  applyTemplate(selectedTemplate);
});

function saveTemplate() {
  const templateName = document.getElementById("templateName").value;
  if (templateName.trim() !== "") {
    const filters = cmEditor.getValue().split("\n");
    createTemplate(templateName, filters);
    document.getElementById("createTemplateDialog").classList.add("hidden");
    updateTemplateList(templateName);
    saveTemplatesToLocalStorage();
  }
}

function createTemplate(templateName, filters) {
  const existingTemplate = templates.find((t) => t.name === templateName);
  if (existingTemplate) {
    existingTemplate.filters = filters;
  } else {
    templates.push({ name: templateName, filters });
  }
}

function deleteTemplate() {
  const selectedTemplate = document.getElementById("templateList").value;
  templates = templates.filter((t) => t.name !== selectedTemplate);
  updateTemplateList();
  saveTemplatesToLocalStorage();
}

function editTemplate() {
  const selectedTemplate = document.getElementById("templateList").value;
  const template = templates.find((t) => t.name === selectedTemplate);
  if (template) {
    cmEditor.setValue(template.filters.join("\n"));
    document.getElementById("saveEditTemplate").classList.remove("hidden");
  }
}

function saveEditedTemplate() {
  const selectedTemplate = document.getElementById("templateList").value;
  const template = templates.find((t) => t.name === selectedTemplate);
  if (template) {
    const updatedFilters = cmEditor.getValue().split("\n");
    template.filters = updatedFilters;
    updateTemplateList(selectedTemplate);
    document.getElementById("saveEditTemplate").classList.add("hidden");
    saveTemplatesToLocalStorage();
  }
}

function applyTemplate(templateName) {
  const template = templates.find((t) => t.name === templateName);
  if (template) {
    cmEditor.setValue(template.filters.join("\n"));
  } else {
    cmEditor.setValue("");
  }
  updateTemplateList(templateName);
  applyChanges();
}

function updateTemplateList(selectedTemplateName) {
  const templateList = document.getElementById("templateList");
  templateList.innerHTML = "";
  templates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.name;
    option.textContent = template.name;
    templateList.appendChild(option);
  });

  // Set the selected template in the dropdown
  if (selectedTemplateName) {
    templateList.value = selectedTemplateName;
  } else if (templates.length > 0) {
    templateList.value = templates[0].name;
  }
}

function saveTemplatesToLocalStorage() {
  localStorage.setItem("templates", JSON.stringify(templates));
}

function loadTemplatesFromLocalStorage() {
  const storedTemplates = localStorage.getItem("templates");
  return storedTemplates ? JSON.parse(storedTemplates) : [];
}

// Initialize the template list with the first template selected if exists
updateTemplateList(templates.length > 0 ? templates[0].name : null);

{
  let hintUpdateToken = 0;

  const getHints = async function () {
    const hints = await vAPI.messaging.send("dashboard", {
      what: "getAutoCompleteDetails",
      hintUpdateToken,
    });
    if (hints instanceof Object === false) {
      return;
    }
    if (hints.hintUpdateToken !== undefined) {
      cmEditor.setOption("uboHints", hints);
      hintUpdateToken = hints.hintUpdateToken;
    }
    timer.on(2503);
  };

  const timer = vAPI.defer.create(() => {
    getHints();
  });

  getHints();
}

vAPI.messaging
  .send("dashboard", {
    what: "getTrustedScriptletTokens",
  })
  .then((tokens) => {
    cmEditor.setOption("trustedScriptletTokens", tokens);
  });

/******************************************************************************/

let originalState = {
  enabled: true,
  trusted: false,
  filters: "",
};

function getCurrentState() {
  const enabled = qs$("#enableMyFilters input").checked;
  return {
    enabled,
    trusted: enabled && qs$("#trustMyFilters input").checked,
    filters: getEditorText(),
  };
}

function rememberCurrentState() {
  originalState = getCurrentState();
}

function currentStateChanged() {
  return JSON.stringify(getCurrentState()) !== JSON.stringify(originalState);
}

function getEditorText() {
  const text = cmEditor.getValue().replace(/\s+$/, "");
  return text === "" ? text : `${text}\n`;
}

function setEditorText(text) {
  cmEditor.setValue(text.replace(/\s+$/, "") + "\n\n");
}

/******************************************************************************/

function userFiltersChanged(details = {}) {
  const changed =
    typeof details.changed === "boolean"
      ? details.changed
      : self.hasUnsavedData();
  qs$("#userFiltersApply").disabled = !changed;
  qs$("#userFiltersRevert").disabled = !changed;
  const enabled = qs$("#enableMyFilters input").checked;
  dom.attr("#trustMyFilters .input.checkbox", "disabled", enabled ? null : "");
  const trustedbefore = cmEditor.getOption("trustedSource");
  const trustedAfter = enabled && qs$("#trustMyFilters input").checked;
  if (trustedAfter === trustedbefore) {
    return;
  }
  cmEditor.startOperation();
  cmEditor.setOption("trustedSource", trustedAfter);
  const doc = cmEditor.getDoc();
  const history = doc.getHistory();
  const selections = doc.listSelections();
  doc.replaceRange(
    doc.getValue(),
    { line: 0, ch: 0 },
    { line: doc.lineCount(), ch: 0 }
  );
  doc.setSelections(selections);
  doc.setHistory(history);
  cmEditor.endOperation();
  cmEditor.focus();
}

/******************************************************************************/

// https://github.com/gorhill/uBlock/issues/3704
//   Merge changes to user filters occurring in the background with changes
//   made in the editor. The code assumes that no deletion occurred in the
//   background.

function threeWayMerge(newContent) {
  const prvContent = originalState.filters.trim().split(/\n/);
  const differ = new self.diff_match_patch();
  const newChanges = differ.diff(prvContent, newContent.trim().split(/\n/));
  const usrChanges = differ.diff(
    prvContent,
    getEditorText().trim().split(/\n/)
  );
  const out = [];
  let i = 0,
    j = 0,
    k = 0;
  while (i < prvContent.length) {
    for (; j < newChanges.length; j++) {
      const change = newChanges[j];
      if (change[0] !== 1) {
        break;
      }
      out.push(change[1]);
    }
    for (; k < usrChanges.length; k++) {
      const change = usrChanges[k];
      if (change[0] !== 1) {
        break;
      }
      out.push(change[1]);
    }
    if (k === usrChanges.length || usrChanges[k][0] !== -1) {
      out.push(prvContent[i]);
    }
    i += 1;
    j += 1;
    k += 1;
  }
  for (; j < newChanges.length; j++) {
    const change = newChanges[j];
    if (change[0] !== 1) {
      continue;
    }
    out.push(change[1]);
  }
  for (; k < usrChanges.length; k++) {
    const change = usrChanges[k];
    if (change[0] !== 1) {
      continue;
    }
    out.push(change[1]);
  }
  return out.join("\n");
}

/******************************************************************************/

async function renderUserFilters(merge = false) {
  const details = await vAPI.messaging.send("dashboard", {
    what: "readUserFilters",
  });
  if (details instanceof Object === false || details.error) {
    return;
  }

  cmEditor.setOption("trustedSource", details.trusted);

  qs$("#enableMyFilters input").checked = details.enabled;
  qs$("#trustMyFilters input").checked = details.trusted;

  const newContent = details.content.trim();

  if (merge && self.hasUnsavedData()) {
    setEditorText(threeWayMerge(newContent));
    userFiltersChanged({ changed: true });
  } else {
    setEditorText(newContent);
    userFiltersChanged({ changed: false });
  }

  rememberCurrentState();
}

/******************************************************************************/

function handleImportFilePicker(ev) {
  const file = ev.target.files[0];
  if (file === undefined || file.name === "") {
    return;
  }
  if (file.type.indexOf("text") !== 0) {
    return;
  }
  const fr = new FileReader();
  fr.onload = function () {
    if (typeof fr.result !== "string") {
      return;
    }
    const content = uBlockDashboard.mergeNewLines(getEditorText(), fr.result);
    cmEditor.operation(() => {
      const cmPos = cmEditor.getCursor();
      setEditorText(content);
      cmEditor.setCursor(cmPos);
      cmEditor.focus();
    });
  };
  fr.readAsText(file);
}

dom.on("#importFilePicker", "change", handleImportFilePicker);

function startImportFilePicker() {
  const input = qs$("#importFilePicker");
  // Reset to empty string, this will ensure an change event is properly
  // triggered if the user pick a file, even if it is the same as the last
  // one picked.
  input.value = "";
  input.click();
}

dom.on("#importUserFiltersFromFile", "click", startImportFilePicker);

/******************************************************************************/

function exportUserFiltersToFile() {
  const val = getEditorText();
  if (val === "") {
    return;
  }
  const filename = i18n$("1pExportFilename")
    .replace("{{datetime}}", uBlockDashboard.dateNowToSensibleString())
    .replace(/ +/g, "_");
  vAPI.download({
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(val)}`,
    filename: filename,
  });
}

/******************************************************************************/

async function applyChanges() {
  const state = getCurrentState();
  const details = await vAPI.messaging.send("dashboard", {
    what: "writeUserFilters",
    content: state.filters,
    enabled: state.enabled,
    trusted: state.trusted,
  });
  if (details instanceof Object === false || details.error) {
    return;
  }
  rememberCurrentState();
  userFiltersChanged({ changed: false });
  vAPI.messaging.send("dashboard", {
    what: "reloadAllFilters",
  });
}

function revertChanges() {
  qs$("#enableMyFilters input").checked = originalState.enabled;
  qs$("#trustMyFilters input").checked = originalState.trusted;
  setEditorText(originalState.filters);
  userFiltersChanged();
}

/******************************************************************************/

function getCloudData() {
  return getEditorText();
}

function setCloudData(data, append) {
  if (typeof data !== "string") {
    return;
  }
  if (append) {
    data = uBlockDashboard.mergeNewLines(getEditorText(), data);
  }
  cmEditor.setValue(data);
}

self.cloud.onPush = getCloudData;
self.cloud.onPull = setCloudData;

/******************************************************************************/

self.wikilink = "https://github.com/gorhill/uBlock/wiki/Dashboard:-My-filters";

self.hasUnsavedData = function () {
  return currentStateChanged();
};

/******************************************************************************/

// Handle user interaction
dom.on("#exportUserFiltersToFile", "click", exportUserFiltersToFile);
dom.on("#userFiltersApply", "click", () => {
  applyChanges();
});
dom.on("#userFiltersRevert", "click", revertChanges);
dom.on("#enableMyFilters input", "change", userFiltersChanged);
dom.on("#trustMyFilters input", "change", userFiltersChanged);

(async () => {
  await renderUserFilters();

  cmEditor.clearHistory();

  // https://github.com/gorhill/uBlock/issues/3706
  //   Save/restore cursor position
  {
    const line = await vAPI.localStorage.getItemAsync(
      "myFiltersCursorPosition"
    );
    if (typeof line === "number") {
      cmEditor.setCursor(line, 0);
    }
    cmEditor.focus();
  }

  // https://github.com/gorhill/uBlock/issues/3706
  //   Save/restore cursor position
  {
    let curline = 0;
    cmEditor.on("cursorActivity", () => {
      if (timer.ongoing()) {
        return;
      }
      if (cmEditor.getCursor().line === curline) {
        return;
      }
      timer.on(701);
    });
    const timer = vAPI.defer.create(() => {
      curline = cmEditor.getCursor().line;
      vAPI.localStorage.setItem("myFiltersCursorPosition", curline);
    });
  }

  // https://github.com/gorhill/uBlock/issues/3704
  //   Merge changes to user filters occurring in the background
  onBroadcast((msg) => {
    switch (msg.what) {
      case "userFiltersUpdated": {
        cmEditor.startOperation();
        const scroll = cmEditor.getScrollInfo();
        const selections = cmEditor.listSelections();
        renderUserFilters(true).then(() => {
          cmEditor.clearHistory();
          cmEditor.setSelection(selections[0].anchor, selections[0].head);
          cmEditor.scrollTo(scroll.left, scroll.top);
          cmEditor.endOperation();
        });
        break;
      }
      default:
        break;
    }
  });
})();

cmEditor.on("changes", userFiltersChanged);
CodeMirror.commands.save = applyChanges;

/******************************************************************************/

//Shavit addition

function redirectToHelloWorld() {
  // Redirect to hello-world.html
  window.location.href = "hello-world.html";
}
