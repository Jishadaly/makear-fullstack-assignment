document.addEventListener('DOMContentLoaded', () => {
    const inputImage = document.querySelector('input[name="inputImage"]');
    const styleImage = document.querySelector('input[name="styleImage"]');
    const inputPreview = document.getElementById('inputPreview');
    const stylePreview = document.getElementById('stylePreview');

    const readAndPreview = (fileInput, previewImg) => {
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = e => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    };

    inputImage.addEventListener('change', () => readAndPreview(inputImage, inputPreview));
    styleImage.addEventListener('change', () => readAndPreview(styleImage, stylePreview));

    // Camera button
    const cameraBtn = document.getElementById('cameraInputBtn');
    cameraBtn.addEventListener('click', () => {
        inputImage.click();
    });
    // Modal logic
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.getElementsByClassName('close')[0];

    document.querySelectorAll('.previewBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = "block";
            modalImg.src = btn.dataset.src;
        });
    });

    closeBtn.onclick = () => {
        modal.style.display = "none";
    };

    window.onclick = e => {
        if (e.target === modal) modal.style.display = "none";
    };

});

