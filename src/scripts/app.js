document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("file-input");
  const fileList = document.getElementById("file-list");
  const mergeButton = document.getElementById("merge-button");
  const outputContainer = document.getElementById("output-container");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const clearHistoryBtn = document.getElementById("clear-history");
  const uploadingText = document.getElementById("uploading-text");

  let pdfFiles = [];
  let historyOnly = false;

  const storedHistory = localStorage.getItem("pdfHistory");
  const hadPreviousHistory =
    storedHistory && JSON.parse(storedHistory).length > 0;

  if (hadPreviousHistory) {
    try {
      const names = JSON.parse(storedHistory);
      names.forEach((name) => {
        const li = document.createElement("li");
        li.className = "file-item";
        li.innerHTML = `<span class="file-name">${name}</span><span style="color: gray;"> (previously uploaded — reupload to merge)</span>`;
        fileList.appendChild(li);
      });

      if (pdfFiles.length === 0) {
        clearHistoryBtn.style.display = "inline-block";
      } else {
        clearHistoryBtn.style.display = "none";
      }

      historyOnly = true;
    } catch (e) {
      console.error("Failed to load history from localStorage");
      clearHistoryBtn.style.display = "none";
    }
  } else {
    clearHistoryBtn.style.display = "none";
  }

  fileInput.addEventListener("change", function (event) {
    const newFiles = Array.from(event.target.files).filter(
      (file) => file.type === "application/pdf"
    );
    if (newFiles.length === 0) {
      alert("Please upload valid PDF files.");
      return;
    }

    // ✅ Show "Uploading..." text
    uploadingText.style.display = "block";

    setTimeout(() => {
      pdfFiles = [...pdfFiles, ...newFiles];
      saveHistory();
      updateFileList();
      clearHistoryBtn.style.display = "none";
      historyOnly = false;
      mergeButton.style.display = "inline-block";

      // ✅ Hide "Uploading..." text
      uploadingText.style.display = "none";
    }, 700);
  });

  function saveHistory() {
    const names = pdfFiles.map((f) => f.name);
    localStorage.setItem("pdfHistory", JSON.stringify(names));
  }

  function updateFileList() {
    fileList.innerHTML = "";

    if (pdfFiles.length === 0) {
      fileList.innerHTML = "<li>No files selected</li>";
      return;
    }

    pdfFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = "file-item";
      li.setAttribute("draggable", true);
      li.dataset.index = index;

      const fileName = document.createElement("span");
      fileName.className = "file-name";
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      fileName.textContent = `${file.name} (${fileSizeMB} MB)`;

      const fileURL = URL.createObjectURL(file);
      fileName.addEventListener("click", () => {
        window.open(fileURL, "_blank");
      });

      const editInput = document.createElement("input");
      editInput.type = "file";
      editInput.accept = ".pdf";
      editInput.style.display = "none";
      editInput.addEventListener("change", (e) => {
        const newFile = e.target.files[0];
        if (newFile && newFile.type === "application/pdf") {
          pdfFiles[index] = newFile;
          saveHistory();
          updateFileList();
        } else {
          alert("Please select a valid PDF file.");
        }
      });

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.innerHTML = '<i class="fas fa-pen"></i>';
      editBtn.addEventListener("click", () => {
        editInput.click();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.addEventListener("click", () => {
        pdfFiles.splice(index, 1);
        saveHistory();
        updateFileList();
        if (pdfFiles.length === 0) {
          outputContainer.style.display = "none";
          mergeButton.style.display = "none";
        }
      });

      li.appendChild(fileName);
      li.appendChild(editInput);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);

      // Drag and drop events
      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", index);
        li.classList.add("dragging");
      });

      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        li.classList.add("drag-over");
      });

      li.addEventListener("dragleave", () => {
        li.classList.remove("drag-over");
      });

      li.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        const toIndex = index;

        const movedFile = pdfFiles.splice(fromIndex, 1)[0];
        pdfFiles.splice(toIndex, 0, movedFile);
        saveHistory();
        updateFileList();
      });

      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
      });

      fileList.appendChild(li);
    });
  }

  mergeButton.addEventListener("click", async function () {
    if (historyOnly || pdfFiles.length < 2) {
      alert(
        "Please select at least two real PDF files to merge. Previously listed files are for reference only."
      );
      return;
    }

    try {
      const mergedPdfBlob = await mergePDFs(pdfFiles);
      const url = URL.createObjectURL(mergedPdfBlob);

      outputContainer.style.display = "block";
      outputContainer.innerHTML = `
        <p>PDFs merged successfully! Download your merged PDF:</p>
        <a id="output-link" href="${url}" class="button" download="merged.pdf">Download</a>
      `;
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("An error occurred while merging the PDFs. Please try again.");
    }
  });

  async function mergePDFs(files) {
    const { PDFDocument } = window.PDFLib;
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const pdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices()
      );
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    return new Blob([mergedPdfBytes], { type: "application/pdf" });
  }

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeIcon.classList.replace("fa-moon", "fa-sun");
  }

  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeIcon.classList.toggle("fa-sun", isDark);
    themeIcon.classList.toggle("fa-moon", !isDark);
  });

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      const confirmClear = confirm(
        "Are you sure you want to clear all uploaded PDF history?"
      );
      if (!confirmClear) return;

      localStorage.removeItem("pdfHistory");
      pdfFiles = [];
      outputContainer.style.display = "none";
      historyOnly = false;
      mergeButton.style.display = "none";

      const items = fileList.querySelectorAll("li");
      items.forEach((item, i) => {
        setTimeout(() => {
          item.style.transition = "opacity 0.3s ease";
          item.style.opacity = "0";
          setTimeout(() => item.remove(), 300);
        }, i * 50);
      });

      setTimeout(() => {
        fileList.innerHTML = '<li class="no-files">No files selected</li>';
        clearHistoryBtn.style.display = "none";
      }, fileList.children.length * 60 + 300);
    });
  }
});
