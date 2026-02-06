const toggle = document.getElementById("darkModeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  toggle.textContent = "Light";
}

toggle.onclick = () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  toggle.textContent = dark ? "Light" : "Dark";
  localStorage.setItem("theme", dark ? "dark" : "light");
};
