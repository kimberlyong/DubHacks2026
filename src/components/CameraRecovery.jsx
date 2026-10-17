import { useFaceRecovery } from "../hooks/useFaceRecovery";

export default function CameraRecovery() {
  const {
    enabled,
    setEnabled,
    status,
    showRecovery,
    setShowRecovery,
    error,
  } = useFaceRecovery();

  return (
    <section className="my-6 border border-black p-5 dark:border-white">
      <h2 className="text-xl font-semibold">Focus recovery</h2>

      <p className="my-3 text-sm">
        Optional camera check-ins to help you return to studying.
        Your camera footage is processed locally and is not uploaded.
      </p>

      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        className="border border-black px-4 py-2 dark:border-white"
      >
        {enabled ? "Turn off camera" : "Enable camera"}
      </button>

      <p className="mt-3 text-sm" aria-live="polite">
        Status: {enabled ? status : "Camera off"}
      </p>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {showRecovery && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-black shadow-xl">
            <h3 id="recovery-title" className="text-xl font-semibold">
              Welcome back!
            </h3>

            <p className="my-4">
              Ready to pick up where you left off?
            </p>

            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              className="rounded bg-black px-4 py-2 text-white"
            >
              Continue studying
            </button>
          </div>
        </div>
      )}
    </section>
  );
}