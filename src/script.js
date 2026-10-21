import { addItem, removeItem } from "./db";
import { escapeHTML } from "./html.js";
import { verifyShelf } from "./map.js";

export function showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay){
        overlay.classList.remove("hidden");
    }
}

export function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay){
        overlay.classList.add("hidden");
    }
}

function loadMenuButton(){

    try {
        const sideBar = document.querySelector(".sidebar");
        const topBar = document.querySelector(".top-bar");
        const sideBarButton = document.querySelector(".sidebar-button");
    
        sideBarButton.addEventListener("click", () => {
            console.log("clicked");
            if (document.body.clientWidth <= 950){
                sideBar.classList.toggle("force-open");
                topBar.classList.toggle("force-open");
            }
        })
    
        document.addEventListener("click", (e) => {
    
            if (!sideBar.contains(e.target) && 
                !sideBarButton.contains(e.target)) {
                
                sideBar.classList.remove("force-open");
                topBar.classList.remove("force-open");
            }
        })
    
        window.addEventListener("resize", () => {
            if (document.body.clientWidth > 950 && (sideBar.classList.contains("force-open") || topBar.classList.contains("force-open"))){
                sideBar.classList.remove("force-open");
                topBar.classList.remove("force-open");
            }
        })
    } catch (error){
        console.log(error);
    }
}

showLoading();
loadMenuButton();



const logoutButtonHTML = `
<a class="logoff-btn" href="/logout?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}">
    <span class="material-symbols-outlined logoff-icon">logout</span>
    <span class="nav-text">Log Out</span>
</a>
`

const loginButtonHTML = `
<a class="login-btn" href="/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}">
    <span class="material-symbols-outlined logoff-icon">login</span>
    <span class="nav-text">Log In</span>
</a>
`

//Check whether user is logged in

export async function isLoggedIn(){
    try{
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        
        return data.loggedIn;
    } catch(error) {
        console.error("Error checking login status: ", error);
        return false;
    }
}

async function updateLogin(){
    try{
        let logged = await isLoggedIn();
        
        const footer = document.querySelector(".sidebar-footer");
        
        if (logged == true) {
        footer.innerHTML = logoutButtonHTML;
        } else {
        footer.innerHTML = loginButtonHTML;
        }
    } catch(error) {
        console.error("Error checking login status: ", error);
    }
}

if (document.querySelector(".sidebar")){
    await updateLogin();
}

if (document.body.classList.contains("MainPage")){
    MainLoad();
} else if (document.body.classList.contains("Catalogue")) {
    loadOpenButtons();
}

