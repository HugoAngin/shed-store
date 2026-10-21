if (document.body.classList.contains("Map")){
    loadMap();
}

if (document.body.classList.contains("MapView")){
    loadMapView();
}


function loadMap() {
    const searchParams = new URLSearchParams(document.location.search);
    const paramLocation = searchParams.get("location");
    const paramSize = searchParams.get("size");
    const shelfLetter = paramLocation.charAt(0);
    const shelfNumber = paramLocation.charAt(1);
    const selectedShelf = document.getElementById(shelfLetter);
    const container = document.querySelector(".container");
    const pageTitle = document.querySelector("h1");

    if (paramSize == "small"){
        container.classList.add("vertical");
        pageTitle.classList.add("big-title")
    }
    
    selectedShelf.classList.add("selected");
    console.log(paramLocation);

    const shelfView = document.querySelector(".shelf-view");
    const shelfTitle = document.querySelector(".shelf-title");

    shelfTitle.textContent = "Shelf " + shelfLetter;

    if (shelfLetter == "J"){
        shelfView.classList.add("large-shelf");
        generateShelf(shelfLetter, shelfNumber, 9); //Generate a large shelf with 9 slots
    } else if (shelfLetter == "I"){
        shelfView.classList.add("medium-shelf");
        generateShelf(shelfLetter, shelfNumber, 6); //Generate a medium shelf with 6 slots
    }
    else {
        shelfView.classList.add("small-shelf");
        generateShelf(shelfLetter, shelfNumber, 6) //Generate a small shelf with 6 slots
    }

}

function generateShelf(letter, selectedSlot, slots){
    const shelfView = document.querySelector(".shelf-view"); //Fetch the shelf element from the front-end
    shelfView.innerHTML = ""; //Clear the shelf if there was any existing data inside it

    for (let i = 0; i < slots; i++){
        let slot = document.createElement('div'); //Create a new DIV element for each slot in the grid
        slot.classList.add("slot");
        if ((i+1) == selectedSlot){
            slot.classList.add("selected"); //Adds a red background on the specified slot (ex. A2)
        }
        slot.textContent = letter + (i+1).toString(); //Adds text to each slot specifying their ID
        slot.id = letter + (i+1).toString();
        shelfView.appendChild(slot); //Add the slot to the orignial shelf element
    }

}

function loadMapView(){
    selectShelf();

    document.addEventListener('click', e => {
        if (e.target.classList.contains("top-rect")){
            console.log("clicked");
            const selectedShelf = document.querySelector(".selected");
            selectedShelf.classList.remove("selected");
            e.target.classList.add("selected");
            selectShelf();
        } else if (e.target.classList.contains("slot")){
            console.log(e.target.id);

            window.location.href = `/catalogue.html?search=${encodeURIComponent(e.target.id)}`;

        }
    })

    loadToolTips();

}

export function verifyShelf(location){
    const shelfLetter = location.charAt(0);
    const shelfNumber = location.charAt(1);

    const validLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

    if(location.length != 2){
        return false;
    }

    if (validLetters.includes(shelfLetter)){
        if (shelfLetter == "J"){
            if (parseInt(shelfNumber) <= 9 && parseInt(shelfNumber) > 0){
                return true;
            } else {
                return false;
            }
        } else {
            if (parseInt(shelfNumber) <= 6 && parseInt(shelfNumber) > 0){
                return true;
            } else {
                return false;
            }
        }
    } else {
        return false;
    }
}

function selectShelf(){
    const selectedShelf = document.querySelector(".selected");
    const shelfLetter = selectedShelf.id;
    console.log(shelfLetter);
    const shelfTitle = document.querySelector(".shelf-title");
    const shelfView = document.querySelector(".shelf-view");
    shelfView.classList.add("hidden");
    shelfTitle.classList.add("hidden");
    setTimeout(() => {
        if (shelfLetter == "J"){
            shelfView.classList.remove("small-shelf");
            shelfView.classList.remove("medium-shelf");
            shelfView.classList.add("shelf-view");
            shelfView.classList.add("large-shelf");
            generateShelf(shelfLetter, 0, 9); //Generate a large shelf with 9 slots
        } else if (shelfLetter == "I"){
            shelfView.classList.remove("small-shelf");
            shelfView.classList.remove("large-shelf");
            shelfView.classList.add("shelf-view");
            shelfView.classList.add("medium-shelf");
            generateShelf(shelfLetter, 0, 6); //Generate a medium shelf with 6 slots
        }
        else {
            shelfView.classList.remove("large-shelf");
            shelfView.classList.remove("medium-shelf");
            shelfView.classList.add("shelf-view");
            shelfView.classList.add("small-shelf");
            generateShelf(shelfLetter, 0, 6) //Generate a small shelf with 6 slots
        }
        
        shelfTitle.textContent = "Shelf " + shelfLetter;
    }, 200);

    setTimeout(() => {
        shelfView.classList.remove("hidden");
        shelfTitle.classList.remove("hidden");
    }, 300);
}

function loadToolTips(){
    window.onmousemove = function(e) {

        if (e.target.classList.contains("top-rect") || e.target.classList.contains("slot")){
            let text = this.document.querySelector(".shelf-tooltip")
            if (e.target.classList.contains("top-rect")){
                text.textContent = "Click to View Shelf"
            } else {
                text.textContent = "View Items in Location"
            }
            if (!text.classList.contains('active')) {
                text.classList.add('active');
            } else {
                var tipDist = 18;
                //	Set new tooltip location
                text.style.top = (e.clientY + tipDist) + 'px'; 
                text.style.left = (e.clientX) + 'px';
            }

        } else {
            let text = this.document.querySelector(".shelf-tooltip")
            if (text.classList.contains('active')) {
                text.classList.remove('active');
            }
        }

    }
}