
import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Looking away this long brings up the "Still with me?" popup.
const POPUP_AFTER_MS = 4000;
// How long you have to look back before the countdown starts over.
const REFOCUS_MS = 1000;

export function useFaceRecovery({ onDistracted, onReturn } = {}) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Camera off");
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const timerRef = useRef(null);
  const snoozedUntilRef = useRef(0);
  const popupOpenRef = useRef(false);
  const callbacksRef = useRef({ onDistracted, onReturn });
  callbacksRef.current = { onDistracted, onReturn };

  function snoozeRecovery() {
    snoozedUntilRef.current = performance.now() + 5 * 60 * 1000;
    setShowRecovery(false);
    setStatus("Snoozed for 5 minutes");
  }

  useEffect(() => {
    popupOpenRef.current = showRecovery;
  }, [showRecovery]);

  useEffect(() => {
    if (!enabled) {
      setShowRecovery(false);
      return;
    }

    let cancelled = false;
    let distractedSince = null;
    let focusedSince = null;
    let readyForNextPopup = true;
    let lastPopup = -Infinity;

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
          const blendshapes = result.faceBlendshapes?.[0]?.categories ?? [];

          let distracted = false;
          let reason = "Facing screen";

          if (!face) {
            distracted = true;
            reason = "Face not visible";
          } else {
            const scores = Object.fromEntries(
              blendshapes.map((item) => [item.categoryName, item.score])
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
              verticalPosition < 0.12 || verticalPosition > 0.38;

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
            focusedSince = null;
            if (distractedSince === null) distractedSince = now;

            if (
              now - distractedSince >= POPUP_AFTER_MS &&
              readyForNextPopup &&
              !popupOpenRef.current &&
              now >= snoozedUntilRef.current &&
              now - lastPopup >= 30000
            ) {
              popupOpenRef.current = true;
              setShowRecovery(true);
              lastPopup = now;
              readyForNextPopup = false;
              callbacksRef.current.onDistracted?.(reason);
            }
          } else {
            // One "facing screen" frame mid-glance shouldn't restart the
            // countdown; only a real look back (a full second) does.
            if (focusedSince === null) focusedSince = now;
            if (now - focusedSince >= REFOCUS_MS) {
              distractedSince = null;
              readyForNextPopup = true;
            }
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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [enabled]);

  return {
    enabled,
    setEnabled,
    status,
    error,
    showRecovery,
    setShowRecovery,
    snoozeRecovery,
  };
}
