import { getCheckedCount, getItemCount } from "./db.js"

if (document.body.classList.contains("Home")){
    await LoadStatistics();
}

async function LoadStatistics(){
    const propsCount = document.getElementById("total-props")
    const checkedCount = document.getElementById("checked-out-props")
    propsCount.textContent = await getItemCount();
    checkedCount.textContent = await getCheckedCount();
}