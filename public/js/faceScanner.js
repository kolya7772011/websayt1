/**
 * Face Scanner Module
 * Loads face-api.js models and handles webcam face detection
 * Uses CDN-loaded face-api.js (loaded in index.html)
 */

const FaceScanner = (() => {
  let modelsLoaded = false;
  let stream = null;

  // face-api.js CDN URL
  const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

  // Models CDN path (hosted on jsdelivr)
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

  /**
   * Dynamically load face-api.js from CDN
   */
  const loadFaceApiScript = () => new Promise((resolve, reject) => {
    if (window.faceapi) return resolve();
    const script = document.createElement('script');
    script.src = FACE_API_CDN;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  /**
   * Load required face-api.js models
   * - tinyFaceDetector: fast face detection
   * - faceLandmark68Net: 68 face points
   * - faceRecognitionNet: 128-D face descriptor
   */
  const loadModels = async (onProgress) => {
    if (modelsLoaded) return;
    onProgress && onProgress('Face-api.js yuklanmoqda...');

    await loadFaceApiScript();
    onProgress && onProgress('Modellar yuklanmoqda (bir daqiqa)...');

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    modelsLoaded = true;
    onProgress && onProgress('Modellar tayyor ✓');
  };

  /**
   * Start webcam stream
   * @param {HTMLVideoElement} videoEl
   * @returns {MediaStream}
   */
  const startCamera = async (videoEl) => {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 }, 
        facingMode: 'user' 
      },
      audio: false
    });
    videoEl.srcObject = stream;
    await new Promise(res => { videoEl.onloadedmetadata = res });
    return stream;
  };

  /**
   * Stop webcam stream
   */
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  };

  /**
   * Detect single face and return descriptor
   * @param {HTMLVideoElement} videoEl
   * @param {HTMLCanvasElement} canvasEl
   * @returns {{ descriptor: Float32Array, imageDataUrl: string } | null}
   */
  const detectFace = async (videoEl, canvasEl) => {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

    const detection = await faceapi
      .detectSingleFace(videoEl, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    // Draw detection on canvas
    const dims = faceapi.matchDimensions(canvasEl, videoEl, true);
    faceapi.resizeResults(detection, dims);

    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Draw box
    const box = detection.detection.box;
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw landmarks
    faceapi.draw.drawFaceLandmarks(canvasEl, faceapi.resizeResults(detection, dims));

    // Capture face region as image
    const faceCanvas = document.createElement('canvas');
    const margin = 20;
    faceCanvas.width = box.width + margin * 2;
    faceCanvas.height = box.height + margin * 2;
    const fCtx = faceCanvas.getContext('2d');
    fCtx.drawImage(
      videoEl,
      box.x - margin, box.y - margin,
      box.width + margin * 2, box.height + margin * 2,
      0, 0, faceCanvas.width, faceCanvas.height
    );

    return {
      descriptor: Array.from(detection.descriptor), // Convert Float32Array to plain array for JSON
      imageDataUrl: faceCanvas.toDataURL('image/jpeg', 0.85),
      box: { x: box.x, y: box.y, width: box.width, height: box.height }
    };
  };

  /**
   * Live detection loop — draws boxes on canvas in real time
   */
  let liveLoopId = null;

  const startLiveDetection = (videoEl, canvasEl) => {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });

    const loop = async () => {
      if (!videoEl.srcObject) return;
      const detection = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks();
      const ctx = canvasEl.getContext('2d');
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      if (detection) {
        const dims = faceapi.matchDimensions(canvasEl, videoEl, true);
        const resized = faceapi.resizeResults(detection, dims);
        const box = resized.detection.box;

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#0ea5e9';
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.shadowBlur = 0;

        faceapi.draw.drawFaceLandmarks(canvasEl, resized);
      }

      liveLoopId = requestAnimationFrame(loop);
    };

    loop();
  };

  const stopLiveDetection = () => {
    if (liveLoopId) {
      cancelAnimationFrame(liveLoopId);
      liveLoopId = null;
    }
  };

  return { loadModels, startCamera, stopCamera, detectFace, startLiveDetection, stopLiveDetection, get isLoaded() { return modelsLoaded } };
})();
