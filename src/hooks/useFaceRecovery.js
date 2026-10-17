import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const NUDGE_AFTER_MS = 4000; // how long away before Sprout gives a quiet nudge
const RETURN_SETTLE_MS = 1000; // must be back facing the screen this long before the welcome-back moment fires
const RETURN_COOLDOWN_MS = 12000; // minimum gap between welcome-back moments

// Runs MediaPipe face landmark detection on the webcam feed, entirely in the
// browser — no frame ever leaves the device. Instead of its own UI (a modal,
// a status box), it reports what it notices through callbacks, so Sprout can
// be the one thing on screen that reacts: a quiet "hey, eyes back here" the
// moment focus drifts, and a "welcome back" once the student has actually
// settled back in.
export function useFaceRecovery({ onDistracted, onReturn } = {}) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Camera off");
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const timerRef = useRef(null);
  const callbacksRef = useRef({ onDistracted, onReturn });
  callbacksRef.current = { onDistracted, onReturn };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let distractedSince = null;
    let nudged = false;
    let returnSince = null;
    let awaitingWelcomeBack = false;
    let lastWelcomeBack = 0;

    async function startCamera() {
      try {
        setError("");
        setStatus("Starting camera...");

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
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
            const scores = Object.fromEntries(blendshapes.map((item) => [item.categoryName, item.score]));
            const eyesClosed = (scores.eyeBlinkLeft ?? 0) > 0.55 && (scores.eyeBlinkRight ?? 0) > 0.55;

            const nose = face[1];
            const leftEye = face[33];
            const rightEye = face[263];
            const eyeCenterX = (leftEye.x + rightEye.x) / 2;
            const eyeWidth = Math.abs(rightEye.x - leftEye.x);
            const headTurn = eyeWidth > 0.01 ? Math.abs((nose.x - eyeCenterX) / eyeWidth) : 0;

            const forehead = face[10];
            const chin = face[152];
            const faceHeight = Math.abs(chin.y - forehead.y);
            const eyeCenterY = (leftEye.y + rightEye.y) / 2;
            const verticalPosition = faceHeight > 0.01 ? (nose.y - eyeCenterY) / faceHeight : 0;
            const lookingUpOrDown = verticalPosition < 0.12 || verticalPosition > 0.38;

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
            returnSince = null;
            if (distractedSince === null) distractedSince = now;

            // Fire once per distraction episode, shortly after it starts.
            if (!nudged && now - distractedSince >= NUDGE_AFTER_MS) {
              nudged = true;
              awaitingWelcomeBack = true;
              callbacksRef.current.onDistracted?.(reason);
            }
          } else {
            distractedSince = null;
            nudged = false;

            if (awaitingWelcomeBack) {
              if (returnSince === null) returnSince = now;

              if (now - returnSince >= RETURN_SETTLE_MS && now - lastWelcomeBack >= RETURN_COOLDOWN_MS) {
                awaitingWelcomeBack = false;
                lastWelcomeBack = now;
                returnSince = null;
                callbacksRef.current.onReturn?.();
              }
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
      videoRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [enabled]);

  return { enabled, setEnabled, status, error };
}
