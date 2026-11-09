const form = document.querySelector("form");
const input = document.querySelector("input");
const submitBtn = document.querySelector(".submit");

const audioPlayer = new Audio();
audioPlayer.preload = "auto";
let activeAudioUrl;

function waitForEvent(target, eventName, errorNames = []) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, onSuccess);
      errorNames.forEach((name) => target.removeEventListener(name, onError));
    };
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Unable to load the generated audio"));
    };

    target.addEventListener(eventName, onSuccess, { once: true });
    errorNames.forEach((name) => target.addEventListener(name, onError, { once: true }));
  });
}

function waitForAudioCanPlay() {
  if (audioPlayer.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }
  return waitForEvent(audioPlayer, "canplay", ["error"]);
}

function setAudioSource(url) {
  activeAudioUrl = url;
  audioPlayer.addEventListener(
    "ended",
    () => {
      URL.revokeObjectURL(url);
      if (activeAudioUrl === url) activeAudioUrl = undefined;
    },
    { once: true },
  );
  audioPlayer.src = url;
}

function appendAudioChunk(sourceBuffer, chunk) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener("updateend", onUpdateEnd);
      sourceBuffer.removeEventListener("error", onError);
    };
    const onUpdateEnd = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Unable to process the audio stream"));
    };

    sourceBuffer.addEventListener("updateend", onUpdateEnd, { once: true });
    sourceBuffer.addEventListener("error", onError, { once: true });
    sourceBuffer.appendBuffer(chunk);
  });
}

async function playAudioStream(response) {
  if (!("MediaSource" in window) || !MediaSource.isTypeSupported("audio/mpeg")) {
    const audioBlob = await response.blob();
    setAudioSource(URL.createObjectURL(audioBlob));
    await waitForAudioCanPlay();
    await audioPlayer.play();
    return;
  }

  const mediaSource = new MediaSource();
  setAudioSource(URL.createObjectURL(mediaSource));
  if (mediaSource.readyState !== "open") {
    await waitForEvent(mediaSource, "sourceopen", ["error"]);
  }

  const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
  const reader = response.body.getReader();
  let playbackStarted = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    await appendAudioChunk(sourceBuffer, value);
    if (!playbackStarted && audioPlayer.buffered.length > 0) {
      const bufferedSeconds = audioPlayer.buffered.end(0) - audioPlayer.currentTime;
      if (bufferedSeconds >= 0.3) {
        await audioPlayer.play();
        playbackStarted = true;
      }
    }
  }

  if (mediaSource.readyState === "open") {
    mediaSource.endOfStream();
  }
  if (!playbackStarted) {
    await waitForAudioCanPlay();
    await audioPlayer.play();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  if (!text) return;
  audioPlayer.pause();
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
    if (activeAudioUrl) {
      URL.revokeObjectURL(activeAudioUrl);
      activeAudioUrl = undefined;
    }
    submitBtn.textContent = "Loading audio...";
    await playAudioStream(response);
  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Listen";
  }
});
