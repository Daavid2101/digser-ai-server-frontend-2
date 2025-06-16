import React, { useState, useRef } from "react";

const AudioRecorder = ({ API_URL }) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("audio/mp4")) {
      mimeType = "audio/mp4";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    } else {
      mimeType = "";
    }

    mediaRecorderRef.current = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, {
        type: mimeType || "audio/webm",
      });
      setAudioBlob(blob);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    try {
      const response = await fetch(`${API_URL}/files/upload_audio`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      console.log("Audio uploaded:", result);
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  };

  return (
    <div className="audio-recorder">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`record-button ${recording ? "recording" : ""}`}
      >
        {recording ? "🛑 Stop" : "🎤 Record"}
      </button>
      {audioBlob && (
        <div className="audio-preview">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <button onClick={sendAudio}>📤 Send</button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
