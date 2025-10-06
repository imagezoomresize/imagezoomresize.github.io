// Prevent browser from opening the dropped file
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => e.preventDefault());

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const variationsDiv = document.getElementById('variations');
const originBtns = document.querySelectorAll('.origin-btn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let uploadedImage = null;

// Default anchor = center
let anchorX = 0.5;
let anchorY = 0.5;

// On page load, highlight the center button
const centerBtn = document.getElementById("center");
if (centerBtn) {
  centerBtn.classList.add("bg-blue-400");
}

// Button click handling
originBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // remove highlight from all buttons
    originBtns.forEach(b => b.classList.remove("bg-blue-400"));

    // add highlight to selected
    btn.classList.add("bg-blue-400");

    // update origin
    anchorX = parseFloat(btn.dataset.x);
    anchorY = parseFloat(btn.dataset.y);

    // re-generate variations if an image is loaded
    if (uploadedImage) {
      generateVariations(uploadedImage);
    }
  });
});


function addAspectVariation(label, targetW, targetH) {
  // --- Full resolution canvas for download ---
  const fullCanvas = document.createElement("canvas");
  const fullCtx = fullCanvas.getContext("2d");

  fullCanvas.width = targetW;
  fullCanvas.height = targetH;

  const imgRatio = uploadedImage.width / uploadedImage.height;
  const targetRatio = targetW / targetH;

  let drawW, drawH, offsetX, offsetY;

  if (imgRatio > targetRatio) {
    // Image is wider → fit height, crop sides
    drawH = targetH;
    drawW = uploadedImage.width * (targetH / uploadedImage.height);
    offsetX = (targetW - drawW) / 2;
    offsetY = 0;
  } else {
    // Image is taller → fit width, crop top/bottom
    drawW = targetW;
    drawH = uploadedImage.height * (targetW / uploadedImage.width);
    offsetX = 0;
    offsetY = (targetH - drawH) / 2;
  }

  // Enable best quality scaling
  fullCtx.imageSmoothingEnabled = true;
  fullCtx.imageSmoothingQuality = "high";

  fullCtx.drawImage(uploadedImage, offsetX, offsetY, drawW, drawH);

  // Full-quality PNG for download
  const fullResDataURL = fullCanvas.toDataURL("image/png");

  // --- Generate lightweight preview ---
  const previewCanvas = document.createElement("canvas");
  const previewCtx = previewCanvas.getContext("2d");
  previewCanvas.width = 300;   // thumbnail width
  previewCanvas.height = 300 * (targetH / targetW); // keep aspect

  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";

  previewCtx.drawImage(fullCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
  const previewDataURL = previewCanvas.toDataURL("image/png");

  // --- Build UI container ---
  const container = document.createElement("div");
  container.className = "flex flex-col items-center bg-white p-2 rounded shadow";

  const imgEl = document.createElement("img");
  imgEl.src = previewDataURL;
  imgEl.className = "max-w-full max-h-48 object-contain mb-2";

  const labelEl = document.createElement("p");
  labelEl.textContent = label;
  labelEl.className = "text-gray-600 text-sm mb-1";

  const dlBtn = document.createElement("a");
  dlBtn.href = fullResDataURL;
  dlBtn.download = `${label.toLowerCase()}.png`;
  dlBtn.className = "px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm";
  dlBtn.textContent = "Download";

  container.appendChild(dlBtn);
  container.appendChild(labelEl);
  container.appendChild(imgEl);
  variationsDiv.appendChild(container);
}


// --- Generate variations function ---
function generateVariations(img) {
  variationsDiv.innerHTML = `<p class="text-gray-500 text-sm">Processing...</p>`;

  setTimeout(() => {
    variationsDiv.innerHTML = ""; // clear message
    const zoomLevels = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]; 

    const files = []; // store {name, dataURL}

    // --- Zoom variations ---
    zoomLevels.forEach((zoom, i) => {
      const w = uploadedImage.width;
      const h = uploadedImage.height;
      canvas.width = w;
      canvas.height = h;

      const cropW = w / zoom;
      const cropH = h / zoom;
      const sx = (w - cropW) * anchorX;
      const sy = (h - cropH) * anchorY;

      ctx.drawImage(uploadedImage, sx, sy, cropW, cropH, 0, 0, w, h);

      const dataURL = canvas.toDataURL("image/png");
      const fileName = `variation-${i + 1}.png`;
      files.push({ name: fileName, dataURL });

      // Create preview + single download
      const container = document.createElement("div");
      container.className = "flex flex-col items-center bg-white p-2 rounded shadow";

      const imgEl = document.createElement("img");
      imgEl.src = dataURL;
      imgEl.className = "max-h-48 w-auto object-contain mb-2";

      const zoomLabel = document.createElement("p");
      zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
      zoomLabel.className = "text-gray-600 text-sm mb-1";

      const dlBtn = document.createElement("a");
      dlBtn.href = dataURL;
      dlBtn.download = fileName;
      dlBtn.className = "px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm";
      dlBtn.textContent = "Download";

      container.appendChild(dlBtn);
      container.appendChild(zoomLabel);
      container.appendChild(imgEl);
      variationsDiv.appendChild(container);
    });

    // --- Aspect ratio variations ---
    addAspectVariation("Portrait", 600, 1100, files);
    addAspectVariation("Square", 1000, 1000, files);
    addAspectVariation("Landscape", 1080, 590, files);

    // --- Add "Download All" button ---
    if (files.length) {
      const downloadWrapper = document.getElementById("downloadAllWrapper");
      downloadWrapper.innerHTML = ""; // clear old button

      const allBtn = document.createElement("button");
      allBtn.textContent = "Download All Variations (ZIP)";
      allBtn.className =
        "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700";

      allBtn.addEventListener("click", () => {
        const zip = new JSZip();
        files.forEach(f => {
          const base64Data = f.dataURL.split(",")[1];
          zip.file(f.name, base64Data, { base64: true });
        });
        zip.generateAsync({ type: "blob" }).then(content => {
          saveAs(content, "variations.zip");
        });
      });

      downloadWrapper.appendChild(allBtn);
    }}, 50);
}

// --- Handle drag and drop on dropzone ---
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("bg-gray-200");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("bg-gray-200");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("bg-gray-200");

  if (e.dataTransfer.files.length) {
    const file = e.dataTransfer.files[0];
    loadImage(file);
  }
});

// --- Handle dropzone click ---
dropzone.addEventListener('click', () => fileInput.click());

// --- Handle file input ---
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    const file = e.target.files[0];
    loadImage(file);
  }
});

// --- Helper to load image and trigger variations ---
function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      generateVariations(uploadedImage); // 👈 generate right away
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
