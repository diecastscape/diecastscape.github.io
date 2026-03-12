function flip(){
document.getElementById("card").classList.toggle("flip");
}

function togglePass(id, icon){

const input = document.getElementById(id);

if(input.type === "password"){
input.type = "text";
icon.classList.add("active");
}
else{
input.type = "password";
icon.classList.remove("active");
}
}
