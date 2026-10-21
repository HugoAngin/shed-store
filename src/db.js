// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { doc, getDoc, getDocs, getFirestore, collection, query, where } from "firebase/firestore";
import {showLoading, hideLoading, isLoggedIn} from "./script.js";
import { itemSortMode, sortItems } from "./catalogue.js";
import { firebaseConfig } from "./firebase-config.js";
import { escapeHTML, apiRequest } from "./html.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration is kept in firebase-config.js (not committed)

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const colRef = collection(db, "props-shed");
const docSnap = await getDocs(colRef);

const inventoryList = document.querySelector(".inventory-list");
const addItemRow = document.getElementById('addItemRow');

const ITEMS_PER_PAGE = 10;

console.log("Start Loading!");  
if (document.body.classList.contains("MainPage") || document.body.classList.contains("Catalogue")){

  const searchParams = new URLSearchParams(document.location.search);
  const searchParamBar = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page")) || 1;

  document.getElementById("search-bar").value = searchParamBar;

  let snapshot = await getQuery(searchParamBar);
  renderItems(snapshot, currentPage);
  hideLoading();
} else if (document.body.classList.contains("Item")){
  const searchParams = new URLSearchParams(document.location.search);
  const paramId = searchParams.get("id"); //Get "id" from the URL 
  await displayItem(paramId); //Pass the ID into the display item function
  console.log("Finished Loading!");
  hideLoading();
}

function createTag(name, color){
  let tag = document.createElement('span');
  tag.classList.add('tag', color);
  tag.textContent = name;
  return tag;
}

function isMapSmall(){
    if (document.body.clientWidth < 700){
      return true;
    }
}

async function displayItem(id){
  const itemDoc = doc(db, "props-shed", id);
  const itemSnap = await getDoc(itemDoc);

  //If the item does not exist, display a message and redirect the user
  if (!itemSnap.exists()){ 
    alert("This prop does not exist!");
    window.location.href = "catalogue.html";
    return;
  }
  let name = itemSnap.get("item-name");
  let location = itemSnap.get("item-location");
  let tagNames = [];
  let tagColors = [];
  for (let i = 0; i < itemSnap.get("tag-colors").length; i++){
    tagNames.push(itemSnap.get("tag-names")[i]);
    tagColors.push(itemSnap.get("tag-colors")[i]);
  }
  let status = itemSnap.get("item-status");

  //Create the taglist
  const tagList = document.createElement('div');
  tagList.classList.add("tag-list");
  for (let i = 0; i < tagNames.length; i++){
    //Create new tag objects for each tag required for the item
    if (tagNames[i] != null){
      tagList.appendChild(createTag(tagNames[i], tagColors[i]));
    }
  }
    console.log("Found!");

  const nameText = document.querySelector(".name");
  const locationText = document.querySelector(".location");
  const statusText = document.querySelector(".status");
  const idText = document.querySelector(".id");
  const statusSymbol = document.querySelector(".status-symbol")
  const checkButton = document.querySelector('.check-inout-button');
  
  const tagsBox = document.querySelector(".tags")
  
  //Convert the tag objects into HTML
  const tags = [...tagList.children].map(t => t.outerHTML).join('');
  
  nameText.textContent = name;
  locationText.textContent = location;
  
  if (status === "In Shed"){
    statusSymbol.textContent = "check_circle";
    statusSymbol.classList.add("in-shed");
    checkButton.textContent = "Check Out"
  } else {
    statusSymbol.textContent = "do_not_disturb_on";
    statusSymbol.classList.add("checked-out");
    checkButton.textContent = "Check In"
  }
  
  statusText.textContent = status;
  idText.textContent = "ID: " + id;
  
  tagsBox.innerHTML = tags;

  
  const mapFrame = document.querySelector(".map"); //Fetch the map element from HTML

  if (isMapSmall()){
    mapFrame.src = `map.html?location=${encodeURIComponent(location)}&size=small`; //Update the map's seach parameter to the item's location
    mapFrame.height = 870;
    mapFrame.width = 850;
  } else {
    mapFrame.src = `map.html?location=${encodeURIComponent(location)}`;
    mapFrame.height = 600;
    mapFrame.width = 1260;
  }
  document.title = "Item: " + name;

  window.addEventListener('resize', () => {
    if (isMapSmall() && mapFrame.src == (window.location.origin + "/map.html?location=" + location)){
      mapFrame.height = 870;
      mapFrame.width = 850;
      mapFrame.src = `map.html?location=${location}&size=small`; //Update the map's seach parameter to the item's location
    } else if (!isMapSmall() && mapFrame.src == (window.location.origin + "/map.html?location=" + location + "&size=small")){
      mapFrame.height = 600;
      mapFrame.width = 1260;
      mapFrame.src = `map.html?location=${location}`;
    }
    document.title = "Item: " + name;
  })

  checkButton.addEventListener('click', async () => {
    if (!(await isLoggedIn())){
      let loginConfirm = confirm("You are not logged in! Press OK to login");
      if (loginConfirm){
        window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      } else {
        return;
      }
    }

    let logAuthor;

    //Uses if statements to pick the right question
    if (status === "In Shed"){
      logAuthor = prompt("Who is checking out this item?");
    } else {
      logAuthor = prompt("Who is checking in this item?");
    }

    //Only continue if user entered a value in the prompt
    if (logAuthor === null) return;

    try {
      //The server creates the log and toggles the item's status
      await apiRequest("POST", `/api/items/${encodeURIComponent(id)}/toggle`, { author: logAuthor });
      window.location.reload(); //Refreshes the page to see changes
    } catch (error) {
      alert(error.message);
    }

  });

}

