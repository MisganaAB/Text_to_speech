const form = document.querySelector("form");
const input = document.querySelector("input");
const submitBtn = document.querySelector(".submit");

const audioPlayer = new Audio();
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "Generating...";

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        errorMessage = JSON.parse(errorText).error;
      } catch {
        errorMessage = `Server returned ${response.status} (${response.statusText})`;
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    audioPlayer.src = data.audioUrl;
    await audioPlayer.play();
  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Listen";
    // input.value = "";
  }
});
