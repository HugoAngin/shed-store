import { clearTable, getQuery, renderItems } from "./db";

if (document.body.classList.contains("Catalogue")){
    loadSorting();
}

export let itemSortMode = 0;
function loadSorting(){
    const itemSortButton = document.getElementById("sort-name-btn");
    const searchInput = document.getElementById("search-bar");

    itemSortButton.addEventListener('click', async () => {
        let sorted = [];
        if (itemSortMode == 0 || itemSortMode == 2){
            itemSortMode = 1;
            itemSortButton.querySelector(".sort-icon").textContent = "arrow_upward";

            //Ascending order

            const queryText = searchInput.value.trim().toLowerCase();

            const querySnapshot = await getQuery(queryText);

            sorted = sortItems(querySnapshot, "asc");

        } else if (itemSortMode == 1) {
            itemSortMode = 2;
            itemSortButton.querySelector(".sort-icon").textContent = "arrow_downward";

            //Descending order

            const queryText = searchInput.value.trim().toLowerCase();

            const querySnapshot = await getQuery(queryText);

            sorted = sortItems(querySnapshot, "dsc");

        } else {
            console.log("An error has occured!");
        }

        clearTable();
        renderItems(sorted);

    })

}

//Direction parameter can be "asc" or "dsc"
export function sortItems(snapshot, direction){
    let sortDocs = [...snapshot]; //Copy the snapshot into another variable
    
    let sorted = false
    while (sorted == false){
        sorted = true;
        for (let i = 1; i < sortDocs.length; i++) {
            if (sortDocs[i-1].get("item-name") > sortDocs[i].get("item-name")){
                sorted = false;

                let temp = sortDocs[i-1];
                sortDocs[i-1] = sortDocs[i];
                sortDocs[i] = temp;
            }
        }
    }

    if (direction == "dsc") {
        let reversedDocs = [];
        for (let i = 0; i < sortDocs.length; i++){
            reversedDocs[i] = sortDocs[sortDocs.length-i-1];
        }
        sortDocs = sortDocs.reverse();
        console.log(reversedDocs);
        console.log(sortDocs);
        console.log(sortDocs.join(',') === reversedDocs.join(','));
    }

    return sortDocs;

}