export function clearTable(){
  const items = inventoryList.querySelectorAll(".item-wrapper");
  const newItemRow = inventoryList.querySelector(".new-item");

  const addItemRow = document.getElementById("addItemRow");
  if (addItemRow){
    const addItemText = addItemRow.querySelector(".add-text");
    const addItemSymbol = addItemRow.querySelector(".add-symbol");
  
    addItemText.textContent = "Add Item";
    addItemSymbol.textContent = 'add';
  }

  if (newItemRow) newItemRow.remove();

  items.forEach(item => {
    item.remove();
  })
}

const searchInput = document.getElementById("search-bar");
let searchTimeout = null; //Initialize the timeout variable

if (document.body.classList.contains("Catalogue") || document.body.classList.contains("MainPage")){
  searchInput.addEventListener("keydown", async (event) => { //Runs function every keystroke
    
    clearTimeout(searchTimeout); //Clears the timer every keystroke
    
    searchTimeout = setTimeout(async () => {
      const queryText = searchInput.value.trim().toLowerCase(); //Trims the text query
      let currentSnapshot = await getQuery(queryText); //Fetches the items from the database 


      //Verifies if the list it to be sorted in ascending or descending order
      if (itemSortMode == 1) {
        currentSnapshot = sortItems(currentSnapshot, "asc");
      } else if (itemSortMode == 2) {
        currentSnapshot = sortItems(currentSnapshot, "dsc");
      }

      // Update search parameter without refreshing page
      const params = new URLSearchParams();
      if (queryText) params.set("search", queryText);
      params.set("page", "1");
      history.replaceState(null, "", `?${params.toString()}`);

      clearTable();
      renderItems(currentSnapshot, 1);

      }, 250);
  });
}

export async function getQuery(queryText) {
  if (!queryText) {
    console.log("Search cleared");
    const snapshot = await getDocs(collection(db, "props-shed"));

    return snapshot.docs;  //If there is no query, return the full collection without filtering.
  }

  try {
    // Get all documents
    const colRef = collection(db, "props-shed");
    const snapshot = await getDocs(colRef);
    
    //Trim the text if it has any trailing spaces
    const searchTerm = queryText.toLowerCase().trim();
    
    const filteredDocs = snapshot.docs.filter(doc => { //Filters through all items in the database
      const itemName = doc.data()['item-name']?.toLowerCase() || '';
      const location = doc.data()['item-location']?.toLowerCase() || '';
      
      // Splits both item name and location into words
      const itemWords = itemName.split(/\s+/);
      const locationWords = location.split(/\s+/);

      //Collects all tag names into one array
      const tags = doc.data()['tag-names'].map(tag => tag?.toLowerCase() || '');
      
      // Check if any word starts with the query OR if the text includes the query
      // for item name, location, and tag name
      return itemWords.some(word => word.startsWith(searchTerm)) || 
            itemName.includes(searchTerm) ||
            locationWords.some(word => word.startsWith(searchTerm)) ||
            location.includes(searchTerm) ||
            tags.some(word => word.startsWith(searchTerm)); 
    });

    return filteredDocs;// <--- Datatype is snapshot

  } catch (error) { //If an error occurs, the website won't crash and simply return an empty snapshot
    console.error("Search error:", error);
    return [];
  }

}