function MainLoad(){
    const inventoryList = document.querySelector('.inventory-list');
    const addItemRow = document.getElementById('addItemRow');
    const addItemText = addItemRow.querySelector('.add-text');
    const addItemSymbol = addItemRow.querySelector('.add-symbol');
    
    addItemRow.addEventListener('click', () => {
        // Prevent multiple form rows
        if (document.querySelector('.item.new-item')){
            document.querySelector('.item.new-item').remove();
            
            addItemText.textContent = "Add Item";
            addItemSymbol.textContent = 'add';
            return;
        } 
        const newRow = document.createElement('div');
        // Generates the form to create a new item
        newRow.classList.add('item', 'new-item');
        newRow.innerHTML = `
            <div class="item-name"><input type="text" placeholder="New Item Name" maxlength="25"></div>
            <div class="item-location"><input type="text" placeholder="Location ID" maxlength="3"></div>
            <div class="item-tags">
            
                <span class="small-label">Preview</span>
                <div class="tag-list"></div>
    
                <span class="small-label">Quick Add</span>
                <div class="quick-tag-buttons">
                    <button type="button" class="quick-tag-btn quick-borrowed">Borrowed</button>
                    <button type="button" class="quick-tag-btn quick-dispose">Dispose</button>
                </div>
                
                <span class="small-label">Custom Tags</span>
                <div class="custom-tag-row">
                    <input type="text" class="tag-input" placeholder="Tag" maxlength="20">
                    <div class="tag-color-picker tag tag-grey"></div>
                    <button type="button" class="add-tag-btn">+</button>
                </div>
            </div>
    
            <div class="item-status">
                <select>
                    <option>In Shed</option>
                    <option>Checked Out</option>
                </select>
            </div>
            <div class="add submit-item material-symbols-outlined">add</div>
        `;
    
        addItemText.textContent = "Close Dialogue";
        addItemSymbol.textContent = 'remove';
    
        inventoryList.insertBefore(newRow, addItemRow);
    
        // Tag adding behavior
        const tagInput = newRow.querySelector('.tag-input');
        const tagList = newRow.querySelector('.tag-list');
        const addTagButton = newRow.querySelector('.add-tag-btn');
        const colorPicker = newRow.querySelector('.tag-color-picker');
    
        let selectedColorClass = "tag-grey"; // default tag color
    
    
        // Show color picker when the color picker is pressed
        colorPicker.addEventListener('click', () => {
            
            let popup = newRow.querySelector('.tag-color-popup');
            if (popup) {
                popup.remove();
                return;
            }
            
            setTimeout(() => {
                document.addEventListener('click', closePopup);
            }, 0);
    
            function closePopup() {
                popup?.remove();
                document.removeEventListener('click', closePopup);
            }
    
            popup = document.createElement('div');
            popup.classList.add('tag-color-popup');
    
            const colors = ["tag-grey", "tag-red", "tag-orange", "tag-yellow", "tag-green", "tag-blue", "tag-purple"];
    
            colors.forEach(c => {
                const opt = document.createElement('div');
                opt.classList.add('tag-color-option', 'tag', c);
                opt.addEventListener('click', () => {
                    selectedColorClass = c;
                    colorPicker.className = "tag-color-picker tag " + c;
                });
                popup.appendChild(opt);
            });
    
            colorPicker.appendChild(popup);
        });
        //When a tag is added using the custom part
        addTagButton.addEventListener('click', () => {
            const value = tagInput.value.trim();
            if (!value) return;
    
            for (let tag of tagList.children) {
                if (tagList.childElementCount > 4) return;
                if (tag.textContent === value) return;
            }
        
            const tag = document.createElement('span');
            tag.classList.add('tag', selectedColorClass, 'tag-preview');
            tag.textContent = value;
            tagList.appendChild(tag);
    
            tagInput.value = '';
        });
        
        //When a tag is added using quick tags
        const quickBorrowed = newRow.querySelector('.quick-borrowed');
        const quickDispose = newRow.querySelector('.quick-dispose');
    
        function addQuickTag(text, colorClass) {
            const tag = document.createElement('span');
            
            for (let tag of tagList.children) {
                if (tag.textContent === text) return;
                if (tag.textContent === value) return;
            }
    
            tag.classList.add('tag', colorClass, 'tag-preview');
            tag.textContent = text;
            tagList.appendChild(tag);
        }
    
        // Standard tags
        quickBorrowed.addEventListener('click', () => addQuickTag("Borrowed", "tag-green"));
        quickDispose.addEventListener('click', () => addQuickTag("Dispose", "tag-red"));
    
        document.addEventListener('click', (tag) => {
            if (tag.target.classList.contains('tag-preview')){
                tag.target.remove();
            }
        }) 
        // If the submit button is pressed
        newRow.querySelector('.submit-item').addEventListener('click', async () => {
            //Get the text input from the website front end 
            const name = (newRow.querySelector('.item-name input').value).toLowerCase();
            const location = newRow.querySelector('.item-location input').value;

            if (!name || !location){
                alert("Please enter a name and location");
                return;
            }; //Reject input if either the name or location is empty
            console.log(verifyShelf(location));
            if (!verifyShelf(location)){
                alert("Please enter a valid location format between A1 to J9");
                return;
            }

            const status = newRow.querySelector('.item-status select').value;

            //Convert tag list into name and color pairs
            const newTags = [...tagList.children].map(t => ({ name: t.textContent.trim(), color: t.classList[1] }));

            //Save the item on the server, which checks the data and gives it an ID
            let saved;
            try {
                saved = await addItem({ name, location, status, tags: newTags });
            } catch (error) {
                alert(error.message);
                return;
            }

            for (let tag of tagList.children){
                //Remove the "preview" tag so they become permanent tags
                tag.classList.remove("tag-preview"); 
            }
            const tags = [...tagList.children].map(t => t.outerHTML).join('');

            const addItemRow = document.getElementById("addItemRow");
            const addItemText = addItemRow.querySelector(".add-text");
            const addItemSymbol = addItemRow.querySelector(".add-symbol");
        
            addItemText.textContent = "Add Item";
            addItemSymbol.textContent = 'add';
            newRow.outerHTML = `
            <div class="item-wrapper" id="${escapeHTML(saved.id)}">
                <button class="delete-btn material-symbols-outlined">delete</button>
                <div class="item">
                    <div class="item-name"><p>${escapeHTML(saved.name)}</p></div>
                    <div class="item-location"><p>${escapeHTML(saved.location)}</p></div>
                    <div class="item-tags">${tags}</div>
                    <div class="item-status"><p>${escapeHTML(saved.status)}</p></div>
                    <div class="view material-symbols-outlined">open_in_new</div>
                </div>
            </div>
            `;


        });
    });
    
    const inventory = document.querySelector('.inventory-list');
    
    // Delete item when clicking delete button
    document.addEventListener('click', (button) => {
        if (button.target.classList.contains('delete-btn')) {
            const deleteConfirmation = document.createElement('div');
            document.body.append(deleteConfirmation);

            deleteConfirmation.outerHTML =`
            <div class="delete-confirmation hidden">
                <div class="delete-confirmation-box">
                    <h3>Are you sure?</h3>
                    <p>This action cannot be undone!</p>
                    <div class="confirmation-container">
                        <div class="cancel">Cancel</div>
                        <div class="confirm">Confirm</div>
                    </div>
                </div>
            </div>
            `
            const confirmationBox = document.querySelector(".delete-confirmation")

            setTimeout(() => {
            // This code will execute after a given amount of seconds
            confirmationBox.classList.remove('hidden');
            }, 100);

            const cancel = document.querySelector(".cancel");
            cancel.addEventListener('click', (e) =>{
                confirmationBox.classList.add('hidden');
                setTimeout(() => {
                confirmationBox.remove();
                }, 200);
            });

            const confirm = document.querySelector(".confirm");
            confirm.addEventListener('click', async (e) => {
                const toBeRemoved = button.target.parentNode
                confirmationBox.classList.add('hidden');
                setTimeout(() => {
                confirmationBox.remove();
                }, 200);

                //DELETE THE ITEM
                try {
                    await removeItem(toBeRemoved.id);
                    toBeRemoved.remove();
                } catch (error) {
                    alert(error.message);
                }
            })
        }
    });
        
    loadOpenButtons();
}

function loadOpenButtons(){
    document.addEventListener("click", (e) => {
        const openBtn = e.target.closest(".view");
        if (!openBtn) return;
        if (openBtn.parentNode.classList.contains("new-item")) return;
    
        const itemWrapper = openBtn.closest(".item-wrapper");
        const itemID = itemWrapper.id;
    
        // Navigate with ID in URL
        window.open(`item.html?id=${encodeURIComponent(itemID)}`, "_blank");
    });
}

