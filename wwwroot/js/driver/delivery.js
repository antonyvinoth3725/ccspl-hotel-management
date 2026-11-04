let signaturePad = null;

let parcelFile = null;

$(document).ready(function () {

    console.log("PAGE LOADED");
    initializeSignature();

    initializeCamera();

    getCurrentLocation();

});

function initializeSignature() {

    const canvas = document.getElementById("signaturePad");

    if (!canvas)
        return;

    resizeCanvas(canvas);

    signaturePad = new SignaturePad(canvas, {

        minWidth: 1,

        maxWidth: 2,

        penColor: "#000"

    });

    signaturePad.addEventListener("endStroke", updateCompletionButton);

    $("#btnClearSignature").on("click", function () {

        signaturePad.clear();
        updateCompletionButton();

    });

}

function resizeCanvas(canvas) {

    console.log("Canvas resized");

    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = canvas.offsetWidth * ratio;

    canvas.height = canvas.offsetHeight * ratio;

    canvas.getContext("2d").scale(ratio, ratio);

}

function initializeCamera() {

    const fileInput = document.getElementById("parcelPhoto");
    const openCameraBtn = document.getElementById("btnOpenCamera");
    const cameraBtnLabel = document.getElementById("btnOpenCameraLabel");

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent || ""
    );

    if (fileInput) {
        if (isMobileDevice) {            
            fileInput.setAttribute("capture", "environment");
        } else {            
            fileInput.removeAttribute("capture");
        }
    }

    if (cameraBtnLabel) {
        cameraBtnLabel.textContent = isMobileDevice ? "Open Camera" : "Upload Image";
    }

    if (openCameraBtn && fileInput) {
        openCameraBtn.addEventListener("click", function () {            
            fileInput.value = "";
            fileInput.click();
        });
    }

    $("#parcelPhoto").change(function () {

        if (!this.files || this.files.length === 0)
            return;

        parcelFile = this.files[0];       

        let reader = new FileReader();

        reader.onload = function (e) {

            $("#parcelPreview").attr("src", e.target.result);

        };

        reader.readAsDataURL(parcelFile);
        updateCompletionButton();

    });

}

function getCurrentLocation() {

    if (!navigator.geolocation) {

        $("#gpsStatus").html("GPS not supported.");

        return;

    }

    navigator.geolocation.getCurrentPosition(

        function (position) {

            $("#Latitude").val(position.coords.latitude);

            $("#Longitude").val(position.coords.longitude);

            $("#gpsStatus").html(

                "<span style='color:green;'>Location Captured ✓</span>"

            );

        },

        function () {

            $("#gpsStatus").html(

                "<span style='color:red;'>Unable to get GPS.</span>"

            );

            $("#Latitude").val("");
            $("#Longitude").val("");

        },

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0

        }

    );

}

function validateDelivery() {

    if (parcelFile == null) {

        alert("Please capture parcel photo.");

        return false;

    }

    if (signaturePad.isEmpty()) {

        alert("Please capture customer signature.");

        return false;

    }

    return true;

}

function updateCompletionButton() {

    const hasPhoto = parcelFile !== null;
    const hasSignature = signaturePad !== null && !signaturePad.isEmpty();
    const button = $("#btnCompleteDelivery");

    if (hasPhoto && hasSignature) {
        button.prop("disabled", false).text("Complete Delivery");
    } else if (hasPhoto) {
        button.prop("disabled", true).text("Add signature to finish");
    } else if (hasSignature) {
        button.prop("disabled", true).text("Add photo to finish");
    } else {
        button.prop("disabled", true).text("Add photo and signature to finish");
    }
}

$("#btnCompleteDelivery").click(function () {

    if (!validateDelivery())
        return;

    saveDelivery();

});

function saveDelivery() {

    showLoader();

    let signatureImage = signaturePad.toDataURL("image/png");

    let formData = new FormData();

    formData.append("LogisticsId", $("#LogisticsId").val());

    formData.append("DriverId", $("#DriverId").val());

    formData.append("Remarks", $("#Remarks").val());

    formData.append("Latitude", $("#Latitude").val() || "");

    formData.append("Longitude", $("#Longitude").val() || "");

    formData.append("CustomerSignature", signatureImage);

    formData.append("ParcelPhoto", parcelFile);

    $.ajax({

        url: "/DriverDelivery/CompleteDelivery",

        type: "POST",

        data: formData,

        processData: false,

        contentType: false,

        success: function (response) {

            hideLoader();

            if (response.success) {

                Swal.fire({

                    icon: "success",

                    title: "Success",

                    text: response.message,

                    confirmButtonColor: "#ff7b00"

                }).then(function () {

                    window.onbeforeunload = null;
                    window.location.href = "/DriverDelivery/Deliveries";

                });

            }
            else {

                Swal.fire({

                    icon: "error",

                    title: "Error",

                    text: response.message

                });

            }

        },

        error: function () {

            hideLoader();

            Swal.fire({

                icon: "error",

                title: "Oops",

                text: "Unable to connect to server."

            });

        }

    });

}

function showLoader() {

    $(".loader").removeClass("hidden");

}

function hideLoader() {

    $(".loader").addClass("hidden");

}

function dataURItoBlob(dataURI) {

    let byteString = atob(dataURI.split(',')[1]);

    let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    let ab = new ArrayBuffer(byteString.length);

    let ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {

        ia[i] = byteString.charCodeAt(i);

    }

    return new Blob([ab], { type: mimeString });

}

function loadExistingImage(path) {

    if (path == "")
        return;

    $("#parcelPreview").attr("src", path);

}

function disableButton() {

    $("#btnCompleteDelivery")

        .prop("disabled", true)

        .html("<i class='fa fa-spinner fa-spin'></i> Saving...");

}

function enableButton() {

    $("#btnCompleteDelivery")

        .prop("disabled", false)

        .html("<i class='fa-solid fa-circle-check'></i> Complete Delivery");

}

$("#btnCompleteDelivery").on("dblclick", function () {

    return false;

});

function refreshLocation() {

    getCurrentLocation();

}

window.onbeforeunload = function () {

    if (parcelFile != null || !signaturePad.isEmpty()) {

        return "Delivery is not completed. Are you sure?";

    }

};
