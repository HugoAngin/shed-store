if (document.body.classList.contains("Login")){
    loginLoad();
}

function loginLoad(){
    const searchParams = new URLSearchParams(document.location.search); //Gets all search parameters from the URL
    const paramId = searchParams.get("err"); //Finds the parameter named "err"
    if (paramId == "error"){
        alert("Incorrect username or password"); //Alerts user of incorrect credentials if the server returned an error.
    }
    if (paramId == "locked"){
        alert("Too many failed attempts. Please try again in 15 minutes.");
    }
    const redirect = searchParams.get('redirect') || '/admin-dashboard.html';
    document.getElementById('redirect-field').value = redirect;

}


