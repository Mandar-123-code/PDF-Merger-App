document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const mergeButton = document.getElementById('merge-button');
    const outputContainer = document.getElementById('output-container');

    let pdfFiles = []; // Array to store uploaded PDF files

    // Handle file input change
    fileInput.addEventListener('change', function (event) {
        const newFiles = Array.from(event.target.files).filter(file => file.type === 'application/pdf');
        if (newFiles.length === 0) {
            alert('Please upload valid PDF files.');
            return;
        }
        pdfFiles = [...pdfFiles, ...newFiles]; // Add new files to the existing array
        updateFileList(); // Update the file list in the UI
    });

    // Function to update the file list in the UI
    function updateFileList() {
        fileList.innerHTML = ''; // Clear the current list

        if (pdfFiles.length === 0) {
            fileList.innerHTML = '<li>No files selected</li>';
            return;
        }

        pdfFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';

            // Create file name span
            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>'; // Add trash icon

            // Add click handler for delete button
            deleteBtn.addEventListener('click', () => {
                pdfFiles.splice(index, 1); // Remove the file from the array
                updateFileList(); // Update the UI

                // Hide output container if no files are left
                if (pdfFiles.length === 0) {
                    outputContainer.style.display = 'none';
                }
            });

            // Append elements to the list item
            li.appendChild(fileName);
            li.appendChild(deleteBtn);
            fileList.appendChild(li);
        });
    }

    // Handle merge button click
    mergeButton.addEventListener('click', async function () {
        if (pdfFiles.length < 2) {
            alert('Please select at least two PDF files to merge.');
            return;
        }

        try {
            const mergedPdfBlob = await mergePDFs(pdfFiles);
            const url = URL.createObjectURL(mergedPdfBlob);

            // Show the download link
            outputContainer.style.display = 'block';
            outputContainer.innerHTML = `
                <p>PDFs merged successfully! Download your merged PDF:</p>
                <a id="output-link" href="${url}" class="button" download="merged.pdf">Download</a>
            `;
        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('An error occurred while merging the PDFs. Please try again.');
        }
    });

    // Function to merge PDF files
    async function mergePDFs(files) {
        const { PDFDocument } = window.PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const pdfBytes = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        return new Blob([mergedPdfBytes], { type: 'application/pdf' });
    }
});