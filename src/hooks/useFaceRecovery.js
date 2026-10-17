
import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export function useFaceRecovery() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Camera off");
  const [showRecovery, setShowRecovery] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const timerRef = useRef(null);

  const snoozedUntilRef = useRef(0);

function snoozeRecovery() {
  snoozedUntilRef.current = performance.now() + 5 * 60 * 1000;
  setStatus("🧠 Got it! We'll snooze for 5 minutes. Keep those ideas flowing!");
}

  const popupOpenRef = useRef(false);

  useEffect(() => {
    popupOpenRef.current = showRecovery;
  }, [showRecovery]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let distractedSince = null;
    let lastPopup = -Infinity;
    let readyForNextPopup = true;

    async function startCamera() {
      try {
        setError("");
        setStatus("Starting camera...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        videoRef.current = video;

        await video.play();

        if (cancelled) return;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        );

        if (cancelled) return;

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setStatus("Watching for focus changes");

        timerRef.current = window.setInterval(() => {
          if (video.readyState < 2) return;

          const now = performance.now();
          const result = landmarker.detectForVideo(video, now);
          const face = result.faceLandmarks?.[0];
          const blendshapes =
            result.faceBlendshapes?.[0]?.categories ?? [];

          let distracted = false;
          let reason = "Facing screen";

          if (!face) {
            distracted = true;
            reason = "Face not visible";
          } else {
            const scores = Object.fromEntries(
              blendshapes.map((item) => [
                item.categoryName,
                item.score,
              ])
            );

            const eyesClosed =
              (scores.eyeBlinkLeft ?? 0) > 0.55 &&
              (scores.eyeBlinkRight ?? 0) > 0.55;

            const nose = face[1];
            const leftEye = face[33];
            const rightEye = face[263];

            const eyeCenterX = (leftEye.x + rightEye.x) / 2;
            const eyeWidth = Math.abs(rightEye.x - leftEye.x);

            const headTurn =
              eyeWidth > 0.01
                ? Math.abs((nose.x - eyeCenterX) / eyeWidth)
                : 0;

            const forehead = face[10];
            const chin = face[152];

            const faceHeight = Math.abs(chin.y - forehead.y);
            const eyeCenterY = (leftEye.y + rightEye.y) / 2;

            const verticalPosition =
              faceHeight > 0.01
                ? (nose.y - eyeCenterY) / faceHeight
                : 0;

            const lookingUpOrDown =
              verticalPosition < 0.12 ||
              verticalPosition > 0.38;

            if (eyesClosed) {
              distracted = true;
              reason = "Eyes appear closed";
            } else if (headTurn > 0.32 || lookingUpOrDown) {
              distracted = true;
              reason = "Looking away from screen (estimate)";
            }
          }

          setStatus(reason);

          if (distracted) {
            if (distractedSince === null) {
              distractedSince = now;
            }

            const awayFor = now - distractedSince;

            if (
              awayFor >= 5000 &&
              readyForNextPopup &&
              !popupOpenRef.current &&
              now >= snoozedUntilRef.current &&
              now - lastPopup >= 30000
              ) {
              popupOpenRef.current = true;
              setShowRecovery(true);
              lastPopup = now;
              readyForNextPopup = false;
            }
          } else {
            distractedSince = null;
            readyForNextPopup = true;
          }
        }, 200);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to start camera");
          setEnabled(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
      videoRef.current = null;

      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [enabled]);

  return {
    enabled,
    setEnabled,
    status,
    showRecovery,
    setShowRecovery,
    snoozeRecovery,
    error,
  };
}