export function renderItems(snapshot, currentPage = 1) { //Page 1 by default
  const totalPages = Math.max(1, Math.ceil(snapshot.length / ITEMS_PER_PAGE)); //Find the total number of pages
  const start = (currentPage - 1) * ITEMS_PER_PAGE; //The index of the first item to be added
  const pageItems = snapshot.slice(start, start + ITEMS_PER_PAGE) //Slices the snapshot to only have 50 items in the page.

  pageItems.forEach((doc) => { //Loops through every document in snapshot

    //Set temporary variables for each attribute of an item
    let id = doc.get("item-id");
    let name = doc.get("item-name");
    let location = doc.get("item-location");

    let tagNames = [];
    let tagColors = [];

    //Populating tag data onto parallel arrays
    for (let i = 0; i < doc.get("tag-colors").length; i++) {
      tagNames.push(doc.get("tag-names")[i]);
      tagColors.push(doc.get("tag-colors")[i]);
    }
    let status = doc.get("item-status");

    const tagList = document.createElement('div');
    tagList.classList.add("tag-list");
    for (let i = 0; i < tagNames.length; i++) {
      if (tagNames[i] != null) tagList.appendChild(createTag(tagNames[i], tagColors[i]));
    }

    const newItem = document.createElement("div");
    inventoryList.insertBefore(newItem, addItemRow);
    const tags = [...tagList.children].map(t => t.outerHTML).join('');

    newItem.outerHTML = `
      <div class="item-wrapper" id="${escapeHTML(id)}">
        <button class="delete-btn material-symbols-outlined">delete</button>
        <div class="item">
          <div class="item-name"><p>${escapeHTML(name)}</p></div>
          <div class="item-location"><p>${escapeHTML(location)}</p></div>
          <div class="item-tags">${tags}</div>
          <div class="item-status"><p>${escapeHTML(status)}</p></div>
          <div class="view material-symbols-outlined">open_in_new</div>
        </div>
      </div>`;
  });

  if (snapshot.length === 0) { //If there are no items, render an appropriate alert
    const newItem = document.createElement("div");
    inventoryList.insertBefore(newItem, addItemRow);
    newItem.outerHTML = `<div class="item-wrapper empty-search-warning">No items matched your search. Try searching something else...</div>`;
  }

  // Render pagination controls
  renderPaginationControls(currentPage, totalPages);
}

function renderPaginationControls(currentPage, totalPages) {
  //Removes the controls if they exist already to reset them
  const existing = document.getElementById("pagination-controls");
  if (existing) existing.remove();

  if (totalPages <= 1) return; //Do not add the controls if there is only 1 page

  //Gets the current search query
  const search = new URLSearchParams(document.location.search).get("search") || "";

  //Gets the URL to the previous and next pages
  function pageUrl(page) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", page);
    return `?${params.toString()}`;
  }

  //Creates the controls
  const controls = document.createElement("div");
  controls.id = "pagination-controls";
  controls.innerHTML = `
    ${currentPage > 1
      ? `<a href="${pageUrl(currentPage - 1)}" class="page-btn material-symbols-outlined">chevron_left</a>`
      : `<span class="page-btn material-symbols-outlined disabled">chevron_left</span>`}
    <span id="pageIndicator">Page ${currentPage} of ${totalPages}</span>
    ${currentPage < totalPages
      ? `<a href="${pageUrl(currentPage + 1)}" class="page-btn material-symbols-outlined">chevron_right</a>`
      : `<span class="page-btn material-symbols-outlined disabled">chevron_right</span>`}
  `;

  const contentContainer = document.querySelector(".content");

  // Insert after inventory list
  contentContainer.append(controls);
}

export async function renderLogs(){
  const container = document.querySelector(".container");
  let logs = [];
  try {
    logs = await apiRequest("GET", "/api/logs"); //Logs are only available when logged in, newest first
  } catch (error) {
    alert(error.message);
    return;
  }

  logs.forEach((log) => {
    //Convert the timestamp into a readable format
    let formattedTimestamp = log.timestamp === null ? "" : new Date(log.timestamp).toLocaleString("sv-SE", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    let logClass;

    if (log.status == "Checked In"){
      logClass = "in";
    } else {
      logClass = "out";
    }

    //Ceating the HTML element for a log
    const logHTML = `
    <div class="log">
      <p class="timestamp">${escapeHTML(formattedTimestamp)}</p>
      <p class="status ${logClass}">${escapeHTML(log.status)}</p>
      <p class="item-name">${escapeHTML(log.itemName)}</p>
      <p class="author">by ${escapeHTML(log.author)}</p>
    </div>
    `

    const logElement = document.createElement("div");
    container.appendChild(logElement); //Appending the log onto the GUI element
    logElement.outerHTML = logHTML;
  });
}

//Adds an item through the server. Returns the saved item, including its new ID
export async function addItem(itemData){
  return await apiRequest("POST", "/api/items", itemData);
}

export async function removeItem(targetId){
  await apiRequest("DELETE", `/api/items/${encodeURIComponent(targetId)}`);
}

export async function getItemCount(){
  const snap = await getDocs(colRef);
  return snap.size;
}

export async function getCheckedCount(){
  const checkedQuery = query(colRef, where("item-status", "==", "Checked Out"))
  const snap = await getDocs(checkedQuery);
  return snap.size;
}
