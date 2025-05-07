document.addEventListener("DOMContentLoaded", function () {
  // Elemen-elemen yang akan digunakan
  const fileInput = document.getElementById("fileInput");
  const convertButton = document.getElementById("convertButton");
  const imageOutput = document.getElementById("imageOutput");
  const textOutput = document.getElementById("textOutput");
  const loadingSection = document.getElementById("loadingSection");
  const downloadImageButton = document.getElementById("downloadImageButton");
  const copyTextButton = document.getElementById("copyTextButton");

  // Event listener untuk tombol konversi
  convertButton.addEventListener("click", function () {
    if (!fileInput.files.length) {
      alert("Silakan pilih file terlebih dahulu!");
      return;
    }

    const file = fileInput.files[0];
    const fileType = file.type;

    // Menampilkan loading
    loadingSection.classList.remove("hidden");

    // Reset output sebelumnya
    imageOutput.innerHTML = "";
    textOutput.innerHTML = "";
    downloadImageButton.classList.add("hidden");
    copyTextButton.classList.add("hidden");

    // Proses file berdasarkan jenisnya
    if (fileType === "application/pdf") {
      processPDF(file);
    } else if (fileType === "text/plain") {
      processTextFile(file);
    } else if (
      fileType.includes("word") ||
      file.name.endsWith(".doc") ||
      file.name.endsWith(".docx")
    ) {
      alert("Maaf, saat ini pemrosesan file Word masih dalam pengembangan.");
      loadingSection.classList.add("hidden");
    } else {
      alert("Format file tidak didukung. Silakan gunakan PDF atau file teks.");
      loadingSection.classList.add("hidden");
    }
  });

  // Fungsi untuk memproses file PDF
  function processPDF(file) {
    const fileReader = new FileReader();

    fileReader.onload = function () {
      const typedArray = new Uint8Array(this.result);

      // Menggunakan PDF.js untuk membaca PDF
      pdfjsLib
        .getDocument(typedArray)
        .promise.then(function (pdf) {
          // Ambil halaman pertama untuk gambar
          pdf.getPage(1).then(function (page) {
            // Dapatkan ukuran viewport asli
            const originalViewport = page.getViewport({ scale: 1.0 });

            // Hitung skala yang tepat untuk memastikan gambar responsive
            const containerWidth = imageOutput.clientWidth - 40; // Kurangi padding
            const scale = containerWidth / originalViewport.width;

            // Buat viewport baru dengan skala yang sesuai
            const viewport = page.getViewport({ scale: scale });

            // Buat canvas untuk rendering PDF
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF ke canvas
            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };

            page.render(renderContext).promise.then(function () {
              // Tampilkan gambar hasil rendering
              imageOutput.appendChild(canvas);
              downloadImageButton.classList.remove("hidden");

              // Setup tombol download
              downloadImageButton.onclick = function () {
                const image = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = image;
                link.download = "sertifikat.png";
                link.click();
              };
            });
          });

          // Ekstrak teks dari semua halaman
          let textPromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            textPromises.push(getPageText(pdf, i));
          }

          Promise.all(textPromises).then(function (texts) {
            const fullText = texts.join("\n\n--- Halaman Baru ---\n\n");
            displayText(fullText);
            loadingSection.classList.add("hidden");
          });
        })
        .catch(function (error) {
          console.error("Error loading PDF:", error);
          alert("Terjadi kesalahan saat memproses PDF.");
          loadingSection.classList.add("hidden");
        });
    };

    fileReader.readAsArrayBuffer(file);
  }

  // Fungsi untuk mengekstrak teks dari halaman PDF
  function getPageText(pdf, pageNumber) {
    return pdf.getPage(pageNumber).then(function (page) {
      return page.getTextContent().then(function (textContent) {
        return textContent.items
          .map(function (item) {
            return item.str;
          })
          .join(" ");
      });
    });
  }

  // Fungsi untuk memproses file teks
  function processTextFile(file) {
    const fileReader = new FileReader();

    fileReader.onload = function () {
      const text = this.result;
      displayText(text);

      // Untuk file teks, kita bisa membuat gambar teks sederhana
      createTextImage(text);

      loadingSection.classList.add("hidden");
    };

    fileReader.readAsText(file);
  }

  // Fungsi untuk menampilkan teks dengan struktur dipertahankan
  function displayText(text) {
    textOutput.textContent = text;
    copyTextButton.classList.remove("hidden");

    // Setup tombol copy
    copyTextButton.onclick = function () {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          alert("Teks berhasil disalin!");
        })
        .catch(function (err) {
          console.error("Tidak dapat menyalin teks:", err);
          alert("Gagal menyalin teks. Coba lagi.");
        });
    };
  }

  // Fungsi untuk membuat gambar dari teks (untuk file teks)
  function createTextImage(text) {
    // Batasi teks untuk preview gambar
    const previewText =
      text.length > 200 ? text.substring(0, 200) + "..." : text;

    // Buat canvas
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Ukuran canvas yang responsif
    const containerWidth = imageOutput.clientWidth - 40; // Kurangi padding
    canvas.width = containerWidth;
    canvas.height = Math.min(600, window.innerHeight * 0.6); // Batasi tinggi

    // Latar belakang
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Style teks
    context.fillStyle = "#333333";
    context.font = "16px monospace";

    // Mengukur dan memecah teks menjadi baris-baris
    const lineHeight = 24;
    const maxWidth = 760;
    const words = previewText.split(" ");
    let line = "";
    let y = 50;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth) {
        context.fillText(line, 20, y);
        line = words[i] + " ";
        y += lineHeight;

        // Batasi jumlah baris
        if (y > 550) {
          context.fillText("...", 20, y);
          break;
        }
      } else {
        line = testLine;
      }
    }

    context.fillText(line, 20, y);

    // Tambahkan watermark
    context.fillStyle = "#aaaaaa";
    context.font = "14px sans-serif";
    context.fillText("Preview Dokumen", canvas.width - 150, canvas.height - 20);

    // Tampilkan gambar
    imageOutput.appendChild(canvas);

    // Setup tombol download
    downloadImageButton.classList.remove("hidden");
    downloadImageButton.onclick = function () {
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "preview_dokumen.png";
      link.click();
    };
  }

  // Event listener untuk perubahan file input (opsional untuk preview nama file)
  fileInput.addEventListener("change", function () {
    if (this.files.length) {
      const fileName = this.files[0].name;
      // Bisa ditambahkan kode untuk menampilkan nama file yang dipilih
    }
  });

  // Fungsi untuk menangani perubahan ukuran window
  window.addEventListener("resize", function () {
    // Jika ada PDF yang sedang ditampilkan, kita perlu merender ulang
    if (
      fileInput.files.length &&
      fileInput.files[0].type === "application/pdf"
    ) {
      // Hanya jika ada file PDF yang telah dipilih
      const canvas = imageOutput.querySelector("canvas");
      if (canvas) {
        // Ada canvas yang ditampilkan, berarti PDF telah dirender
        // Kita bisa memanggil kembali processPDF
        processPDF(fileInput.files[0]);
      }
    }
  });
});
