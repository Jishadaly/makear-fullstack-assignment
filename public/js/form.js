document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("faceSwapForm");
  const inputImage = form.querySelector('input[name="inputImage"]');
  const styleImage = form.querySelector('input[name="styleImage"]');
  const inputPreview = document.getElementById("inputPreview");
  const stylePreview = document.getElementById("stylePreview");
  const termsCheckbox = document.getElementById("termsCheckbox");

  const modal = document.getElementById("resultModal");
  const closeModal = document.getElementById("closeModal");
  const modalMessage = document.getElementById("modalMessage");
  const modalSwappedImg = document.getElementById("modalSwappedImg");
  const modalRecommendations = document.getElementById("modalRecommendations");
  const modalDownloadBtn = document.getElementById("modalDownloadBtn");

  // Image preview
  function readAndPreview(fileInput, previewImg) {
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        previewImg.src = e.target.result;
        previewImg.classList.remove("hidden");
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  }

  inputImage.addEventListener("change", () => readAndPreview(inputImage, inputPreview));
  styleImage.addEventListener("change", () => readAndPreview(styleImage, stylePreview));

  // Close modal
  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
    modalSwappedImg.src = "";
    modalMessage.textContent = "";
    modalRecommendations.textContent = "";
  });

  // Submit form via fetch
  form.addEventListener("submit", async e => {
    e.preventDefault();

    if (!termsCheckbox.checked) {
      Swal.fire("Error", "Please accept the Terms & Conditions", "error");
      return;
    }

    const formData = new FormData(form);

    try {
      Swal.fire({
        title: "Processing...",
        text: "Please wait while we swap the face 🤖",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await fetch("/submit", { method: "POST", body: formData });
      const data = await res.json();
      Swal.close();

      if (!res.ok || !data.success) {
        Swal.fire("Error", data.error || "Something went wrong!", "error");
        return;
      }

      // Reset form and previews
      form.reset();
      inputPreview.classList.add("hidden");
      stylePreview.classList.add("hidden");

      // Show result modal
      modal.classList.remove("hidden");
      modalMessage.textContent = data.message || "Face swap complete!";
      if (data.swappedImgURL) {
        modalSwappedImg.src = data.swappedImgURL;
        modalDownloadBtn.onclick = () => {
          const link = document.createElement("a");
          link.href = data.swappedImgURL;
          link.download = "swapped_image.jpg";
          document.body.appendChild(link);
          link.click();
          link.remove();
        };
      }
      if (data.recommendations?.length) {
        modalRecommendations.textContent = "⚠️ " + data.recommendations.join(", ");
      }
    } catch (err) {
      Swal.close();
      Swal.fire("Network Error", "Please try again later", "error");
      console.error(err);
    }
  });
});
